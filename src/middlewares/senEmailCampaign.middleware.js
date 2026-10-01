const nodemailer = require("nodemailer"); // email sender function
const mongoose = require("mongoose");
// --- 1. IMPORTACIONES DE AWS SES v3 ---
const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");
const Contact = require("../models/contact.model");
const MarketingCampaign = require("../models/marketingCampaing.model");
const CampaignSend = require("../models/campaignSend.model");

// --- 2. CONFIGURACIÓN DEL CLIENTE SES v3 ---
const sesClient = new SESClient({
  region: process.env.SES_REGION,
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY,
    secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  },
});

const SEND_DELAY_MS = 100;
const SEND_TIMEOUT_MS = 30 * 1000;
// Cada cuántos correos se guarda el progreso en base de datos
const FLUSH_EVERY = 25;
const MAX_STORED_FAILURES = 500;
// Un envío interrumpido solo se reanuda si se relanza dentro de este plazo
const RESUME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

// Campañas cuyo envío se está preparando en este proceso (evita el doble clic)
const startingCampaigns = new Set();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Contactos que ya recibieron la campaña en el envío interrumpido (y en los
// envíos que este, a su vez, reanudaba)
const getAlreadySentIds = async (interruptedSend) => {
  const ids = new Set();
  let current = interruptedSend;

  while (current) {
    current.sentContacts.forEach((id) => ids.add(id.toString()));
    current = current.resumedFrom
      ? await CampaignSend.findById(current.resumedFrom).select(
          "sentContacts resumedFrom",
        )
      : null;
  }

  return ids;
};

// Decide a qué contactos se envía realmente: fuera los que no aceptan
// comunicaciones, los emails no válidos, los repetidos y los que ya lo
// recibieron en un envío interrumpido.
const buildRecipients = (requestedIds, dbContacts, alreadySentIds) => {
  const skipped = {
    notFound: requestedIds.length - dbContacts.length,
    optedOut: 0,
    invalidEmail: 0,
    duplicated: 0,
    alreadySent: 0,
  };
  const recipients = [];
  const seenEmails = new Set();
  const normalize = (email) => (email || "").trim();

  // Un mismo email puede estar en varios contactos: si uno ya lo recibió,
  // el resto cuenta como duplicado
  dbContacts.forEach((contact) => {
    if (alreadySentIds.has(contact._id.toString())) {
      seenEmails.add(normalize(contact.email).toLowerCase());
    }
  });

  dbContacts.forEach((contact) => {
    const email = normalize(contact.email);
    const emailKey = email.toLowerCase();

    if (contact.notReceiveCommunications === true) {
      skipped.optedOut++;
    } else if (alreadySentIds.has(contact._id.toString())) {
      skipped.alreadySent++;
    } else if (!EMAIL_REGEX.test(email)) {
      skipped.invalidEmail++;
    } else if (seenEmails.has(emailKey)) {
      skipped.duplicated++;
    } else {
      seenEmails.add(emailKey);
      recipients.push({ _id: contact._id, email });
    }
  });

  return { recipients, skipped };
};

const buildMailOptions = (recipient, { from, subject, htmlBody }) => {
  const unsubscribeLink = `${process.env.BACKEND_URL}/mails/unsubscribe/${recipient._id}`;

  let personalizedHtml = htmlBody;

  const unsubscribeFooter = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 30px 20px; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
              Has recibido este correo porque estás suscrito a las comunicaciones de GV Real Estate.<br>
              Si no deseas seguir recibiendo esta información, puedes <a href="${unsubscribeLink}" style="color: #666666; text-decoration: underline;">darte de baja de nuestra lista de forma segura aquí</a>.
            </td>
          </tr>
        </table>
      `;

  // Inyectamos el footer con el unsubscribe link en el HTML de la campaña
  if (personalizedHtml.includes("</body>")) {
    personalizedHtml = personalizedHtml.replace(
      "</body>",
      `${unsubscribeFooter}\n</body>`,
    );
  } else {
    personalizedHtml += unsubscribeFooter;
  }

  return {
    from,
    to: recipient.email,
    subject,
    // Insertamos el HTML personalizado para ESTE contacto
    html: personalizedHtml,
    headers: {
      "List-Unsubscribe": `<${unsubscribeLink}>`,
      "X-Mailer": "GVRE-CRM",
    },
  };
};

const sendMailWithDelay = (transporter, mailOptions) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const timeout = setTimeout(
        () => reject(new Error("Tiempo de espera agotado al enviar el correo")),
        SEND_TIMEOUT_MS,
      );

      transporter.sendMail(mailOptions, (error, info) => {
        clearTimeout(timeout);
        if (error) {
          reject(error); // Rechaza la promesa si hay error
        } else {
          resolve(info); // Resuelve la promesa si hay éxito
        }
      });
    }, SEND_DELAY_MS);
  });
};

// Envía la campaña en segundo plano y va guardando el progreso, de forma que
// solo quedan como receptores los contactos a los que SES aceptó el correo.
const runCampaignSend = async (campaignSend, recipients, mail) => {
  // --- 3. NUEVO TRANSPORTE SES PARA NODEMAILER v3 ---
  const transporter = nodemailer.createTransport({
    SES: {
      ses: sesClient,
      aws: { SendRawEmailCommand },
    },
  });

  let sentIds = [];
  let failures = [];

  // Devuelve false si el envío ya no está "processing" (otro lo ha relevado)
  const flush = async () => {
    if (sentIds.length === 0 && failures.length === 0) return true;

    // Los $addToSet van primero porque se pueden repetir sin efecto si hay
    // que reintentar; los contadores se actualizan una sola vez, al final.
    if (sentIds.length > 0) {
      await MarketingCampaign.updateOne(
        { _id: campaignSend.campaign },
        { $addToSet: { contactList: { $each: sentIds } } },
      );
      await Contact.updateMany(
        { _id: { $in: sentIds } },
        { $addToSet: { marketingCampaings: campaignSend.campaign } },
      );
    }

    const result = await CampaignSend.updateOne(
      { _id: campaignSend._id, status: "processing" },
      {
        $set: { lastActivityAt: new Date() },
        $inc: { sent: sentIds.length, failed: failures.length },
        $push: {
          sentContacts: { $each: sentIds },
          failures: { $each: failures, $slice: -MAX_STORED_FAILURES },
        },
      },
    );

    sentIds = [];
    failures = [];

    return result.matchedCount > 0;
  };

  for (let index = 0; index < recipients.length; index++) {
    const recipient = recipients[index];

    try {
      await sendMailWithDelay(transporter, buildMailOptions(recipient, mail));
      sentIds.push(recipient._id);
    } catch (error) {
      console.error(`Error sending email to ${recipient.email}:`, error.message);
      failures.push({
        contact: recipient._id,
        email: recipient.email,
        error: error.message,
      });
    }

    if ((index + 1) % FLUSH_EVERY === 0) {
      try {
        const stillProcessing = await flush();
        if (!stillProcessing) return;
        console.log(
          `Campaña ${campaignSend.campaign}: ${index + 1}/${recipients.length} procesados`,
        );
      } catch (error) {
        // Se conserva lo pendiente y se reintenta en el siguiente guardado
        console.error("Error guardando el progreso del envío:", error.message);
      }
    }
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const stillProcessing = await flush();
      if (!stillProcessing) return;

      await CampaignSend.updateOne(
        { _id: campaignSend._id, status: "processing" },
        { $set: { status: "completed", finishedAt: new Date() } },
      );
      console.log(`Campaña ${campaignSend.campaign}: envío finalizado`);
      return;
    } catch (error) {
      console.error("Error cerrando el envío de la campaña:", error.message);
      await wait(2000);
    }
  }
};

const sendEmailCampaignToContacts = async (req, res, next) => {
  const { contacts, consultant, subject, campaign, htmlBody } = req.body;
  const campaignId = campaign?._id?.toString();

  if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
    return res.status(400).json({ message: "Campaña no válida." });
  }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res
      .status(400)
      .json({ message: "No se ha seleccionado ningún contacto." });
  }

  if (startingCampaigns.has(campaignId)) {
    return res
      .status(409)
      .json({ message: "Ya se está iniciando un envío de esta campaña." });
  }
  startingCampaigns.add(campaignId);

  try {
    const marketingCampaign =
      await MarketingCampaign.findById(campaignId).select("htmlBody");

    if (marketingCampaign === null) {
      return res.status(404).json({ message: "Campaña no encontrada." });
    }

    const html = htmlBody || marketingCampaign.htmlBody;

    if (!html) {
      return res
        .status(400)
        .json({ message: "El diseño de la campaña está vacío." });
    }

    // --- Envío anterior de esta campaña: en curso o interrumpido ---
    const lastSend = await CampaignSend.findOne({ campaign: campaignId }).sort({
      createdAt: -1,
    });
    let alreadySentIds = new Set();
    let resumedFrom;

    if (lastSend !== null && lastSend.status === "processing") {
      if (!lastSend.isStalled()) {
        return res.status(409).json({
          message: "Ya hay un envío en curso de esta campaña.",
          send: lastSend.toSummary(),
        });
      }

      await CampaignSend.updateOne(
        { _id: lastSend._id, status: "processing" },
        { $set: { status: "interrupted" } },
      );
      lastSend.status = "interrupted";
    }

    if (
      lastSend !== null &&
      lastSend.status === "interrupted" &&
      Date.now() - lastSend.createdAt.getTime() < RESUME_WINDOW_MS
    ) {
      alreadySentIds = await getAlreadySentIds(lastSend);
      resumedFrom = lastSend._id;
    }

    // --- Los datos del contacto se leen de la base de datos, no del body ---
    const requestedIds = [
      ...new Set(
        contacts
          .map((contact) => (contact?._id || contact)?.toString())
          .filter((id) => mongoose.Types.ObjectId.isValid(id)),
      ),
    ];

    const dbContacts = await Contact.find({ _id: { $in: requestedIds } })
      .select("email notReceiveCommunications")
      .lean();

    const { recipients, skipped } = buildRecipients(
      requestedIds,
      dbContacts,
      alreadySentIds,
    );

    if (recipients.length === 0) {
      return res.status(400).json({
        message:
          "Ninguno de los contactos seleccionados puede recibir la campaña.",
        skipped,
      });
    }

    const campaignSend = await CampaignSend.create({
      campaign: campaignId,
      consultant: consultant._id,
      consultantEmail: consultant.consultantEmail,
      subject,
      total: recipients.length,
      skipped,
      resumedFrom,
      lastActivityAt: new Date(),
    });

    res.status(202).json({ send: campaignSend.toSummary() });

    runCampaignSend(campaignSend, recipients, {
      from: `<${consultant.consultantEmail}>`,
      subject,
      htmlBody: html,
    }).catch((error) =>
      console.error("Error en el envío de la campaña:", error),
    );
  } catch (error) {
    return next(error);
  } finally {
    startingCampaigns.delete(campaignId);
  }
};

module.exports = { sendEmailCampaignToContacts };
