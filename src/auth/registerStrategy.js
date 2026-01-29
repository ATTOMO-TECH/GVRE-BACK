const LocalStrategy = require("passport-local").Strategy;
const Consultant = require("../models/consultant.model");
const bcrypt = require("bcrypt");
const { isValidPassword, isValidEmail } = require("./utils");

/**************************************
 * Register Consultant Strategy
 *************************************/

const registerStrategy = new LocalStrategy(
  {
    usernameField: "consultantEmail",
    passwordField: "consultantPassword",
    passReqToCallback: true,
  },

  async (req, consultantEmail, consultantPassword, done) => {
    try {
      const { comments } = req.body;

      if (!isValidEmail(consultantEmail)) {
        const error = new Error("Formato de correo inválido");
        error.status = 400;
        return done(error);
      }

      const existingEmail = await Consultant.findOne({ consultantEmail });
      if (existingEmail) {
        const error = new Error(
          "Este correo ya se encuentra en nuestra base de datos",
        );
        error.status = 400;
        return done(error);
      }

      const existingMobile = await Consultant.findOne({
        consultantMobileNumber: req.body.consultantMobileNumber,
      });
      if (existingMobile) {
        const error = new Error(
          "Este teléfono móvil ya se encuentra en nuestra base de datos",
        );
        error.status = 400;
        return done(error);
      }

      if (!isValidPassword(consultantPassword)) {
        const error = new Error(
          "La contraseña debe contener al menos entre 8 y 16 carácteres, 1 mayúscula, 1 minúscula y 1 dígito",
        );
        error.status = 400;
        return done(error);
      }

      const avatar = req.files?.avatar ? req.files.avatar[0].location : "";
      const companyUnitLogo = req.files?.companyUnitLogo
        ? req.files.companyUnitLogo[0].location
        : "";

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(consultantPassword, saltRounds);
      // Parse offices field: accept JSON string, array, or comma-separated string
      let offices = [];
      if (req.body.offices) {
        if (typeof req.body.offices === "string") {
          try {
            const parsed = JSON.parse(req.body.offices);
            if (Array.isArray(parsed))
              offices = parsed.map((s) => String(s).trim()).filter(Boolean);
            else if (typeof parsed === "string") offices = [parsed.trim()];
          } catch (e) {
            // fallback: comma-separated string
            offices = req.body.offices
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } else if (Array.isArray(req.body.offices)) {
          offices = req.body.offices
            .map((s) => String(s).trim())
            .filter(Boolean);
        }
      } else {
        // backward compatibility: use office1/office2 if provided
        if (req.body.office1) offices.push(String(req.body.office1).trim());
        if (req.body.office2) offices.push(String(req.body.office2).trim());
      }

      const newConsultant = new Consultant({
        consultantEmail,
        consultantPassword: passwordHash,
        fullName: req.body.fullName,
        consultantToken: req.body.consultantToken,
        avatar,
        companyUnitLogo,
        consultantMobileNumber: req.body.consultantMobileNumber,
        consultantPhoneNumber: req.body.consultantPhoneNumber,
        position: req.body.position,
        profession: req.body.profession,
        offices,
        consultantComments: comments,
      });

      const savedConsultant = await newConsultant.save();
      savedConsultant.password = null;

      return done(null, savedConsultant);
    } catch (error) {
      return done(error);
    }
  },
);

module.exports = registerStrategy;
