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
    fieldsToUpdate.consultantComments = req.body.consultantComments;
    fieldsToUpdate.role = req.body.role;
    fieldsToUpdate.showOnWeb = req.body.showOnWeb;

    if (req.body.consultantEmailSignZones) {
      const consultantEmailSignZones = JSON.parse(
        Array.isArray(req.body.consultantEmailSignZones)
          ? req.body.consultantEmailSignZones[1]
          : req.body.consultantEmailSignZones
      );
      fieldsToUpdate.consultantEmailSignZones = consultantEmailSignZones;
    }

    if (req.files && Object.entries(req.files).length !== 0) {
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
    updatedConsultant.consultantPassword = null;

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

const getConsultantTokenById = async (req, res, next) => {
  const consultant = await Consultant.findOne({
    consultantEmail: req.body.consultant.consultantEmail,
  });
  if (
    consultant !== null &&
    consultant.consultantToken !== undefined &&
    consultant.consultantToken !== ""
  ) {
    req.consultantToken = consultant.consultantToken;
    req.office1 = consultant.office1;
    req.office2 = consultant.office2;

    return next();
  } else
    res.status(404).json({ message: "Error al recoger datos del consultor" });
};

module.exports = {
  consultantGetAll,
  consultantGetOne,
  consultantUpdate,
  consultantCreate,
  consultantDelete,
  getConsultantTokenById,
};
