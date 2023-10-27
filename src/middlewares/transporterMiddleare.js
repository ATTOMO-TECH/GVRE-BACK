const nodemailer = require("nodemailer");

let reusableTransporter;
// Función para crear el transporte
const createTransporter = (req, res, next) => {
  if (!reusableTransporter) {
    reusableTransporter = nodemailer.createTransport({
      maxConnections: 10,
      service: "Gmail",
      auth: {
        user: req.body.consultant.consultantEmail,
        pass: req.consultantToken,
      },
    });
  }

  reusableTransporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  req.reusableTransporter = reusableTransporter;

  return next();
};

module.exports = { createTransporter };
