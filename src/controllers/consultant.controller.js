const Consultant = require("./../models/consultant.model");
const bcrypt = require("bcrypt");
const { deleteImage, getCdnUrl } = require("../middlewares/file.middleware");
const { isValidPassword, isValidEmail } = require("../auth/utils");
const { revalidateWeb } = require("../utils/revalidateWeb"); // <-- Asegúrate de que esto esté aquí si no lo estaba

const consultantGetAll = async (req, res, next) => {
  try {
    const consultants = await Consultant.find();
    return res.status(200).json(consultants);
  } catch (err) {
    return next(err);
  }
};

const consultantGetNameAndIds = async (req, res, next) => {
  try {
    const consultants = await Consultant.find().select("fullName _id");
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
    // CORRECCIÓN: Usamos getCdnUrl para el avatar y el logo
    const avatar = req.files?.avatar?.[0] ? getCdnUrl(req.files.avatar[0]) : "";
    const companyUnitLogo = req.files?.companyUnitLogo?.[0]
      ? getCdnUrl(req.files.companyUnitLogo[0])
      : "";

    let offices = [];
    if (req.body.offices) {
      if (typeof req.body.offices === "string") {
        try {
          const parsed = JSON.parse(req.body.offices);
          if (Array.isArray(parsed)) offices = parsed;
          else offices = [parsed];
        } catch (e) {
          offices = req.body.offices
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } else if (Array.isArray(req.body.offices)) {
        offices = req.body.offices;
      }
    } else {
      if (req.body.office1) offices.push(req.body.office1);
      if (req.body.office2) offices.push(req.body.office2);
    }

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
      offices,
      consultantComments: req.body.comments,
      role: req.body.role,
      showOnWeb: req.body.showOnWeb,
    });
    const consultantCreated = await newConsultant.save();

    revalidateWeb(["team"]).catch((err) =>
      console.error(
        "❌ Falló revalidación en background (consultantCreate):",
        err,
      ),
    );

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

    fieldsToUpdate.fullName = req.body.fullName;
    fieldsToUpdate.consultantToken = req.body.consultantToken;
    fieldsToUpdate.consultantMobileNumber = req.body.consultantMobileNumber;
    fieldsToUpdate.consultantPhoneNumber = req.body.consultantPhoneNumber;
    fieldsToUpdate.position = req.body.position;
    fieldsToUpdate.profession = req.body.profession;

    // CORRECCIÓN SINTÁCTICA: El bloque 'offices' estaba mal anidado en tu código original
    let offices = [];
    if (req.body.offices) {
      if (typeof req.body.offices === "string") {
        try {
          const parsed = JSON.parse(req.body.offices);
          if (Array.isArray(parsed)) {
            offices = parsed.map((s) => String(s).trim()).filter(Boolean);
          } else if (typeof parsed === "string") {
            offices = [parsed.trim()];
          }
        } catch (e) {
          offices = req.body.offices
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } else if (Array.isArray(req.body.offices)) {
        offices = req.body.offices.map((s) => String(s).trim()).filter(Boolean);
      }
    } else {
      if (req.body.office1) offices.push(String(req.body.office1).trim());
      if (req.body.office2) offices.push(String(req.body.office2).trim());
    }

    fieldsToUpdate.offices = offices;
    fieldsToUpdate.consultantComments = req.body.consultantComments || "";
    fieldsToUpdate.role = req.body.role;
    fieldsToUpdate.showOnWeb = req.body.showOnWeb;

    if (
      req.body.consultantEmail &&
      req.body.consultantEmail !== consultant.consultantEmail
    ) {
      const emailExists = await Consultant.findOne({
        consultantEmail: req.body.consultantEmail,
      });

      if (emailExists) {
        return res
          .status(409)
          .json({ message: "El correo electrónico ya está en uso" });
      }
      fieldsToUpdate.consultantEmail = req.body.consultantEmail;
    }

    if (req.body.consultantEmailSignZones) {
      const consultantEmailSignZones =
        typeof req.body.consultantEmailSignZones === "string"
          ? JSON.parse(req.body.consultantEmailSignZones)
          : req.body.consultantEmailSignZones;

      fieldsToUpdate.consultantEmailSignZones =
        consultant.consultantEmailSignZones || {};

      Object.keys(consultantEmailSignZones).forEach((priority) => {
        if (!fieldsToUpdate.consultantEmailSignZones[priority]) {
          fieldsToUpdate.consultantEmailSignZones[priority] = {};
        }
        Object.keys(consultantEmailSignZones[priority]).forEach((zoneKey) => {
          const zoneData = consultantEmailSignZones[priority][zoneKey];
          fieldsToUpdate.consultantEmailSignZones[priority][zoneKey] = {
            zoneId: zoneData.zoneId || zoneData._id,
            zone: zoneData.zone,
            name: zoneData.name,
            image: zoneData.image || "",
          };
        });
      });
    }

    if (req.files) {
      const { avatar, companyUnitLogo, ...backgroundImages } = req.files;

      const deletePromises = [];

      if (avatar) {
        if (consultant.avatar)
          deletePromises.push(deleteImage(consultant.avatar));
        // CORRECCIÓN: Usamos getCdnUrl
        fieldsToUpdate.avatar = getCdnUrl(avatar[0]);
      }

      if (companyUnitLogo) {
        if (consultant.companyUnitLogo)
          deletePromises.push(deleteImage(consultant.companyUnitLogo));
        // CORRECCIÓN: Usamos getCdnUrl
        fieldsToUpdate.companyUnitLogo = getCdnUrl(companyUnitLogo[0]);
      }

      if (deletePromises.length > 0) {
        try {
          await Promise.all(deletePromises);
        } catch (e) {
          console.error(
            "Aviso: Falló el borrado de imágenes viejas (avatar/logo) del consultor:",
            e,
          );
        }
      }

      // Procesamiento dinámico de las firmas de email
      Object.keys(backgroundImages).forEach((key) => {
        const [priority, zoneKey] = key.split("_").slice(0, 2);

        if (!fieldsToUpdate.consultantEmailSignZones)
          fieldsToUpdate.consultantEmailSignZones = {};
        if (!fieldsToUpdate.consultantEmailSignZones[priority]) {
          fieldsToUpdate.consultantEmailSignZones[priority] = {};
        }
        if (!fieldsToUpdate.consultantEmailSignZones[priority][zoneKey]) {
          fieldsToUpdate.consultantEmailSignZones[priority][zoneKey] = {};
        }

        // CORRECCIÓN: Usamos getCdnUrl para las imágenes de las firmas
        fieldsToUpdate.consultantEmailSignZones[priority][zoneKey].image =
          getCdnUrl(backgroundImages[key][0]);
      });
    }

    if (
      req.body.consultantPassword &&
      req.body.consultantPassword !== consultant.consultantPassword
    ) {
      if (isValidPassword(req.body.consultantPassword) === false) {
        const error = new Error(
          "La contraseña debe contener al menos entre 8 y 16 carácteres, 1 mayúscula, 1 minúscula y 1 dígito",
        );
        error.status = 400;
        return next(error);
      }
      fieldsToUpdate.consultantPassword = await bcrypt.hash(
        req.body.consultantPassword,
        10,
      );
    }

    const updatedConsultant = await Consultant.findByIdAndUpdate(
      req.body.id,
      { $set: fieldsToUpdate },
      { new: true },
    );

    // Evitamos mutar el documento de Mongoose directamente. Convertimos a objeto plano o forzamos undefined
    if (updatedConsultant) {
      updatedConsultant.consultantPassword = undefined;
    }

    revalidateWeb(["team"]).catch((err) =>
      console.error(
        "❌ Falló revalidación en background (consultantUpdate):",
        err,
      ),
    );

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
      return res.status(400).json({
        message: "La imagen enviada no coincide con la base de datos",
      });
    }

    // CORRECCIÓN: Borramos de S3, pero si falla, al menos limpiamos la BD.
    try {
      await deleteImage(imageToDelete);
    } catch (e) {
      console.error(
        "Aviso: S3 falló al borrar la imagen de firma del consultor, procediendo en BD.",
        e,
      );
    }

    consultant.set(imageField, "");
    await consultant.save();

    res.status(200).json({ message: "Imagen eliminada correctamente" });
  } catch (err) {
    next(err);
  }
};

const consultantDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultantToDelete = await Consultant.findById(id);

    if (!consultantToDelete) {
      return res.status(404).json("No se ha podido encontrar este consultor.");
    }

    const imagesToClean = [];

    // 1. Borramos Avatar y Logo
    if (consultantToDelete.avatar)
      imagesToClean.push(consultantToDelete.avatar);
    if (consultantToDelete.companyUnitLogo)
      imagesToClean.push(consultantToDelete.companyUnitLogo);

    // 2. Borramos las imágenes de las firmas de email (que están anidadas)
    if (consultantToDelete.consultantEmailSignZones) {
      const zones = consultantToDelete.consultantEmailSignZones;
      // Recorremos las prioridades (high, medium, low)
      Object.keys(zones).forEach((priority) => {
        if (typeof zones[priority] === "object") {
          // Recorremos las zonas dentro de cada prioridad (zone1, zone2...)
          Object.keys(zones[priority]).forEach((zoneKey) => {
            const img = zones[priority][zoneKey]?.image;
            if (img) imagesToClean.push(img);
          });
        }
      });
    }

    // Ejecutamos el borrado masivo en S3
    if (imagesToClean.length > 0) {
      try {
        await Promise.allSettled(imagesToClean.map((img) => deleteImage(img)));
      } catch (e) {
        console.error(
          "Aviso: Error limpiando imágenes de S3 al borrar el consultor",
          e,
        );
      }
    }

    await Consultant.findByIdAndDelete(id);

    revalidateWeb(["team"]).catch((err) =>
      console.error(
        "❌ Falló revalidación en background (consultantDelete):",
        err,
      ),
    );

    return res.status(200).json("Consultor borrado de la base de datos");
  } catch (error) {
    next(error);
  }
};

const getConsultantTokenById = async (req, res, next) => {
  try {
    const consultant = await Consultant.findOne({
      consultantEmail: req.body.consultant?.consultantEmail,
    });

    if (
      consultant !== null &&
      consultant.consultantToken !== undefined &&
      consultant.consultantToken !== ""
    ) {
      req.consultantToken = consultant.consultantToken;
      req.offices = consultant.offices;

      return next();
    } else {
      res.status(404).json({ message: "Error al recoger datos del consultor" });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  consultantGetAll,
  consultantGetOne,
  consultantUpdate,
  deleteConsultantImage,
  consultantCreate,
  consultantDelete,
  getConsultantTokenById,
  consultantGetNameAndIds,
};
