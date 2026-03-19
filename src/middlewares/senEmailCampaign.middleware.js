const nodemailer = require("nodemailer"); // email sender function
// --- 1. IMPORTACIONES DE AWS SES v3 ---
const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");

// --- 2. CONFIGURACIÓN DEL CLIENTE SES v3 ---
const sesClient = new SESClient({
  region: process.env.SES_REGION,
  credentials: {
    accessKeyId: process.env.SES_ACCESS_KEY,
    secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  },
});

const sendEmailCampaignToContacts = async (req, res, next) => {
  const {
    contacts,
    consultant,
    subject,
    messageGoodbyeP1,
    messageGoodbyeP2,
    messageP1,
    messageP2,
    messageP3,
    campaign,
    htmlBody,
  } = req.body;

  const {
    fullName,
    consultantEmail,
    consultantName,
    consultantSurname,
    profession,
    position,
    consultantPhoneNumber,
    consultantMobileNumber,
    consultantToken,
  } = consultant;

  let counter = 1;

  // --- 3. NUEVO TRANSPORTE SES PARA NODEMAILER v3 ---
  const transporter = nodemailer.createTransport({
    SES: {
      ses: sesClient,
      aws: { SendRawEmailCommand },
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const sendMailWithDelay = (mailOptions, delay) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(
              `Error sending email to ${mailOptions.to}:`,
              error.message,
            );
            reject(error); // Rechaza la promesa si hay error
          } else {
            console.log(`Correo ${counter++} enviado a ${mailOptions.to}`);
            resolve(info); // Resuelve la promesa si hay éxito
          }
        });
      }, delay);
    });
  };
  const sendEmails = async () => {
    const results = [];

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];
      const unsubscribeLink = `${process.env.BACKEND_URL}/mails/unsubscribe/${contact._id}`;

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
        console.log(
          "El HTML tiene </body>, insertando footer antes de cerrar body.",
        );
        personalizedHtml = personalizedHtml.replace(
          "</body>",
          `${unsubscribeFooter}\n</body>`,
        );
      } else {
        console.log(
          "El HTML no tiene </body>, añadiendo footer al final del contenido.",
        );
        personalizedHtml += unsubscribeFooter;
      }

      const mailOptions = {
        from: `<${consultantEmail}>`,
        to: contact.email,
        subject: subject,
        // Insertamos el HTML personalizado para ESTE contacto
        html: personalizedHtml,
      };

      try {
        const info = await sendMailWithDelay(mailOptions, 100);
        results.push({
          status: "fulfilled",
          to: contact.email,
          info: info.messageId,
        });
      } catch (error) {
        results.push({
          status: "rejected",
          to: contact.email,
          error: error.message,
        });
      }
    }
    return results;
  };

  try {
    const emailResults = await sendEmails();
    req.sendMail = "ok";
    req.body.emailResults = emailResults;

    next();
  } catch (error) {
    res.status(500).json({ message: "Error 1 en el servidor." });
  }
};

module.exports = { sendEmailCampaignToContacts };
