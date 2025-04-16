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

    if (!consultant) {
      const error = new Error("Consultor no encontrado");
      error.status = 404;
      return next(error);
    }

    // Actualización de los campos básicos
    fieldsToUpdate.fullName = req.body.fullName;
    fieldsToUpdate.consultantToken = req.body.consultantToken;
    fieldsToUpdate.consultantMobileNumber = req.body.consultantMobileNumber;
    fieldsToUpdate.consultantPhoneNumber = req.body.consultantPhoneNumber;
    fieldsToUpdate.position = req.body.position;
    fieldsToUpdate.profession = req.body.profession;
    fieldsToUpdate.office1 = req.body.office1;
    fieldsToUpdate.office2 = req.body.office2;
    fieldsToUpdate.consultantComments = req.body.consultantComments || "";
    fieldsToUpdate.role = req.body.role;
    fieldsToUpdate.showOnWeb = req.body.showOnWeb;

    // Manejo de zonas de firma de correo electrónico
    if (req.body.consultantEmailSignZones) {
      const consultantEmailSignZones =
        typeof req.body.consultantEmailSignZones === "string"
          ? JSON.parse(req.body.consultantEmailSignZones)
          : req.body.consultantEmailSignZones;

      // Inicializamos el campo de zonas si no existe
      fieldsToUpdate.consultantEmailSignZones =
        consultant.consultantEmailSignZones || {};

      // Recorremos las zonas y actualizamos con los nuevos valores
      Object.keys(consultantEmailSignZones).forEach((priority) => {
        Object.keys(consultantEmailSignZones[priority]).forEach((zoneKey) => {
          const zoneData = consultantEmailSignZones[priority][zoneKey];

          // Limpiamos los datos innecesarios y actualizamos
          const cleanedZoneData = {
            zoneId: zoneData.zoneId || zoneData._id,
            zone: zoneData.zone,
            name: zoneData.name,
            image: zoneData.image || "", // La imagen puede estar vacía
          };

          // Verificamos si las zonas ya existen, si no las inicializamos
          if (!fieldsToUpdate.consultantEmailSignZones[priority]) {
            fieldsToUpdate.consultantEmailSignZones[priority] = {};
          }

          // Actualizamos la zona específica
          fieldsToUpdate.consultantEmailSignZones[priority][zoneKey] =
            cleanedZoneData;
        });
      });
    }

    // Manejo de archivos subidos (imágenes)
    if (req.files) {
      const { avatar, companyUnitLogo, ...backgroundImages } = req.files;

      // Actualización del avatar
      if (avatar) {
        if (consultant.avatar) {
          deleteImage(consultant.avatar); // Elimina la imagen anterior si existe
        }
        fieldsToUpdate.avatar = avatar[0].location; // Añadir nueva imagen de avatar
      }

      // Actualización del logo de la unidad de la empresa
      if (companyUnitLogo) {
        if (consultant.companyUnitLogo) {
          deleteImage(consultant.companyUnitLogo); // Elimina la imagen anterior si existe
        }
        fieldsToUpdate.companyUnitLogo = companyUnitLogo[0].location; // Añadir nuevo logo
      }

      // Actualizamos las imágenes de las zonas si se han subido
      Object.keys(backgroundImages).forEach((key) => {
        const [priority, zoneKey] = key.split("_").slice(0, 2); // Tomamos solo 'high' y 'zone1'

        if (!fieldsToUpdate.consultantEmailSignZones[priority]) {
          fieldsToUpdate.consultantEmailSignZones[priority] = {};
        }

        // Asegúrate de que la zona exista antes de asignar la imagen
        if (fieldsToUpdate.consultantEmailSignZones[priority][zoneKey]) {
          fieldsToUpdate.consultantEmailSignZones[priority][zoneKey].image =
            backgroundImages[key][0].location; // Asigna la URL de la imagen subida
        }
      });
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

    // Actualización del consultor
    const updatedConsultant = await Consultant.findByIdAndUpdate(
      req.body.id,
      { $set: fieldsToUpdate }, // Utilizamos $set para asegurarnos de que solo se actualicen las propiedades específicas
      { new: true }
    );

    updatedConsultant.consultantPassword = null; // No enviar la contraseña en la respuesta

    return res.status(200).json(updatedConsultant);
  } catch (err) {
    return next(err);
  }
};

const deleteConsultantImage = async (req, res, next) => {
  try {
    const { id, type } = req.params;
    const { toDelete } = req.body;

    const consultant = await Consultant.findById(id);

    if (!consultant) {
      const error = new Error("Consultor no encontrado");
      error.status = 404;
      return next(error);
    }

    const typeParts = type.split("_");
    const priority = typeParts[0];
    const zoneType = typeParts[1];
    const imageField = `consultantEmailSignZones.${priority}.${zoneType}.image`;

    const imageToDelete = consultant.get(imageField);

    if (imageToDelete !== toDelete) {
      return res.status(400).json({ message: "La imagen no coincide" });
    }

    consultant.set(imageField, "");
    await consultant.save();

    // Elimina la imagen del bucket
    deleteImage(imageToDelete);

    res.status(200).json({ message: "Imagen eliminada correctamente" });
  } catch (err) {
    next(err);
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
  deleteConsultantImage,
  consultantCreate,
  consultantDelete,
  getConsultantTokenById,
};
