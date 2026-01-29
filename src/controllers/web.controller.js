const { deleteImage } = require("../middlewares/file.middleware");
const Ad = require("../models/ad.model");
const WebHome = require("../models/webHome.model");
const Consultant = require("../models/consultant.model");
const { revalidateWeb } = require("../utils/revalidateWeb");

const webHomeGet = async (req, res, next) => {
  try {
    const webDocs = await WebHome.find().populate({
      path: "videoSection.videos.adId",
      select: "adStatus showOnWeb gvOperationClose slug",
    });

    if (!webDocs || webDocs.length === 0) {
      return res.status(200).json([]);
    }

    const webHomeDoc = webDocs[0];
    const originalVideoCount = webHomeDoc.videoSection.videos.length;

    // Filtramos los videos cuyo anuncio original ya no cumple los requisitos
    const validVideos = webHomeDoc.videoSection.videos.filter((video) => {
      const ad = video.adId; // Esto es un objeto completo gracias al populate

      // a. Si el anuncio fue borrado de la BD
      if (!ad) return false;

      // b. Filtro de Estado (Activo o En preparación)
      const validStatuses = ["Activo", "En preparación"];
      if (!validStatuses.includes(ad.adStatus)) return false;

      // c. Si está marcado para no mostrarse en web
      if (!ad.showOnWeb) return false;

      // d. Si la operación está cerrada (Vendido o Alquilado)
      if (ad.gvOperationClose && ad.gvOperationClose !== "") return false;

      return true;
    });

    // Si la cantidad cambió, guardamos el documento limpio
    if (validVideos.length !== originalVideoCount) {
      webHomeDoc.videoSection.videos = validVideos;
      await webHomeDoc.save();
    }

    // Convertimos a objeto plano JS para manipularlo sin afectar a Mongoose
    let webData = webHomeDoc.toObject();

    // Recreamos el objeto a enviar
    if (webData.videoSection && webData.videoSection.videos) {
      webData.videoSection.videos = webData.videoSection.videos.map((video) => {
        const adObject = video.adId;

        // Si por alguna razón adObject es null (caso raro post-filtro), protegemos el código
        if (!adObject) return video;

        return {
          ...video,
          slug: adObject.slug,
          adId: adObject._id.toString(),
        };
      });
    }

    // Filtro para contar propiedades (incluye 'En preparación' para ser consistente)
    const activeFilter = {
      adStatus: { $in: ["Activo", "En preparación"] },
      showOnWeb: true,
    };

    // Obtenemos nombres de ciudades dinámicamente desde la config de la home
    const city1 = webData.categoriesSection?.location1?.title || "Madrid";
    const city2 = webData.categoriesSection?.location2?.title || "Marbella";
    const city3 = webData.categoriesSection?.location3?.title || "Sotogrande";
    const city4 =
      webData.categoriesSection?.location4?.title || "Puerto de Santa María";

    // Ejecutamos todos los conteos en paralelo (más rápido)
    const [
      countResidential,
      countPatrimonial,
      countOthers,
      countLocation1,
      countLocation2,
      countLocation3,
      countLocation4,
    ] = await Promise.all([
      Ad.countDocuments({ ...activeFilter, department: "Residencial" }),
      Ad.countDocuments({ ...activeFilter, department: "Patrimonio" }),
      Ad.countDocuments({ ...activeFilter, department: "Otros" }),
      Ad.countDocuments({
        ...activeFilter,
        "adDirection.city": { $regex: new RegExp(`^${city1}$`, "i") },
      }),
      Ad.countDocuments({
        ...activeFilter,
        "adDirection.city": { $regex: new RegExp(`^${city2}$`, "i") },
      }),
      Ad.countDocuments({
        ...activeFilter,
        "adDirection.city": { $regex: new RegExp(`^${city3}$`, "i") },
      }),
      Ad.countDocuments({
        ...activeFilter,
        "adDirection.city": { $regex: new RegExp(`^${city4}$`, "i") },
      }),
    ]);

    if (webData.categoriesSection) {
      if (webData.categoriesSection.residential)
        webData.categoriesSection.residential.count = countResidential;
      if (webData.categoriesSection.patrimonial)
        webData.categoriesSection.patrimonial.count = countPatrimonial;
      if (webData.categoriesSection.others)
        webData.categoriesSection.others.count = countOthers;

      if (webData.categoriesSection.location1)
        webData.categoriesSection.location1.count = countLocation1;
      if (webData.categoriesSection.location2)
        webData.categoriesSection.location2.count = countLocation2;
      if (webData.categoriesSection.location3)
        webData.categoriesSection.location3.count = countLocation3;
      if (webData.categoriesSection.location4)
        webData.categoriesSection.location4.count = countLocation4;
    }

    return res.status(200).json([webData]);
  } catch (err) {
    console.error("Error obteniendo datos de home:", err);
    return next(err);
  }
};

const webHomeCreate = async (req, res, next) => {
  try {
    const newWebHome = new WebHome({
      mainTitle: req.body.mainTitle,
      mainSubtitle: req.body.mainSubtitle,
      portraidImage: req.file.location,
    });
    const webHomeCreated = await newWebHome.save();
    return res.status(200).json(webHomeCreated);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webHomeEdit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    // console.log(req.file);
    webHomeToUpdate.mainTitle = req.body.mainTitle;
    webHomeToUpdate.mainSubtitle = req.body.mainSubtitle;
    if (req.file?.bucket) {
      deleteImage(webHomeToUpdate.portraidImage);
      webHomeToUpdate.portraidImage = req.file.location;
    }
    const updatedWebHome = await WebHome.findByIdAndUpdate(
      id,
      webHomeToUpdate,
      { new: true },
    );
    return res.status(200).json(updatedWebHome);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

// const webVideoSectionUpload = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     const webHome = await WebHome.findById(id);

//     if (!webHome) {
//       return res.status(404).json({ message: "WebHome no encontrado" });
//     }

//     const webHomeToUpdate = webHome;

//     // 2. Actualizamos el Título (si viene en el body)
//     // Usamos el operador ternario o if para no borrar el título si no se envía nada
//     if (req.body.title) {
//       webHomeToUpdate.videoSection.title = req.body.title;
//     }

//     if (req.body.subtitle) {
//       webHomeToUpdate.videoSection.subtitle = req.body.subtitle;
//     }

//     // 3. Gestión de los Videos (req.files es un ARRAY)
//     if (req.files && req.files.length > 0) {
//       // A) LIMPIEZA: Si ya había videos antes, los borramos de la nube para no acumular basura
//       if (
//         webHomeToUpdate.videoSection.videos &&
//         webHomeToUpdate.videoSection.videos.length > 0
//       ) {
//         // Recorremos el array de videos viejos y los borramos uno a uno
//         webHomeToUpdate.videoSection.videos.forEach((videoUrl) => {
//           deleteImage(videoUrl);
//         });
//       }

//       // B) GUARDADO: Mapeamos los archivos nuevos para sacar sus URLs (location)
//       // req.files devuelve un array de objetos, queremos un array de strings (urls)
//       const newVideoUrls = req.files.map((file) => file.location);

//       // Asignamos el nuevo array al modelo
//       webHomeToUpdate.videoSection.videos = newVideoUrls;
//     }

//     // 4. Guardamos en Base de Datos
//     const updatedWebHome = await WebHome.findByIdAndUpdate(
//       id,
//       webHomeToUpdate,
//       { new: true },
//     );

//     return res.status(200).json(updatedWebHome);
//   } catch (err) {
//     console.log(err);
//     return next(err);
//   }
// };

const webVideoSectionUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Buscamos el documento WebHome
    const webHome = await WebHome.findById(id);

    if (!webHome) {
      return res.status(404).json({ message: "WebHome no encontrado" });
    }

    const webHomeToUpdate = webHome;

    // 2. Actualizamos Título y Subtítulo de la sección (si vienen)
    if (req.body.title) webHomeToUpdate.videoSection.title = req.body.title;
    if (req.body.subtitle)
      webHomeToUpdate.videoSection.subtitle = req.body.subtitle;

    // 3. Gestión de Anuncios Seleccionados (Lógica Principal)
    // Esperamos un array de IDs de anuncios en el body, ej: req.body.selectedAdIds
    if (
      req.body.selectedAdIds &&
      Array.isArray(req.body.selectedAdIds) &&
      req.body.selectedAdIds.length > 0
    ) {
      // A) Buscamos los anuncios en la base de datos
      const foundAds = await Ad.find({
        _id: { $in: req.body.selectedAdIds },
      }).select("title adReference adType sale rent images");

      // B) Mapeamos los anuncios encontrados al formato que necesita el WebHome
      // Nota: Hacemos un map sobre los IDs recibidos para mantener el ORDEN que el usuario eligió en el front
      const newVideoCollection = req.body.selectedAdIds
        .map((adId) => {
          const ad = foundAds.find((a) => a._id.toString() === adId);

          if (!ad) return null; // Si por alguna razón el ID no existe, lo saltamos

          // Lógica de Precios (Venta, Alquiler o Ambos)
          let priceObj = { sale: null, rent: null, label: "" };
          let labels = [];

          // Verificar si es venta y tiene precio
          if (ad.adType.includes("Venta") && ad.sale && ad.sale.saleValue) {
            priceObj.sale = ad.sale.saleValue;
            labels.push("Venta");
          }

          // Verificar si es alquiler y tiene precio
          if (ad.adType.includes("Alquiler") && ad.rent && ad.rent.rentValue) {
            priceObj.rent = ad.rent.rentValue;
            labels.push("Alquiler");
          }

          priceObj.label = labels.join(" / "); // Ej: "Venta / Alquiler" o solo "Venta"

          // Retornamos el objeto estructurado para WebHome
          return {
            adId: ad._id,
            videoUrl: ad.images?.media || "", // El video del anuncio
            title: ad.title,
            adReference: ad.adReference,
            price: priceObj,
          };
        })
        .filter((item) => item !== null); // Eliminamos nulos si hubo IDs inválidos

      // C) Asignamos el nuevo array de objetos
      webHomeToUpdate.videoSection.videos = newVideoCollection;
    } else if (req.body.selectedAdIds && req.body.selectedAdIds.length === 0) {
      // Si nos envían un array vacío explícitamente, limpiamos la sección
      webHomeToUpdate.videoSection.videos = [];
    }

    // NOTA: He eliminado la lógica de 'deleteImage'.
    // Al ser videos vinculados a Anuncios, NO debemos borrarlos de la nube
    // solo porque se quiten de la Home. Pertenecen al inventario.

    // 4. Guardamos en Base de Datos
    const updatedWebHome = await webHomeToUpdate.save();
    // Usamos .save() suele disparar validaciones del schema mejor que findByIdAndUpdate

    // =====================================================================
    // 🔌 INTEGRACIÓN ISR MEJORADA (ACTUALIZACIÓN)
    // =====================================================================

    await revalidateWeb("home-data");
    // =====================================================================

    return res.status(200).json(updatedWebHome);
  } catch (err) {
    console.error("Error en webVideoSectionUpdate:", err);
    return next(err);
  }
};

const webResidentialCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.residential)
        deleteImage(webHomeToUpdate.categoriesImages.residential);
      webHomeToUpdate.categoriesImages.residential = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webPatrimonialCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.patrimonial)
        deleteImage(webHomeToUpdate.categoriesImages.patrimonial);
      webHomeToUpdate.categoriesImages.patrimonial = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webArtCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.art)
        deleteImage(webHomeToUpdate.categoriesImages.art);
      webHomeToUpdate.categoriesImages.art = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webCatalogCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.catalog)
        deleteImage(webHomeToUpdate.categoriesImages.catalog);
      webHomeToUpdate.categoriesImages.catalog = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webCoastCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.otherCategoriesImages.coast)
        deleteImage(webHomeToUpdate.otherCategoriesImages.coast);
      webHomeToUpdate.otherCategoriesImages.coast = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webRusticCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.otherCategoriesImages.rustic)
        deleteImage(webHomeToUpdate.otherCategoriesImages.rustic);
      webHomeToUpdate.otherCategoriesImages.rustic = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webSingularCategoryImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.otherCategoriesImages.singular)
        deleteImage(webHomeToUpdate.otherCategoriesImages.singular);
      webHomeToUpdate.otherCategoriesImages.singular = req.file.location;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webInteriorismTextAndImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.sections.interiorims.image)
          deleteImage(webHomeToUpdate.sections.interiorims.image);
        webHomeToUpdate.sections.interiorims.image = req.file.location;
      }
      webHomeToUpdate.sections.interiorims.title = req.body.title;
      webHomeToUpdate.sections.interiorims.buttonText = req.body.buttonText;
      webHomeToUpdate.sections.interiorims.description = req.body.description;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webSellTextAndImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.sections.sell.image)
          deleteImage(webHomeToUpdate.sections.sell.image);
        webHomeToUpdate.sections.sell.image = req.file.location;
      }
      webHomeToUpdate.sections.sell.title = req.body.title;
      webHomeToUpdate.sections.sell.buttonText = req.body.buttonText;
      webHomeToUpdate.sections.sell.description = req.body.description;
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webOfficeTextAndImageUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.sections.offices.image)
          deleteImage(webHomeToUpdate.sections.offices.image);
        webHomeToUpdate.sections.offices.image = req.file.location;
      }
      webHomeToUpdate.sections.offices.title = req.body.title;
      webHomeToUpdate.sections.offices.buttonText = req.body.buttonText;
      webHomeToUpdate.sections.offices.description = req.body.description;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webHomeTalkWithUs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.talkWithUs.contactImage)
          deleteImage(webHomeToUpdate.talkWithUs.contactImage);
        webHomeToUpdate.talkWithUs.contactImage = req.file.location;
      }
      webHomeToUpdate.talkWithUs.titleHome = req.body.titleHome;
      webHomeToUpdate.talkWithUs.titleContact = req.body.titleContact;

      // Preserve old directions to detect changes and update consultant offices
      const oldDirections = Array.isArray(webHomeToUpdate.talkWithUs.directions)
        ? webHomeToUpdate.talkWithUs.directions
        : [];

      // Normalize incoming directions into an array
      let newDirections = req.body.directions;
      if (typeof newDirections === "string") {
        try {
          newDirections = JSON.parse(newDirections);
        } catch (e) {
          // fallback: split by comma
          newDirections = newDirections.split(",").map((s) => s.trim());
        }
      }
      newDirections = Array.isArray(newDirections) ? newDirections : [];

      webHomeToUpdate.talkWithUs.directions = newDirections;

      webHomeToUpdate.talkWithUs.phones = req.body.phones;
      webHomeToUpdate.talkWithUs.email = req.body.email;
      webHomeToUpdate.talkWithUs.contactButton = req.body.contactButton;
      webHomeToUpdate.talkWithUs.descriptionContact =
        req.body.descriptionContact;

      // Build replacements map by comparing old/new by index. If an entry changed,
      // update consultant.offices entries that equal the old string and replace with the new string.
      const maxLen = Math.max(oldDirections.length, newDirections.length);
      const replacements = [];
      for (let i = 0; i < maxLen; i++) {
        const oldDir = oldDirections[i];
        const newDir = newDirections[i];
        if (oldDir && newDir && oldDir !== newDir) {
          replacements.push({ from: oldDir, to: newDir });
        }
      }

      if (replacements.length > 0) {
        // Try to run atomic updateMany operations with arrayFilters. If that fails,
        // fall back to read-modify-write per consultant.
        try {
          for (const { from, to } of replacements) {
            // Use updateMany with arrayFilters to replace matching array elements
            await Consultant.updateMany(
              { offices: from },
              { $set: { "offices.$[elem]": to } },
              { arrayFilters: [{ elem: from }] },
            );
          }
        } catch (errUpdate) {
          console.error(
            "Atomic consultant offices update failed, falling back:",
            errUpdate,
          );
          try {
            for (const { from, to } of replacements) {
              const consultants = await Consultant.find({ offices: from });
              for (const consultant of consultants) {
                const updatedOffices = (consultant.offices || []).map((o) =>
                  o === from ? to : o,
                );
                consultant.offices = updatedOffices;
                await consultant.save();
              }
            }
          } catch (errFallback) {
            console.error(
              "Fallback update of consultant offices failed:",
              errFallback,
            );
          }
        }

        // Remove any office strings that are not present in the new directions
        try {
          if (Array.isArray(newDirections)) {
            // atomic removal using $pull with $nin
            await Consultant.updateMany(
              { offices: { $elemMatch: { $nin: newDirections } } },
              { $pull: { offices: { $nin: newDirections } } },
            );
          }
        } catch (errPull) {
          console.error(
            "Atomic removal of non-matching offices failed, falling back:",
            errPull,
          );
          try {
            // fallback: read-modify-write
            const consultantsToFix = await Consultant.find({
              offices: { $elemMatch: { $nin: newDirections } },
            });
            for (const c of consultantsToFix) {
              const filtered = (c.offices || []).filter((o) =>
                newDirections.includes(o),
              );
              c.offices = filtered;
              await c.save();
            }
          } catch (errFallbackPull) {
            console.error(
              "Fallback filtering of consultant offices failed:",
              errFallbackPull,
            );
          }
        }
      }
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se ha adjuntado un cuerpo en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webDevelopmentServicesUpload = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.services.development.image)
          deleteImage(webHomeToUpdate.services.development.image);
        webHomeToUpdate.services.development.image = req.file.location;
      }
      webHomeToUpdate.services.development.title = req.body.title;
      webHomeToUpdate.services.development.description = req.body.description;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webInvestmentServicesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      webHomeToUpdate.services.investment.title = req.body.title;
      webHomeToUpdate.services.investment.description = req.body.description;
      webHomeToUpdate.services.investment.investmentSections =
        req.body.investmentSections;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webAssetManagementServicesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;

    if (webHome) {
      webHomeToUpdate.services.assetManagement.title = req.body.title;
      webHomeToUpdate.services.assetManagement.description1 =
        req.body.description1;
      webHomeToUpdate.services.assetManagement.description2 =
        req.body.description2;
      webHomeToUpdate.services.assetManagement.description3 =
        req.body.description3;
      webHomeToUpdate.services.assetManagement.description4 =
        req.body.description4;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );

      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webCommercializationServicesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;

    if (webHome) {
      webHomeToUpdate.services.commercialization.title = req.body.title;
      webHomeToUpdate.services.commercialization.description1 =
        req.body.description1;
      webHomeToUpdate.services.commercialization.description2 =
        req.body.description2;
      webHomeToUpdate.services.commercialization.commerSections =
        req.body.commerSections;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );

      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const webInteriorismServicesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.services.interiorims.image)
          deleteImage(webHomeToUpdate.services.interiorims.image);
        webHomeToUpdate.services.interiorims.image = req.file.location;
      }
      webHomeToUpdate.services.interiorims.title = req.body.title;
      webHomeToUpdate.services.interiorims.description = req.body.description;

      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const getAdsByReference = async (req, res, next) => {
  try {
    const { ref } = req.query;

    if (!ref) return res.json([]);

    const ads = await Ad.find({
      // 1. Coincidencia por referencia
      adReference: { $regex: ref, $options: "i" },

      // 2. FILTRO DE ESTADO: Solo activos o en preparación
      adStatus: { $in: ["Activo", "En preparación"] },

      // 3. FILTRO DE VISUALIZACIÓN EN WEB: Que estén marcados para visualizar en la web.
      showOnWeb: { $in: true },

      // 4. FILTRO DE OPERACIÓN: Que no estén vendidos o alquilados
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },

      // 5. TIENE QUE TENER VIDEO
      // Verificamos que 'images.media' exista, no sea nulo y no sea una cadena vacía
      "images.media": { $exists: true, $nin: ["", null] },
    })
      .select("adReference title _id")
      .limit(10);

    return res.json(ads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error buscando anuncios" });
  }
};

const updateCategoriesSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, subtitle, key } = req.body;
    const file = req.file;

    // 1. Validación de seguridad
    if (!key) {
      return res
        .status(400)
        .json({ message: "Falta la clave (key) de la sección a editar" });
    }

    const webHome = await WebHome.findById(id);
    if (!webHome) {
      return res.status(404).json({ message: "WebHome no encontrado" });
    }

    // 2. Aseguramos que la estructura existe en el objeto
    // (Esto evita errores de "Cannot read property of undefined")
    if (!webHome.categoriesSection) {
      webHome.categoriesSection = {};
    }
    if (!webHome.categoriesSection[key]) {
      webHome.categoriesSection[key] = {};
    }

    // 3. Actualizamos el Título (solo si viene en el body)
    if (title) {
      webHome.categoriesSection[key].title = title;
    }

    if (subtitle) {
      webHome.categoriesSection[key].subtitle = subtitle;
    }

    // 4. Actualizamos la Imagen (solo si viene un archivo nuevo)
    if (file) {
      // A) LIMPIEZA: Obtenemos la imagen antigua
      const oldImageUrl = webHome.categoriesSection[key].image;

      // Si existe una imagen antigua, la borramos de la nube
      if (oldImageUrl) {
        // Lógica idéntica a tu videoSection
        deleteImage(oldImageUrl);
      }

      // B) GUARDADO: Asignamos la nueva URL de DigitalOcean/S3
      // Usamos .location porque así lo tienes configurado en tu Multer S3
      webHome.categoriesSection[key].image = file.location;
    }

    // 5. Forzamos a Mongoose a detectar el cambio
    // Al modificar propiedades dentro de un objeto anidado (Mixed),
    // a veces Mongoose no se entera. Esto lo asegura.
    webHome.markModified("categoriesSection");

    const updatedWebHome = await webHome.save();

    return res.status(200).json(updatedWebHome);
  } catch (err) {
    console.error("Error en updateCategoriesSection:", err);
    return next(err);
  }
};

const getMapData = async (req, res, next) => {
  try {
    const { department } = req.query;

    const targetDepartment = department || "Residencial";

    const distritosQuery = Ad.aggregate([
      {
        $match: {
          adStatus: "Activo",
          department: targetDepartment,
          showOnWeb: true,
          distrito: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$distrito", count: { $sum: 1 } } },
    ]);

    const barriosQuery = Ad.aggregate([
      {
        $match: {
          adStatus: "Activo",
          department: targetDepartment,
          showOnWeb: true,
          barrio: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$barrio", count: { $sum: 1 } } },
    ]);

    const [distritosStats, barriosStats] = await Promise.all([
      distritosQuery,
      barriosQuery,
    ]);

    const distritosMap = distritosStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const barriosMap = barriosStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.status(200).json({
      distritos: distritosMap,
      barrios: barriosMap,
    });
  } catch (error) {
    console.error("Error en getMapData:", error);
    next(error);
  }
};

const getAdCardData = async (req, res, next) => {
  try {
    // 1. Recibimos el nuevo parámetro 'operation'
    const { department, adStatus, searchZone, operation } = req.query;

    // 2. Filtro de SEGURIDAD (Siempre showOnWeb: true)
    const filter = {
      showOnWeb: true,
    };

    // 3. Filtros opcionales básicos
    if (department) filter.department = department;
    if (adStatus) filter.adStatus = adStatus;

    // 4. LÓGICA VENTA / ALQUILER
    // Asumimos que en tu BD 'adType' es un string tipo "Venta de piso" o "Alquiler..."
    if (operation) {
      if (operation === "sale") {
        filter.adType = { $regex: "Venta", $options: "i" };
      } else if (operation === "rent") {
        filter.adType = { $regex: "Alquiler", $options: "i" };
      }
    }

    // 5. Filtro de Zona (Barrio o Distrito)
    if (searchZone && searchZone !== "Madrid") {
      filter.$or = [
        { distrito: { $regex: searchZone, $options: "i" } },
        { barrio: { $regex: searchZone, $options: "i" } },
      ];
    }

    // Campos a seleccionar (optimización)
    const fieldsToSelect = [
      "_id",
      "title",
      "slug",
      "adType",
      "sale",
      "rent",
      "monthlyRent",
      "barrio",
      "distrito",
      "images.main",
      "adBuildingType",
      "buildSurface",
      "plotSurface",
      "quality.bedrooms",
      "quality.bathrooms",
      "quality.parking",
      "quality.reformed",
      "quality.swimmingPool",
      "quality.others.terrace",
      "quality.others.swimmingPool",
    ];

    const ads = await Ad.find(filter).select(fieldsToSelect.join(" ")).lean();

    res.status(200).json(ads);
  } catch (error) {
    console.error("Error obteniendo activos:", error);
    next(error);
  }
};

const getHighlightAds = async (req, res, next) => {
  try {
    // 1. Buscamos solo los destacados
    // SUGERENCIA: Usa .select() para traer solo los campos necesarios de la BD (optimización)
    const ads = await Ad.find({ featuredOnMain: true }).select(
      "title slug adType sale rent adDirection images features newDevelopment exclusive",
    );

    // 2. Mapeamos los resultados para ajustarlos a la interfaz 'Property'
    const formattedAds = ads.map((ad) => {
      // --- LÓGICA DE PRECIO Y OPERACIÓN ---
      // Determinamos si mostramos precio de Venta o de Alquiler.
      // Prioridad habitual: Si tiene precio de venta, mostramos venta.
      let currentPrice = 0;
      let operationLabel = "";

      if (ad.sale && ad.sale.saleValue) {
        currentPrice = ad.sale.saleValue;
        operationLabel = "Venta";
      } else if (ad.rent && ad.rent.rentValue) {
        currentPrice = ad.rent.rentValue;
        operationLabel = "Alquiler";
      }

      // --- LÓGICA DE TAGS ---
      // Creamos los tags dinámicamente según los booleanos del anuncio
      const tags = [];
      if (ad.exclusive) tags.push("Exclusiva");
      if (ad.newDevelopment) tags.push("Obra Nueva");

      return {
        id: ad._id.toString(),
        slug: ad.slug,
        title: ad.title,
        price: currentPrice,
        operation: operationLabel,
        location: ad.adDirection?.city || "Ubicación desconocida",
        image: ad.images?.main || "",
        specs: {
          beds: ad.quality?.bedrooms || 0,
          area: ad.buildSurface || ad.plotSurface,
          bathrooms: ad.quality?.bathrooms || 0,
        },

        tags: tags,
      };
    });

    res.status(200).json(formattedAds);
  } catch (error) {
    console.error("Error obteniendo activos destacados:", error);
    // Es buena práctica pasar el error al middleware de express
    next(error);
  }
};

const getAdDetails = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return res.status(400).json({ message: "Falta el slug del inmueble" });
    }

    // 1. Búsqueda con filtros de visibilidad y estado de operación
    const ad = await Ad.findOne({
      slug: slug,
      showOnWeb: true,
      adStatus: { $in: ["Activo", "En preparación"] },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    });

    if (!ad) {
      return res.status(404).json({ message: "Inmueble no encontrado" });
    }

    // 2. Lógica de Precios Dual (Venta / Alquiler)
    const salePrice = ad.sale?.saleShowOnWeb ? ad.sale.saleValue : null;
    const rentPrice = ad.rent?.rentShowOnWeb ? ad.rent.rentValue : null;

    let priceLabel = "";
    let period = "";

    if (salePrice && rentPrice) {
      priceLabel = "Venta y Alquiler";
      period = "mes";
    } else if (salePrice) {
      priceLabel = "Venta";
    } else if (rentPrice) {
      priceLabel = "Alquiler";
      period = "mes";
    } else {
      priceLabel = "Consultar";
    }

    // 3. Unificación de Galería de Imágenes
    let gallery = [];
    if (ad.images?.main) gallery.push(ad.images.main);
    if (ad.images?.others && Array.isArray(ad.images.others)) {
      gallery = [...gallery, ...ad.images.others];
    }

    // 4. Mapeo de Características (Sin 'garden')
    const featuresList = {
      pool:
        ad.quality?.others?.swimmingPool ||
        ad.quality?.indoorPool > 0 ||
        ad.quality?.outdoorPool > 0,
      terrace: ad.quality?.others?.terrace || false,
      garage: ad.quality?.garage > 0 || ad.quality?.others?.garage,
      airConditioning: ad.quality?.others?.airConditioning || false,
      heating:
        ad.quality?.others?.centralHeating ||
        ad.quality?.others?.subfloorHeating,
      lift: ad.quality?.others?.lift || false,
      storage: ad.quality?.others?.storage || false,
    };

    // 5. Construcción del objeto final (PropertyDetail)
    const propertyDetail = {
      id: ad._id,
      slug: ad.slug,
      title: ad.title,
      reference: ad.adReference,
      description: ad.description?.web || "Sin descripción disponible.",

      // Precios independientes para el Front
      salePrice: salePrice,
      rentPrice: rentPrice,
      priceLabel: priceLabel,
      period: period,

      location: {
        city: ad.adDirection?.city || "",
        district: ad.distrito || "",
        neighborhood: ad.barrio || "",
        address: ad.adDirection?.address?.street || "",
        coordinates: null, // No se utilizan de momento
      },

      specs: {
        beds: ad.quality?.bedrooms || 0,
        baths: ad.quality?.bathrooms || 0,
        area: ad.buildSurface || 0,
        plot: ad.plotSurface || 0,
        year: ad.buildingYear,
        floor: ad.floor || "",
      },

      features: featuresList,
      images: gallery,
      mainImage: ad.images?.main || "",
      surfacesBox: ad.surfacesBox || [],
      tags: [],
    };

    // 6. Tags dinámicos basados en el tipo y calidades
    if (ad.adBuildingType && ad.adBuildingType.length > 0)
      propertyDetail.tags.push(ad.adBuildingType[0]);
    if (ad.quality?.reformed) propertyDetail.tags.push("Reformado");
    if (ad.quality?.toReform) propertyDetail.tags.push("A reformar");

    return res.status(200).json(propertyDetail);
  } catch (error) {
    console.error("Error obteniendo detalle del anuncio:", error);
    return next(error);
  }
};

module.exports = {
  webHomeGet,
  webHomeCreate,
  webHomeEdit,
  webResidentialCategoryImageUpload,
  webPatrimonialCategoryImageUpload,
  webCommercializationServicesUpload,
  webArtCategoryImageUpload,
  webCatalogCategoryImageUpload,
  webInvestmentServicesUpload,
  webAssetManagementServicesUpload,
  webCoastCategoryImageUpload,
  webRusticCategoryImageUpload,
  webSingularCategoryImageUpload,
  webInteriorismTextAndImageUpload,
  webSellTextAndImageUpload,
  webOfficeTextAndImageUpload,
  webHomeTalkWithUs,
  webDevelopmentServicesUpload,
  webInteriorismServicesUpload,
  webVideoSectionUpdate,
  getAdsByReference,
  updateCategoriesSection,
  getMapData,
  getAdCardData,
  getHighlightAds,
  getAdDetails,
};
