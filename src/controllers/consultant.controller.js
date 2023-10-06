const Consultant = require("./../models/consultant.model");
const bcrypt = require("bcrypt");
const { deleteImage } = require("../middlewares/file.middleware");
const { isValidPassword, isValidEmail } = require("../auth/utils");

const consultantGetAll = async (req, res, next) => {
  try {
    const consultants = await Consultant.find();
    return res.status(200).json(consultants);
  } catch (err) {
    return next(err);
  }
};

const consultantGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consultant = await Consultant.findById(id);
    return res.status(200).json(consultant);
  } catch (err) {
    return next(err);
  }
};

const consultantCreate = async (req, res, next) => {
  try {
    const avatar = req.files?.avatar[0] ? req.files.avatar[0].location : "";
    const companyUnitLogo = req.files?.companyUnitLogo[0]
      ? req.files.companyUnitLogo[0].location
      : "";

    const newConsultant = new Consultant({
      consultantEmail: req.body.consultantEmail,
      consultantPassword: req.body.consultantPassword,
      consultantToken: req.body.consultantToken,
      fullName: req.body.fullName,
      avatar,
      companyUnitLogo,
      consultantMobileNumber: req.body.consultantMobileNumber,
      consultantPhoneNumber: req.body.consultantPhoneNumber,
      position: req.body.position,
      profession: req.body.profession,
      office1: req.body.office1,
      office2: req.body.office2,
      consultantComments: req.body.comments,
      role: req.body.role,
      showOnWeb: req.body.showOnWeb,
    });
    const consultantCreated = await newConsultant.save();

    return res.status(200).json(consultantCreated);
  } catch (err) {
    return next(err);
  }
};

const consultantUpdate = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};

    const consultant = await Consultant.findById(req.body.id);

    if (req.body.consultantEmail !== consultant.consultantEmail) {
      const existingEmail = await Consultant.findOne({
        consultantEmail: req.body.consultantEmail,
      });
      if (existingEmail) {
        const error = new Error(
          "Este correo ya se encuentra en nuestra base de datos"
        );
        error.status = 400;
        return next(error);
      }
      if (isValidEmail(req.body.consultantEmail) === false) {
        const error = new Error("Formato de correo inválido");
        error.status = 400;
        return next(error);
      } else fieldsToUpdate.consultantEmail = req.body.consultantEmail;
    } else {
      fieldsToUpdate.consultantEmail = req.body.consultantEmail;
    }

    const isEqualToLast =
      req.body.consultantPassword === consultant.consultantPassword;
    if (!isEqualToLast) {
      if (isValidPassword(req.body.consultantPassword) === false) {
        const error = new Error(
          "La contraseña debe contener al menos entre 8 y 16 carácteres, 1 mayúscula, 1 minúscula y 1 dígito"
        );
        error.status = 400;
        return next(error);
      }
      fieldsToUpdate.consultantPassword = await bcrypt.hash(
        req.body.consultantPassword,
        10
      );
    } else {
      fieldsToUpdate.consultantPassword = req.body.consultantPassword;
    }

    fieldsToUpdate.fullName = req.body.fullName;
    fieldsToUpdate.consultantToken = req.body.consultantToken;
    fieldsToUpdate.consultantMobileNumber = req.body.consultantMobileNumber;
    fieldsToUpdate.consultantPhoneNumber = req.body.consultantPhoneNumber;
    fieldsToUpdate.position = req.body.position;
    fieldsToUpdate.profession = req.body.profession;
    fieldsToUpdate.office1 = req.body.office1;
    fieldsToUpdate.office2 = req.body.office2;
    fieldsToUpdate.consultantComments = req.body.comments;
    fieldsToUpdate.role = req.body.role;
    fieldsToUpdate.showOnWeb = req.body.showOnWeb;

    if (Object.entries(req.files).length !== 0) {
      if (req.files.avatar) {
        deleteImage(consultant.avatar);
        fieldsToUpdate.avatar = req.files.avatar[0].location;
      } else {
        fieldsToUpdate.avatar = consultant.avatar;
      }
      if (req.files.companyUnitLogo) {
        deleteImage(consultant.companyUnitLogo);
        fieldsToUpdate.companyUnitLogo = req.files.companyUnitLogo[0].location;
      } else {
        fieldsToUpdate.companyUnitLogo = consultant.companyUnitLogo;
      }
    }

    const updatedConsultant = await Consultant.findByIdAndUpdate(
      req.body.id,
      fieldsToUpdate,
      { new: true }
    );
    updatedConsultant.password = null;

    return res.status(200).json(updatedConsultant);
  } catch (err) {
    return next(err);
  }
};

const consultantDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let response = "";

    const deleted = await Consultant.findByIdAndDelete(id);
    if (deleted) response = "Consultor borrado de la base de datos";
    else response = "No se ha podido encontrar este consultor.";

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const getConsultantTokenByEmail = async (req, res, next) => {
  const email = req.body.consultant.consultantEmail;
  const consultant = await Consultant.find({ consultantEmail: email });
  if (
    consultant !== null &&
    consultant[0].consultantToken !== undefined &&
    consultant[0].consultantToken !== ""
  ) {
    // console.log("bbdd");
    req.consultantToken = consultant[0].consultantToken;
    return next();
  } else {
    // console.log("swich");
    switch (email) {
      case "mateo@attomo.digital":
        req.consultantToken = process.env.GVRE_PASS_MATEO_HERNANDEZ;
        return next();
      case "ivan@attomo.digital":
        req.consultantToken = process.env.GVRE_PASS_IVAN_SANCHEZ;
        return next();
      case "inigo@attomo.digital":
        req.consultantToken = process.env.GVRE_PASS_INIGO_FOLDVARY;
        return next();
      case "retail@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_RETAIL;
        return next();
      case "d.salcedo@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_DAVID_SALCEDO;
        return next();
      case "d.ortega@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_DAVID_ORTEGA;
        return next();
      case "c.mahiques@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_CARI_MAHIQUES;
        return next();
      case "n.salcedo@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_NURIA_SALCEDO;
        return next();
      case "i.blasco@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_IRENE_BLASCO;
        return next();
      case "t.rdelaprada@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_TERESA_RUIZ;
        return next();
      case "m.gfaina@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_MARTA_GOMEZ_FAIÑA;
        return next();
      case "b.msagasta@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_BEATRIZ_MATEO_SAGASTA;
        return next();
      case "m.aragon@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_MONTSE_ARAGON;
        return next();
      case "a.gesche@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_ALEJANDRA_GESCHE;
        return next();
      case "a.gdelaserna@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_ANA_GOMEZ_DE_LA_SERNA;
        return next();
      case "m.mdelaplata@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_MARIA_MARQUEZ_DE_LA_PLATA;
        return next();
      case "a.esain@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_ALEJANDRO_ESAIN;
        return next();
      case "a.bareno@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_ANA_MARIA_BARENO;
        return next();
      case "l.szuloaga@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_LUCIA_SUAREZ_ZULOAGA;
        return next();
      case "l.monreal@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_LETICIA_MONREAL;
        return next();
      case "fotografia@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_VICTORIA_MIÑANA;
        return next();
      case "t.urries@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_TULA_JORDAN_DE_URRIES;
        return next();
      case "t.bareno@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_TERESA_BAREÑO;
        return next();
      case "i.coca@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_INES_COCA;
        return next();
      case "s.fierros@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_SOFIA_FIERROS;
        return next();
      case "n.serra@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_NURIA_SERRA;
        return next();
      case "o.paya@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_OLGA_PAYA;
        return next();
      case "c.mora@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_CARLA_MORA;
        return next();
      case "a.lopez@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_ALEJANDRA_LOPEZ;
        return next();
      case "i.martin@gvre.es":
        req.consultantToken = process.env.GVRE_PASS_INES_MARTIN;
        return next();
    }
  }
};

module.exports = {
  consultantGetAll,
  consultantGetOne,
  consultantUpdate,
  consultantCreate,
  consultantDelete,
  getConsultantTokenByEmail,
};
