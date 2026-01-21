const nodemailer = require("nodemailer"); // email sender function
const AWS = require("aws-sdk");

const SES_CONFIG = {
  accessKeyId: process.env.SES_ACCESS_KEY,
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  region: process.env.SES_REGION,
};

const sendEmailCampaignToContacts = async (req, res) => {
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

  // buscar en la base de datos
  //   console.log(req.consultantToken);

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
  // --- 5. ORQUESTAR LOS ENVÍOS CON ASYNC/AWAIT ---
  const sendEmails = async () => {
    const results = [];

    for (let index = 0; index < contacts.length; index++) {
      const contact = contacts[index];

      // 6. CREAR LINK DE UNSUBSCRIBE DINÁMICO
      const unsubscribeLink = `${process.env.BACKEND_URL}/mails/unsubscribe/${contact._id}`;

      const mailOptions = {
        from: `<${consultantEmail}>`,
        to: contact.email,
        subject: subject,
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html
          xmlns="http://www.w3.org/1999/xhtml"
          xmlns:v="urn:schemas-microsoft-com:vml"
          xmlns:o="urn:schemas-microsoft-com:office:office"
        >
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <!--[if !mso]><!-->
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <!--<![endif]-->
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="format-detection" content="telephone=no" />
            <meta name="x-apple-disable-message-reformatting" />
            <title></title>
            <style type="text/css">
              @media screen {
                @font-face {
                  font-family: "Fira Sans";
                  font-style: normal;
                  font-weight: 300;
                  src: local(""),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnPKruRA.woff2") format("woff2"),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnPKruQg.woff") format("woff");
                }
                @font-face {
                  font-family: "Fira Sans";
                  font-style: normal;
                  font-weight: 400;
                  src: local(""), url("https://fonts.gstatic.com/s/firasans/v10/va9E4kDNxMZdWfMOD5VflQ.woff2") format("woff2"),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9E4kDNxMZdWfMOD5Vfkw.woff") format("woff");
                }
                @font-face {
                  font-family: "Fira Sans";
                  font-style: normal;
                  font-weight: 500;
                  src: local(""),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnZKvuRA.woff2") format("woff2"),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnZKvuQg.woff") format("woff");
                }
                @font-face {
                  font-family: "Fira Sans";
                  font-style: normal;
                  font-weight: 700;
                  src: local(""),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnLK3uRA.woff2") format("woff2"),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnLK3uQg.woff") format("woff");
                }
                @font-face {
                  font-family: "Fira Sans";
                  font-style: normal;
                  font-weight: 800;
                  src: local(""),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnMK7uRA.woff2") format("woff2"),
                    url("https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnMK7uQg.woff") format("woff");
                }
              }
            </style>
            <style type="text/css">
              #outlook a {
                padding: 0;
              }
              .ReadMsgBody,
              .ExternalClass {
                width: 100%;
              }
              .ExternalClass,
              .ExternalClass p,
              .ExternalClass td,
              .ExternalClass div,
              .ExternalClass span,
              .ExternalClass font {
                line-height: 100%;
              }
              div[style*="margin: 14px 0"],
              div[style*="margin: 16px 0"] {
                margin: 0 !important;
              }
              table,
              td {
                mso-table-lspace: 0;
                mso-table-rspace: 0;
              }
              table,
              tr,
              td {
                border-collapse: collapse;
              }
              body,
              td,
              th,
              p,
              div,
              li,
              a,
              span {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
                mso-line-height-rule: exactly;
              }
              img {
                border: 0;
                outline: none;
                line-height: 100%;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
              }
              a[x-apple-data-detectors] {
                color: inherit !important;
                text-decoration: none !important;
              }
              body {
                margin: 0;
                padding: 0;
                width: 100% !important;
                -webkit-font-smoothing: antialiased;
              }
              .pc-gmail-fix {
                display: none;
                display: none !important;
              }
              @media screen and (min-width: 621px) {
                .pc-email-container {
                  width: 620px !important;
                }
              }
            </style>
            <style type="text/css">
              @media screen and (max-width: 620px) {
                .pc-sm-mw-100pc {
                  max-width: 100% !important;
                }
                .pc-sm-p-25-10-15 {
                  padding: 25px 10px 15px !important;
                }
              }
            </style>
            <style type="text/css">
              @media screen and (max-width: 525px) {
                .pc-xs-w-100pc {
                  width: 100% !important;
                }
                .pc-xs-p-10-0-0 {
                  padding: 10px 0 0 !important;
                }
                .pc-xs-p-15-0-5 {
                  padding: 15px 0 5px !important;
                }
                .pc-xs-br-disabled br {
                  display: none !important;
                }
              }
            </style>
            <!--[if mso]>
              <style type="text/css">
                .pc-fb-font {
                  font-family: Helvetica, Arial, sans-serif !important;
                }
              </style>
            <![endif]-->
            <!--[if gte mso 9
              ]><xml
                ><o:OfficeDocumentSettings><o:AllowPNG /><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml
              ><!
            [endif]-->
          </head>
          <body
            style="
              width: 100% !important;
              margin: 0;
              padding: 0;
              mso-line-height-rule: exactly;
              -webkit-font-smoothing: antialiased;
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
              background-color: #ffffff;
            "
            class=""
          >
            <div>
              <table
                border="0"
                width="100%"
                height="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border-spacing: 0px;
                  font-family: MyriadPro-Regular;
                  font-size: 12px;
                  font-style: normal;
                  font-variant-caps: normal;
                  font-weight: normal;
                  letter-spacing: normal;
                  text-align: start;
                  text-indent: 0px;
                  text-transform: none;
                  white-space: normal;
                  word-spacing: 0px;
                  background-color: rgb(255, 255, 255);
                  text-decoration: none;
                "
              >
                <tbody>
                  <tr>
                    <td
                      align="center"
                      valign="top"
                      bgcolor="#ffffff"
                      style="border-collapse: collapse; vertical-align: top; background-color: rgb(255, 255, 255)"
                    >
                      <table
                        border="0"
                        width="648"
                        cellpadding="0"
                        cellspacing="0"
                        style="border-spacing: 0px; width: 648px; max-width: 648px"
                      >
                        <tbody>
                          <tr>
                            <td style="border-collapse: collapse; vertical-align: top">
                              <div style="max-width: 600px; margin: auto; font-family: Helvetica; text-align: left">
                                &nbsp;<br />&nbsp;
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td
                              align="center"
                              style="
                                border-collapse: collapse;
                                vertical-align: top;
                                padding-left: 24px;
                                padding-right: 24px;
                                background-color: rgb(43, 54, 61);
                              "
                            >
                              <img
                                src="${process.env.BACKEND_URL}/Logo.png"
                                alt="Logo GVRE Blanco"
                                border="0"
                                width="70"
                                height="35"
                                hspace="0"
                                vspace="0"
                                style="display: block; font-size: 0px; max-width: 100%; height: auto"
                                class="CToWUd"
                              />
                            </td>
                          </tr>
                          <tr>
                            <td
                              align="left"
                              style="
                                border-collapse: collapse;
                                vertical-align: top;
                                padding: 24px 24px 12px;
                                color: rgb(34, 34, 34);
                                background-color: rgb(255, 255, 255);
                                font-family: Helvetica;
                                line-height: 1.5;
                                text-align: left;
                                outline: rgb(221, 221, 221) solid 1px;
                              "
                            >
                            <div valign="top" style="border-collapse: collapse; vertical-align: top">
                              <img
                                src=${
                                  campaign.image
                                    ? campaign.image.split(" ").join("%20")
                                    : "https://images.assetsdelivery.com/compings_v2/pavelstasevich/pavelstasevich1811/pavelstasevich181101031.jpg"
                                }
                                width="600px"
                                alt="Imagen de anuncio"
                                style="display: block; font-size: 0px; margin: auto"
                                class="CToWUd"
                              />
                              ${
                                campaign.adComment !== ""
                                  ? `<div style="max-width: 600px; margin: auto">
                                    <span>&nbsp;</span>
                                    ${
                                      campaign.adComment
                                        ? `<div style="max-width: 600px; margin: auto">
                                      ${campaign.adComment}
                                        </div>`
                                        : ""
                                    }  
                                    </div>
                                    <div style="max-width: 600px; margin: auto; font-family: Helvetica; text-align: left">
                                      <br />
                                      <hr
                                        width="100%"
                                        style="
                                          padding: 0px;
                                          margin: 0px;
                                          border: none;
                                          max-width: 100%;
                                          height: 1px;
                                          background-color: rgb(221, 221, 221);
                                        "
                                      />
                                      <br />
                                    </div>`
                                  : ""
                              }
                            </div>
                              <div style="max-width: 600px; margin: auto">
                                ${messageP1}, ${contact.fullName}
                              </div>
                              <div style="max-width: 600px; margin: auto"><br /></div>
                              <div style="max-width: 600px; margin: auto">
                                ${messageP2}
                              </div>
                              <div style="max-width: 600px; margin: auto"><br /></div>
                              <div style="max-width: 600px; margin: auto">
                                ${messageP3}
                              </div>
                              <div style="max-width: 600px; margin: auto"><br /></div>
                              <span>&nbsp;</span>
                              <div style="max-width: 600px; margin: auto">
                                ${messageGoodbyeP1}
                              </div>
                              <div style="max-width: 600px; margin: auto"><br /></div>
                              <div style="max-width: 600px; margin: auto">
                                ${messageGoodbyeP2}
                              </div>
                              <table cellpadding="0" cellspacing="0" border="0" style="border-spacing: 0px; width: 777.15625px">
                                <tbody>
                                  <tr>
                                    <td style="border-collapse: collapse; vertical-align: top">
                                      <div style="max-width: 600px; margin: auto; font-family: Helvetica; text-align: left">
                                        <br />
                                        <hr
                                          width="100%"
                                          style="
                                            padding: 0px;
                                            margin: 0px;
                                            border: none;
                                            max-width: 100%;
                                            height: 1px;
                                            background-color: rgb(221, 221, 221);
                                          "
                                        />
                                        <br />
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      align="center"
                                      style="
                                        border-collapse: collapse;
                                        vertical-align: top;
                                        font-family: Helvetica;
                                        font-size: 10.800000190734863px;
                                        color: rgb(34, 34, 34);
                                      "
                                    >
                                      <img
                                        src="https://gvre-images.fra1.digitaloceanspaces.com/logogvre.png"
                                        alt="Agent portrait"
                                        border="0"
                                        width="60"
                                        height="60"
                                        hspace="0"
                                        vspace="0"
                                        style="
                                          display: block;
                                          font-size: 0px;
                                          border-top-left-radius: 50%;
                                          border-top-right-radius: 50%;
                                          border-bottom-right-radius: 50%;
                                          border-bottom-left-radius: 50%;
                                        "
                                        class="CToWUd"
                                      />
                                      <br />
                                      <b>${fullName}</b>
                                      <br />
                                      ${
                                        profession
                                          ? `${position} | ${profession}`
                                          : `${position}`
                                      }
                                      <br />
                                      ${
                                        consultantPhoneNumber
                                          ? `${consultantMobileNumber} | ${consultantPhoneNumber}`
                                          : `${consultantMobileNumber}`
                                      }
                                      <br />
                                      ${
                                        req.body.consultant.offices &&
                                        req.body.consultant.offices.length > 0
                                          ? req.body.consultant.offices.join(
                                              " | ",
                                            )
                                          : ""
                                      }
                                      <br />
                                      <a href="mailto:${consultantEmail}" target="_blank">
                                         ${consultantEmail}
                                      </a>
                                      <span>&nbsp;</span>
                                      <br />
                                      <br />
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td
                              align="left"
                              style="
                                border-collapse: collapse;
                                vertical-align: top;
                                font-family: Helvetica;
                                font-size: 8.399999618530273px;
                                color: rgb(153, 153, 153);
                                padding-left: 24px;
                                padding-right: 24px;
                              "
                            >
                              <br />Don't want to receive this type of email?<span>&nbsp;</span
                              ><a
                                href="${unsubscribeLink}"
                                style="color: rgb(153, 153, 153)"
                                target="_blank"
                                >Unsubscribe.</a
                              ><span>&nbsp;</span>&nbsp;<br />&nbsp;
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <img
                src=""
                alt=""
                width="1"
                height="1"
                border="0"
                style="
                  display: block;
                  font-size: 0px;
                  font-family: MyriadPro-Regular;
                  font-style: normal;
                  font-variant-caps: normal;
                  font-weight: normal;
                  letter-spacing: normal;
                  text-align: start;
                  text-indent: 0px;
                  text-transform: none;
                  white-space: normal;
                  word-spacing: 0px;
                  background-color: rgb(255, 255, 255);
                  text-decoration: none;
                  height: 1px;
                  width: 1px;
                  border-width: 0px;
                  margin: 0px;
                  padding: 0px;
                "
                class="CToWUd"
              />
            </div>
          </body>
        </html>`,
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
    console.log("Email campaign finished processing.");
    // Envía una respuesta al cliente indicando que el proceso terminó
    res.status(200).json({
      message: "Proceso de envío de campaña finalizado.",
      results: emailResults,
    });
  } catch (error) {
    console.error("General error in sendEmails orchestrator:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Error al orquestar los envíos de correo." });
    }
  }
};

module.exports = { sendEmailCampaignToContacts };
