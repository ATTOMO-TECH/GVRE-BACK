const nodemailer = require('nodemailer'); // email sender function 
const { getPasswordByEmail } = require('./utils')

const maskTemplate = (value, ref) => {
  let render = "";

  if ((ref === "sale" && value === 999999999) || (ref === "rent" && value === 999999999)) {
    render = `<p>Valor máx.</p>`;
  } else if ((ref === "sale" || ref === "rent") && value === 0) {
    render = `<p>Sin precio</p>`;
  } else if ((ref !== "sale" && ref !== "rent") && value === 0) {
    render = `<p>Sin datos</p>`;
  } else {
    if (ref === "sale" || ref === "rent")
      render = (
        `<p>${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${ref === "sale" ? " €" : " €/mes"}</p>`
      );
    else
      render = (
        `<p>
          ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} m<sup>2</sup>
        </p>`
      );
  }
  return render;
};

const sendAdsToContact = (req, res) => {

  const createAdsRows = (ads) => {
    return ads.map(ad => {
      return (
        `${ad.adDirectionSelected !== undefined
          ? `<div style="max-width: 600px; margin: auto">
              <strong>${ad.adDirectionSelected}:</strong>
            </div>`
          : ``
        }
         <div style="max-width: 600px; margin: auto">
         <div
          id="m_-4520741529468623966gmail-m_8445976314637867845listing-a0E3Y00001LXsawUAD"
          style="max-width: 600px; margin: auto"
        >
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-spacing: 0px">
            <tbody>
              <tr>
                <td style="border-collapse: collapse; vertical-align: top">
                  <table
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    width="100%"
                    style="border-spacing: 0px"
                  >
                    <tbody>
                    ${ad.adComment ?
          `<tr>
                        <td valign="top" style="border-collapse: collapse; vertical-align: top">
                          <span>&nbsp;</span>
                          <span>&nbsp;</span>  
                          <div
                            style="
                            max-width: 600px;
                            margin: auto;
                            font-family: Helvetica;
                            text-align: justify;
                            color: rgb(43, 54, 61);
                            "
                          >
                            ${ad.adComment}
                            <span>&nbsp;</span>
                            <span>&nbsp;</span>
                          <br /><br />
                          </div>
                        </td>
                      </tr>` : ``
        }
                      <tr>
                        <td valign="top" style="border-collapse: collapse; vertical-align: top">
                          <h2 style="font-family: Helvetica; font-weight: bold; text-align: center">
                            <a
                              href="${ad.department === "Residencial" ? 'https://gvre.es/residentialItem/' + ad._id : 'https://gvre.es/patrimonialItem/' + ad._id}"
                              style="text-decoration: none; font-size: 19px; color: rgb(43, 54, 61)"
                              target="_blank"
                              >
                                ${ad.titleEdited !== undefined ? ad.titleEdited : ad.title}
                              </a
                            ><span>&nbsp;</span><br />
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="border-collapse: collapse; vertical-align: top">
                           <a
                           href="${ad.department === "Residencial" ? 'https://gvre.es/residentialItem/' + ad._id : 'https://gvre.es/patrimonialItem/' + ad._id}"
                           target="_blank"
			   style="font-size:larger !important;color:rgb(43,54,61) !important;text-decoration:none !important;"
                           >
                            <div style="
                              margin:0 auto;
                              justify-content:center !important;
                              align-items:center !important;
                              align-content:center !important;
                              text-align:center !important;
                              width:200px;
                              padding-left:40px;
                              padding-right:40px;
                              padding-top:8px;
                              padding-bottom:8px;
                              background-color:rgb(219, 218, 218);
                              border-radius:6px;
                              "
                              >
                              <img
                               src="https://gvre.es/static/media/logogvre.4bd1abc4.png"
                               alt="Agent portrait"
                               border="0"
                               width="60"
                               height="60"
                               style="
                                 font-size: 0px;
                                 border-top-left-radius: 50%;
                                 border-top-right-radius: 50%;
                                 border-bottom-right-radius: 50%;
                                 border-bottom-left-radius: 50%;
                               "
                               class="CToWUd"
                               />
                              <span style="
                                margin-left: 18px;
                                vertical-align: 20px;
                                font-family:Helvetica;
                                font-size:16px;
                                font-weight:bold;
                                text-align:center !important;
                                " >
                                 ${ad.buildSurface && ad.buildSurface != 0 && ad.buildSurface != 999999999 ? ad.buildSurface+` m<sup>2</sup>` : ''}
                              </span>
                            </div>
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-collapse: collapse; vertical-align: top; text-align: center">
                          <h2
                            id="m_-4520741529468623966gmail-m_8445976314637867845price"
                            style="padding: 10px 15px 10 15px; color: rgb(43, 54, 61); font-size: 22px"
                          >
                            ${ad.adType.includes("Venta") ? maskTemplate(ad.sale.saleValue, "sale") : maskTemplate(ad.rent.rentValue, "rent")}
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="
                            border-collapse: collapse;
                            vertical-align: top;
                            text-align: center;
                            color: rgb(43, 54, 61);
                          "
                        >
                          ref ${ad.adReference}<span>&nbsp;</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-collapse: collapse; vertical-align: top">
                          <div
                            style="
                              max-width: 600px;
                              margin: auto;
                              font-family: Helvetica;
                              text-align: left;
                            "
                          >
                            &nbsp;<span>&nbsp;</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="border-collapse: collapse; vertical-align: top">
                          <div
                            style="
                              max-width: 600px;
                              margin: auto;
                              font-family: Helvetica;
                              text-align: justify;
                              color: rgb(43, 54, 61);
                            "
                          >
                            ${ad.description.emailPDF}<span>&nbsp;</span
                            ><a
                              href="${ad.department === "Residencial" ? 'https://gvre.es/residentialItem/' + ad._id : 'https://gvre.es/patrimonialItem/' + ad._id}"
                              target="_blank"
                              data-saferedirecturl="https://www.google.com/url?q="
                              style="font-size:larger !important;color:rgb(255, 255, 255) !important;text-decoration:none !important;"
                              >
				<div style="margin:0 auto;margin-top:5%;justify-content:center !important;align-items:center !important;align-content:center !important;text-align:center !important;width:200px;padding-left:10px;padding-right:10px;padding-top:6px;padding-bottom:6px;background-color:rgb(43,54,61);border-radius:6px;">
                                  IR AL ANUNCIO
                                </div>
			    </a
                            >
                            <span>&nbsp;</span>
                            <br /><br />
                          </div>
                          <table style="border-spacing: 0px; table-layout: fixed; width: 600px">
                            <tbody>
                            <span>&nbsp;</span>
                            <span>&nbsp;</span>  
                              <tr style="text-align: center">
                              ${(ad.plotSurface !== 0 && ad.plotSurface !== 999999999) ?
          `<th>
                                  <img
                                    width="25px"
                                    height="25px"
                                    src="https://img.icons8.com/ios/25/000000/surface.png"
                                    alt="Superficie parcela"
                                    style="display: block; font-size: 0px; margin: 0px auto"
                                    class="CToWUd"
                                  />
                                </th>`
          : ``
        }
                              ${(ad.buildSurface !== 0 && ad.buildSurface !== 999999999) ?
          `<th>
                                  <img
                                    width="25px"
                                    height="25px"
                                    src="https://img.icons8.com/dotty/25/000000/structural.png"
                                    alt="Superficie construida"
                                    style="display: block; font-size: 0px; margin: 0px auto"
                                    class="CToWUd"
                                  />
                                </th>` : ``
        }
                              ${ad.quality.outdoorPool !== 0 ?
          `<th>
                                  <img
                                    width="25px"
                                    height="25px"
                                    src="https://img.icons8.com/glyph-neue/25/000000/swimming-pool.png"
                                    alt="Piscinas exteriores"
                                    style="display: block; font-size: 0px; margin: 0px auto"
                                    class="CToWUd"
                                  />
                                </th>` : ``
        }
                              ${(ad.quality.bathrooms !== 0 && ad.quality.bathrooms !== 999) ?
          `<th>
                                  <img
                                    width="25px"
                                    height="25px"
                                    src="https://img.icons8.com/external-kiranshastry-lineal-kiranshastry/25/000000/external-bathtub-hygiene-kiranshastry-lineal-kiranshastry-2.png"
                                    alt="Baños"
                                    style="display: block; font-size: 0px; margin: 0px auto"
                                    class="CToWUd"
                                  />
                                </th>` : ``
        }
                              ${(ad.quality.bedrooms !== 0 && ad.quality.bedrooms !== 999) ?
          `<th>
                                  <img
                                    width="25px"
                                    height="25px"
                                    src="https://img.icons8.com/ios/25/000000/empty-bed.png"
                                    alt="Habitaciones"
                                    style="display: block; font-size: 0px; margin: 0px auto"
                                    class="CToWUd"
                                  />
                                </th>` : ``
        }
                              </tr>
                              <tr style="text-align: center; color: rgb(43, 54, 61)">
                              ${(ad.plotSurface !== 0 && ad.plotSurface !== 999999999) ?
          `<td style="border-collapse: collapse; vertical-align: top">
                                    ${maskTemplate(ad.plotSurface, "plotSurface")}
                                  </td>` : ``
        }
                              ${(ad.buildSurface !== 0 && ad.buildSurface !== 999999999) ?
          `<td style="border-collapse: collapse; vertical-align: top">
                                    ${maskTemplate(ad.buildSurface, "buildSurface")}
                                  </td>` : ``
        }
                              ${ad.quality.outdoorPool !== 0 ?
          `<td style="border-collapse: collapse; vertical-align: top">
                                    <p>${ad.quality.outdoorPool}</p>
                                  </td>` : ``
        }
                              ${(ad.quality.bathrooms !== 0 && ad.quality.bathrooms !== 999) ?
          `<td style="border-collapse: collapse; vertical-align: top">
                                    <p>${ad.quality.bathrooms}</p>
                                 </td>` : ``
        }
                              ${(ad.quality.bedrooms !== 0 && ad.quality.bedrooms !== 999) ?
          `<td style="border-collapse: collapse; vertical-align: top">
                                    <p>${ad.quality.bedrooms}</p>
                                  </td>` : ``
        }
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-collapse: collapse; vertical-align: top">
                          <div
                            style="
                              max-width: 600px;
                              margin: auto;
                              font-family: Helvetica;
                              text-align: left;
                            "
                          >
                            <br /><br />
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
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`
      )
    })
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: `${req.body.consultant.consultantEmail}`,
      pass: getPasswordByEmail(req.body.consultant.consultantEmail)
    }
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const mailOptions = {
    from: `GV Real Estate`,
    to: `${req.body.contact.email}`,
    subject: `${req.body.subject}`,
    html:
      `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
                            src="https://ci6.googleusercontent.com/proxy/AfGGywFT6_3aswvTp_kvD7StE2fqbnoU9jILHPGzB-VTH9f9GVCLngB4B9zF0ZWU5I6N8HDYArUh_CeA2MztYx7CYyAorUyq_Y0E5LML90LV-TdxVNCDdX06ZA=s0-d-e1-ft#https://s3.eu-central-1.amazonaws.com/hydrobot-static/GV_logo_blanco.png"
                            alt="${req.body.consultant.position}"
                            border="0"
                            width="100"
                            height="50"
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
                          <div style="max-width: 600px; margin: auto">
                            ${req.body.messageP1}
                          </div>
                          <div style="max-width: 600px; margin: auto"><br /></div>
                          <div style="max-width: 600px; margin: auto">
                            ${req.body.messageP2}
                          </div>
                          <div style="max-width: 600px; margin: auto"><br /></div>
                          <div style="max-width: 600px; margin: auto">
                            ${req.body.messageP3}
                          </div>
                          <div style="max-width: 600px; margin: auto"><br /></div>
                          <span>&nbsp;</span>
                          <span>&nbsp;</span>  
                          ${createAdsRows(req.body.ads)}
                          <div style="max-width: 600px; margin: auto">
                            ${req.body.messageGoodbyeP1}
                          </div>
                          <div style="max-width: 600px; margin: auto"><br /></div>
                          <div style="max-width: 600px; margin: auto">
                            ${req.body.messageGoodbyeP2}
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
                                    src="https://gvre.es/static/media/logogvre.4bd1abc4.png"
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
                                  <b>${req.body.consultant.fullName}</b>
                                  <br />
                                  ${req.body.consultant.profession ? `${req.body.consultant.position} | ${req.body.consultant.profession}` : `${req.body.consultant.position}`}
                                  <br />
                                  ${req.body.consultant.consultantPhoneNumber
        ? `${req.body.consultant.consultantMobileNumber} | ${req.body.consultant.consultantPhoneNumber}`
        : `${req.body.consultant.consultantMobileNumber}`}
                                  <br />
                                  ${req.body.consultant.office2 ? `${req.body.consultant.office1} | ${req.body.consultant.office2}` : `${req.body.consultant.office1}`}
                                  <br />
                                  <a href="mailto:${req.body.consultant.consultantEmail}" target="_blank">
                                     ${req.body.consultant.consultantEmail}
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
                            href="mailto:${req.body.consultant.consultantEmail}?subject=Unsubscribe"
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
    </html>`
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.status(200).json("Mensaje enviado");
    }
  });
}

const sendAdToContacts = (req, res) => {

  const setClientToMessage = (client) => {
    return req.body.messageP1.replace(req.body.request.requestContact.fullName, client)
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: `${req.body.consultant.consultantEmail}`,
      pass: getPasswordByEmail(req.body.consultant.consultantEmail)
    }
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const mailOptions = {
    from: `${req.body.request.requestContact.fullName}`,
    to: `${req.body.request.requestContact.email}`,
    subject: `${req.body.subject}`,
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
                              src="https://ci6.googleusercontent.com/proxy/AfGGywFT6_3aswvTp_kvD7StE2fqbnoU9jILHPGzB-VTH9f9GVCLngB4B9zF0ZWU5I6N8HDYArUh_CeA2MztYx7CYyAorUyq_Y0E5LML90LV-TdxVNCDdX06ZA=s0-d-e1-ft#https://s3.eu-central-1.amazonaws.com/hydrobot-static/GV_logo_blanco.png"
                              alt="${req.body.consultant.position}"
                              border="0"
                              width="100"
                              height="50"
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
                            <div style="max-width: 600px; margin: auto">
                            ${setClientToMessage(req.body.request.requestContact.fullName)}
                            </div>
                            <div style="max-width: 600px; margin: auto"><br /></div>
                            <div style="max-width: 600px; margin: auto">
                              ${req.body.messageP2}
                            </div>
                            <div style="max-width: 600px; margin: auto"><br /></div>
                            <div style="max-width: 600px; margin: auto">
                              ${req.body.messageP3}
                            </div>
                            <div style="max-width: 600px; margin: auto"><br /></div>
                            <span>&nbsp;</span>
                            <span>&nbsp;</span>
                            ${req.body.ad.adDirectionSelected !== undefined
        ? `<div style="max-width: 600px; margin: auto">
                                  <strong> ${req.body.ad.adDirectionSelected}:</strong>
                                </div>`
        : ``
      }
                            <div style="max-width: 600px; margin: auto">
                              <div
                                id="m_-4520741529468623966gmail-m_8445976314637867845listing-a0E3Y00001LXsawUAD"
                                style="max-width: 600px; margin: auto"
                              >
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-spacing: 0px">
                                  <tbody>
                                    <tr>
                                      <td style="border-collapse: collapse; vertical-align: top">
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          width="100%"
                                          style="border-spacing: 0px"
                                        >
                                          <tbody>
                                          ${req.body.ad.adComment ?
        `<tr>
                                                <td valign="top" style="border-collapse: collapse; vertical-align: top">
                                                  <span>&nbsp;</span>
                                                  <span>&nbsp;</span>  
                                                  <div
                                                    style="
                                                    max-width: 600px;
                                                    margin: auto;
                                                    font-family: Helvetica;
                                                    text-align: justify;
                                                    color: rgb(43, 54, 61);
                                                    "
                                                  >
                                                    ${req.body.ad.adComment}
                                                    <span>&nbsp;</span>
                                                    <span>&nbsp;</span>
                                                  <br /><br />
                                                  </div>
                                                </td>
                                              </tr>` : ``
      }
                                            <tr>
                                              <td valign="top" style="border-collapse: collapse; vertical-align: top">
                                                <h2 style="font-family: Helvetica; font-weight: bold; text-align: center">
                                                  <a
                                                    href="${req.body.ad.department === "Residencial" ? 'https://gvre.es/residentialItem/' + req.body.ad._id : 'https://gvre.es/patrimonialItem/' + req.body.ad._id}"
                                                    style="text-decoration: none; font-size: 19px; color: rgb(43, 54, 61)"
                                                    target="_blank"
                                                    >
                                                      ${req.body.ad.titleEdited !== undefined ? req.body.ad.titleEdited : req.body.ad.title}
                                                    </a
                                                  ><span>&nbsp;</span><br />
                                                </h2>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td valign="top" style="border-collapse: collapse; vertical-align: top">
                                                <a
                                                href="${req.body.ad.department === "Residencial" ? 'https://gvre.es/residentialItem/' + req.body.ad._id : 'https://gvre.es/patrimonialItem/' + req.body.ad._id}"
                                                target="_blank" style="font-size:larger !important;color:rgb(43,54,61) !important;text-decoration:none !important;"
                           >
                             <div style="
                              margin:0 auto;
                              justify-content:center !important;
                              align-items:center !important;
                              align-content:center !important;
                              text-align:center !important;
                              width:200px;
                              padding-left:40px;
                              padding-right:40px;
                              padding-top:8px;
                              padding-bottom:8px;
                              background-color:rgb(219, 218, 218);
                              border-radius:6px;
                              "
                              >
                              <img
                               src="https://gvre.es/static/media/logogvre.4bd1abc4.png"
                               alt="Agent portrait"
                               border="0"
                               width="60"
                               height="60"
                               style="
                                 font-size: 0px;
                                 border-top-left-radius: 50%;
                                 border-top-right-radius: 50%;
                                 border-bottom-right-radius: 50%;
                                 border-bottom-left-radius: 50%;
                               "
                               class="CToWUd"
                               />
                              <span style="
                                margin-left: 18px;
                                vertical-align: 20px;
                                font-family:Helvetica;
                                font-size:16px;
                                font-weight:bold;
                                text-align:center !important;
                                " >
	                         ${req.body.ad.buildSurface && req.body.ad.buildSurface != 0 && req.body.ad.buildSurface != 999999999 ? req.body.ad.buildSurface+` m<sup>2</sup>` : ''}
                              </span>
                            </div>
                                                
                                                </a>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td style="border-collapse: collapse; vertical-align: top; text-align: center">
                                                <h2
                                                  id="m_-4520741529468623966gmail-m_8445976314637867845price"
                                                  style="padding: 10px 15px 10 15px; color: rgb(43, 54, 61); font-size: 22px"
                                                >
                                                  ${req.body.ad.adType.includes("Venta")
        ? maskTemplate(req.body.ad.sale.saleValue, "sale")
        : maskTemplate(req.body.ad.rent.rentValue, "rent")}
                                                </h2>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td
                                                style="
                                                  border-collapse: collapse;
                                                  vertical-align: top;
                                                  text-align: center;
                                                  color: rgb(43, 54, 61);
                                                "
                                              >
                                                ref ${req.body.ad.adReference}<span>&nbsp;</span>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td style="border-collapse: collapse; vertical-align: top">
                                                <div
                                                  style="
                                                    max-width: 600px;
                                                    margin: auto;
                                                    font-family: Helvetica;
                                                    text-align: left;
                                                  "
                                                >
                                                  &nbsp;<span>&nbsp;</span>
                                                </div>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td valign="top" style="border-collapse: collapse; vertical-align: top">
                                                <div
                                                  style="
                                                    max-width: 600px;
                                                    margin: auto;
                                                    font-family: Helvetica;
                                                    text-align: justify;
                                                    color: rgb(43, 54, 61);
                                                  "
                                                >
                                                  ${req.body.ad.description.emailPDF}<span>&nbsp;</span
                                                  ><a
                                                    href="${req.body.ad.department === "Residencial" ? 'https://gvre.es/residentialItem/' + req.body.ad._id : 'https://gvre.es/patrimonialItem/' + req.body.ad._id}"
                                                    target="_blank"
                                                    data-saferedirecturl="https://www.google.com/url?q="
                                                    style="font-size:larger !important;color:rgb(255, 255, 255) !important;text-decoration:none !important;"
                                                    >
                                                    <div style="margin:0 auto;margin-top:5%;justify-content:center !important;align-items:center !important;align-content:center !important;text-align:center !important;width:200px;padding-left:10px;padding-right:10px;padding-top:6px;padding-bottom:6px;background-color:rgb(43,54,61);border-radius:6px;">
                                                      IR AL ANUNCIO
                                                    </div>                                                    
						  </a>
                                                  <span>&nbsp;</span>
                                                  <br /><br />
                                                </div>
                                                <table style="border-spacing: 0px; table-layout: fixed; width: 600px">
                                                  <tbody>
                                                  <span>&nbsp;</span>
                                                  <span>&nbsp;</span>  
                                                    <tr style="text-align: center">
                                                    ${(req.body.ad.plotSurface !== 0 && req.body.ad.plotSurface !== 999999999) ?
        `<th>
                                                        <img
                                                          width="25px"
                                                          height="25px"
                                                          src="https://img.icons8.com/ios/25/000000/surface.png"
                                                          alt="Superficie parcela"
                                                          style="display: block; font-size: 0px; margin: 0px auto"
                                                          class="CToWUd"
                                                        />
                                                      </th>`
        : ``
      }
                                                    ${(req.body.ad.buildSurface !== 0 && req.body.ad.buildSurface !== 999999999) ?
        `<th>
                                                        <img
                                                          width="25px"
                                                          height="25px"
                                                          src="https://img.icons8.com/dotty/25/000000/structural.png"
                                                          alt="Superficie construida"
                                                          style="display: block; font-size: 0px; margin: 0px auto"
                                                          class="CToWUd"
                                                        />
                                                      </th>` : ``
      }
                                                    ${req.body.ad.quality.outdoorPool !== 0 ?
        `<th>
                                                        <img
                                                          width="25px"
                                                          height="25px"
                                                          src="https://img.icons8.com/glyph-neue/25/000000/swimming-pool.png"
                                                          alt="Piscinas exteriores"
                                                          style="display: block; font-size: 0px; margin: 0px auto"
                                                          class="CToWUd"
                                                        />
                                                      </th>` : ``
      }
                                                    ${(req.body.ad.quality.bathrooms !== 0 && req.body.ad.quality.bathrooms !== 999) ?
        `<th>
                                                        <img
                                                          width="25px"
                                                          height="25px"
                                                          src="https://img.icons8.com/external-kiranshastry-lineal-kiranshastry/25/000000/external-bathtub-hygiene-kiranshastry-lineal-kiranshastry-2.png"
                                                          alt="Baños"
                                                          style="display: block; font-size: 0px; margin: 0px auto"
                                                          class="CToWUd"
                                                        />
                                                      </th>` : ``
      }
                                                    ${(req.body.ad.quality.bedrooms !== 0 && req.body.ad.quality.bedrooms !== 999) ?
        `<th>
                                                        <img
                                                          width="25px"
                                                          height="25px"
                                                          src="https://img.icons8.com/ios/25/000000/empty-bed.png"
                                                          alt="Habitaciones"
                                                          style="display: block; font-size: 0px; margin: 0px auto"
                                                          class="CToWUd"
                                                        />
                                                      </th>` : ``
      }
                                                    </tr>
                                                    <tr style="text-align: center; color: rgb(43, 54, 61)">
                                                      ${(req.body.ad.plotSurface !== 0 && req.body.ad.plotSurface !== 999999999) ?
        `<td style="border-collapse: collapse; vertical-align: top">
                                                            ${maskTemplate(req.body.ad.plotSurface, "plotSurface")}
                                                          </td>` : ``
      }
                                                      ${(req.body.ad.buildSurface !== 0 && req.body.ad.buildSurface !== 999999999) ?
        `<td style="border-collapse: collapse; vertical-align: top">
                                                            ${maskTemplate(req.body.ad.buildSurface, "buildSurface")}
                                                          </td>` : ``
      }
                                                      ${req.body.ad.quality.outdoorPool !== 0 ?
        `<td style="border-collapse: collapse; vertical-align: top">
                                                            <p>${req.body.ad.quality.outdoorPool}</p>
                                                          </td>` : ``
      }
                                                      ${(req.body.ad.quality.bathrooms !== 0 && req.body.ad.quality.bathrooms !== 999) ?
        `<td style="border-collapse: collapse; vertical-align: top">
                                                            <p>${req.body.ad.quality.bathrooms}</p>
                                                         </td>` : ``
      }
                                                      ${(req.body.ad.quality.bedrooms !== 0 && req.body.ad.quality.bedrooms !== 999) ?
        `<td style="border-collapse: collapse; vertical-align: top">
                                                            <p>${req.body.ad.quality.bedrooms}</p>
                                                          </td>` : ``
      }
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td style="border-collapse: collapse; vertical-align: top">
                                                <div
                                                  style="
                                                    max-width: 600px;
                                                    margin: auto;
                                                    font-family: Helvetica;
                                                    text-align: left;
                                                  "
                                                >
                                                  <br /><br />
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
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            <div style="max-width: 600px; margin: auto">
                              ${req.body.messageGoodbyeP1}
                            </div>
                            <div style="max-width: 600px; margin: auto"><br /></div>
                            <div style="max-width: 600px; margin: auto">
                              ${req.body.messageGoodbyeP2}
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
                                      src="https://gvre.es/static/media/logogvre.4bd1abc4.png"
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
                                      <b>${req.body.consultant.fullName}</b>
                                      <br />
                                      ${req.body.consultant.profession ? `${req.body.consultant.position} | ${req.body.consultant.profession}` : `${req.body.consultant.position}`}
                                      <br />
                                      ${req.body.consultant.consultantPhoneNumber
        ? `${req.body.consultant.consultantMobileNumber} | ${req.body.consultant.consultantPhoneNumber}`
        : `${req.body.consultant.consultantMobileNumber}`}
                                      <br />
                                      ${req.body.consultant.office2 ? `${req.body.consultant.office1} | ${req.body.consultant.office2}` : `${req.body.consultant.office1}`}
                                      <br />
                                      <a href="mailto:${req.body.consultant.consultantEmail}" target="_blank">
                                         ${req.body.consultant.consultantEmail}
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
                              href="mailto:${req.body.consultant.consultantEmail}?subject=Unsubscribe"
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
      </html>`
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      res.status(500).send(error.message);
    } else {
      res.status(200).json("Mensaje enviado");
    }
  });
}


module.exports = { sendAdsToContact, sendAdToContacts }

