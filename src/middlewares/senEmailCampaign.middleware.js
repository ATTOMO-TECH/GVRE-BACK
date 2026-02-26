const nodemailer = require("nodemailer"); // email sender function
const AWS = require("aws-sdk");

const SES_CONFIG = {
  accessKeyId: process.env.SES_ACCESS_KEY,
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  region: process.env.SES_REGION,
};

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

  const transporter = nodemailer.createTransport({
    SES: new AWS.SES(SES_CONFIG),
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

      // 💥 LA MAGIA OCURRE AQUÍ: REEMPLAZAMOS ETIQUETAS DINÁMICAS 💥
      // Reemplazamos tags que el usuario haya escrito en el Drag&Drop
      let personalizedHtml = htmlBody
        .replace(/{{nombreContacto}}/g, contact.fullName || "")
        .replace(/{{linkBaja}}/g, unsubscribeLink)
        .replace(/{{nombreConsultor}}/g, consultant.fullName || "")
        .replace(
          /{{telefonoConsultor}}/g,
          consultant.consultantMobileNumber || "",
        );

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
