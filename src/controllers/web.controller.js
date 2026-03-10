const { deleteImage } = require("../middlewares/file.middleware");
const Ad = require("../models/ad.model");
const WebHome = require("../models/webHome.model");
const Consultant = require("../models/consultant.model");
const Zone = require("../models/zone.model");
const { revalidateWeb } = require("../utils/revalidateWeb");

const webHomeGet = async (req, res, next) => {
  try {
    // Populamos solo para comprobaciones de seguridad
    const webDocs = await WebHome.find().populate({
      path: "videoSection.videos.adId",
      select: "adStatus showOnWeb gvOperationClose",
    });

    if (!webDocs || webDocs.length === 0) return res.status(200).json([]);

    const webHomeDoc = webDocs[0];
    const initialCount = webHomeDoc.videoSection.videos.length;

    // 1. Limpieza automática de videos (Seguridad)
    const validVideos = webHomeDoc.videoSection.videos.filter((video) => {
      const ad = video.adId;
      if (!ad) return false;

      const isVisible = ad.showOnWeb;
      const isActive = ["Activo", "En preparación"].includes(ad.adStatus);
      const isNotClosed = !ad.gvOperationClose || ad.gvOperationClose === "";

      return isVisible && isActive && isNotClosed;
    });

    // Si algún video ya no es válido, guardamos la versión limpia
    if (validVideos.length !== initialCount) {
      webHomeDoc.videoSection.videos = validVideos;
      await webHomeDoc.save();
    }

    // Convertimos a objeto plano para los conteos dinámicos
    const webData = webHomeDoc.toObject();

    // 2. Conteos dinámicos para las categorías de la Home
    const activeFilter = {
      adStatus: { $in: ["Activo", "En preparación"] },
      showOnWeb: true,
    };
    const cities = [
      webData.categoriesSection?.location1?.title || "Madrid",
      webData.categoriesSection?.location2?.title || "Marbella",
      webData.categoriesSection?.location3?.title || "Sotogrande",
      webData.categoriesSection?.location4?.title || "Puerto de Santa María",
    ];

    const counts = await Promise.all([
      Ad.countDocuments({ ...activeFilter, department: "Residencial" }),
      Ad.countDocuments({ ...activeFilter, department: "Patrimonio" }),
      Ad.countDocuments({ ...activeFilter, department: "Otros" }),
      ...cities.map((city) =>
        Ad.countDocuments({
          ...activeFilter,
          "adDirection.city": { $regex: new RegExp(`^${city}$`, "i") },
        }),
      ),
    ]);

    // Asignación de conteos al objeto de respuesta
    const sections = [
      "residential",
      "patrimonial",
      "others",
      "location1",
      "location2",
      "location3",
      "location4",
    ];
    sections.forEach((section, index) => {
      if (webData.categoriesSection[section]) {
        webData.categoriesSection[section].count = counts[index];
      }
    });

    // 🚀 La respuesta ya incluye el 'slug' en cada video porque se guardó en el Update
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
    const webHome = await WebHome.findById(id);

    if (!webHome) {
      return res.status(404).json({ message: "WebHome no encontrado" });
    }

    // Actualización de textos básicos
    if (req.body.title) webHome.videoSection.title = req.body.title;
    if (req.body.subtitle) webHome.videoSection.subtitle = req.body.subtitle;

    // Gestión de Colección de Videos
    if (req.body.selectedAdIds && Array.isArray(req.body.selectedAdIds)) {
      if (req.body.selectedAdIds.length > 0) {
        // Buscamos anuncios incluyendo el SLUG
        const foundAds = await Ad.find({
          _id: { $in: req.body.selectedAdIds },
        }).select("title adReference adType sale rent images slug");

        const newVideoCollection = req.body.selectedAdIds
          .map((adId) => {
            const ad = foundAds.find((a) => a._id.toString() === adId);
            if (!ad) return null;

            // Lógica de Precios Dual
            let priceObj = { sale: null, rent: null, label: "" };
            let labels = [];

            if (ad.adType.includes("Venta") && ad.sale?.saleValue) {
              priceObj.sale = ad.sale.saleValue;
              labels.push("Venta");
            }
            if (ad.adType.includes("Alquiler") && ad.rent?.rentValue) {
              priceObj.rent = ad.rent.rentValue;
              labels.push("Alquiler");
            }
            priceObj.label = labels.join(" / ");

            return {
              adId: ad._id,
              videoUrl: ad.images?.media || "",
              title: ad.title,
              slug: ad.slug,
              adReference: ad.adReference,
              price: priceObj,
            };
          })
          .filter(Boolean);

        webHome.videoSection.videos = newVideoCollection;
      } else {
        webHome.videoSection.videos = [];
      }
    }

    const updatedWebHome = await webHome.save();

    // Revalidación para Next.js
    await revalidateWeb("home-data");

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

const getFilteredAds = async (req, res, next) => {
  try {
    // ---------------------------------------------------------
    // 1. PAGINACIÓN Y PARÁMETROS
    // ---------------------------------------------------------
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const {
      department,
      searchZone,
      operation,
      propertyType,
      pool,
      garage,
      terrace,
      maxPrice,
      maxSurface,
    } = req.query;

    // ---------------------------------------------------------
    // 2. LÓGICA DE RE-ASIGNACIÓN DE DEPARTAMENTO (REFINADA)
    // ---------------------------------------------------------
    let targetDepartment = department;

    // Si recibimos "Residencial" desde la web, verificamos la zona para mapear a "Costa"
    if (department === "Residencial" && searchZone) {
      const normalizedZone = searchZone.toLowerCase();

      // Puerto de Santa María, Marbella y Sotogrande están en el departamento "Costa"
      const costaZones = ["marbella", "sotogrande", "puerto santa maria"];

      const isCosta = costaZones.some((zone) => normalizedZone.includes(zone));

      if (isCosta) {
        targetDepartment = "Costa";
      } else {
        // Madrid y otras zonas residenciales puras se mantienen en "Residencial"
        targetDepartment = "Residencial";
      }
    }

    // ---------------------------------------------------------
    // 2. CONFIGURACIÓN DEL FILTRO BASE (DEBE DEFINIRSE ANTES)
    // ---------------------------------------------------------
    const filter = {
      showOnWeb: true,
      department: targetDepartment,
      adStatus: { $in: ["Activo", "En preparación"] },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    };

    // ---------------------------------------------------------
    // 3. FILTROS DINÁMICOS
    // ---------------------------------------------------------

    // Filtro de Operación (Venta / Alquiler) y Precio Máximo
    if (operation) {
      const isSale = operation === "sale";
      filter.adType = { $in: [isSale ? "Venta" : "Alquiler"] };

      const priceField = isSale ? "sale.saleValue" : "rent.rentValue";
      filter[priceField] = { $exists: true, $ne: null };

      if (maxPrice) {
        filter[priceField].$lte = Number(maxPrice);
      }
    }

    // Filtro de Tipo de Inmueble (ignora "Todos")
    if (propertyType && propertyType !== "Todos") {
      filter.adBuildingType = { $in: [propertyType] };
    }

    // Atributos de Calidad
    if (pool === "true") filter["quality.others.swimmingPool"] = true;
    if (garage === "true") filter["quality.parking"] = { $gt: 0 };
    if (terrace === "true") filter["quality.others.terrace"] = true;

    // Superficie Máxima
    if (maxSurface) {
      filter.buildSurface = { $lte: Number(maxSurface) };
    }

    // ---------------------------------------------------------
    // 4. LÓGICA MULTI-ZONA AVANZADA
    // ---------------------------------------------------------
    if (searchZone) {
      const zonesArray = searchZone
        .split(",")
        .map((z) => z.trim().toLowerCase())
        .filter(Boolean);

      // Definimos los criterios de búsqueda en la colección Zone
      const zoneConditions = [];

      zonesArray.forEach((zoneTerm) => {
        // Caso A: Búsqueda por Ciudad/Subzona (Marbella, Sotogrande, etc.)
        if (zoneTerm.includes("marbella")) {
          zoneConditions.push({ subzone: "Marbella" });
        } else if (zoneTerm.includes("sotogrande")) {
          zoneConditions.push({ subzone: "Sotogrande" });
        } else if (zoneTerm.includes("puerto santa maria")) {
          zoneConditions.push({ subzone: "Puerto de Santa María" });
        } else if (zoneTerm.includes("madrid")) {
          // Madrid en el JSON no tiene subzona (es null)
          zoneConditions.push({
            zone: "Residencial",
            $or: [{ subzone: null }, { subzone: { $exists: false } }],
          });
        } else {
          // Caso B: Búsqueda por nombre de zona específica (ej: "Aravaca", "El Madroñal")
          const regex = new RegExp(zoneTerm.replace(/-/g, ".*"), "i");
          zoneConditions.push({ name: regex });
        }
      });

      // 1. Buscamos los IDs correspondientes en la colección Zone
      const matchingZones = await Zone.find({
        zone: targetDepartment,
        $or: zoneConditions,
      })
        .select("_id")
        .lean();

      const zoneIds = matchingZones.map((z) => z._id);

      // 2. Filtramos los anuncios ÚNICAMENTE por ID de zona
      // Independientemente de lo que diga el campo 'city' del anuncio.
      if (zoneIds.length > 0) {
        filter.zone = { $in: zoneIds };
      } else {
        // Si no se encuentran zonas que coincidan, forzamos que no devuelva nada
        filter.zone = { $in: [] };
      }
    }

    // ---------------------------------------------------------
    // 5. DEFINICIÓN DE CAMPOS, MÁXIMOS Y EJECUCIÓN PARALELA
    // ---------------------------------------------------------
    const fields = [
      "_id",
      "slug",
      "title",
      "adReference",
      "adType",
      "sale",
      "rent",
      "adDirection",
      "images.main",
      "images.others",
      "adBuildingType",
      "buildSurface",
      "plotSurface",
      "quality.bedrooms",
      "quality.bathrooms",
      "quality.parking",
      "quality.reformed",
      "quality.others.terrace",
      "quality.others.swimmingPool",
      "createdAt",
    ].join(" ");

    // Agregación para obtener los máximos dinámicos del departamento
    const statsQuery = Ad.aggregate([
      {
        $match: {
          showOnWeb: true,
          department: targetDepartment,
          adStatus: { $in: ["Activo", "En preparación"] },
        },
      },
      {
        $group: {
          _id: null,
          maxPriceSale: { $max: "$sale.saleValue" },
          maxPriceRent: { $max: "$rent.rentValue" },
          maxSurface: { $max: "$buildSurface" },
        },
      },
    ]);

    const [totalDocs, ads, statsResult] = await Promise.all([
      Ad.countDocuments(filter),
      Ad.find(filter)
        .select(fields)
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      statsQuery,
    ]);

    const stats = statsResult[0] || {
      maxPriceSale: 10000000,
      maxPriceRent: 15000,
      maxSurface: 2000,
    };

    // ---------------------------------------------------------
    // 6. ADAPTADOR (MAPPING) PARA EL FRONTEND
    // ---------------------------------------------------------
    const formattedAds = ads.map((ad) => {
      const rawCity = ad.adDirection?.city || "Ubicación no disponible";
      const sPrice = ad.sale?.saleShowOnWeb ? ad.sale.saleValue : null;
      const rPrice = ad.rent?.rentShowOnWeb ? ad.rent.rentValue : null;
      const allImages = [ad.images?.main, ...(ad.images?.others || [])].filter(
        Boolean,
      );

      return {
        id: ad._id.toString(),
        slug: ad.slug,
        title: ad.title,
        ref: ad.adReference,
        salePrice: sPrice,
        rentPrice: rPrice,
        operation: ad.adType ? ad.adType.join(" / ") : "",
        location: rawCity.charAt(0).toUpperCase() + rawCity.slice(1),
        image: allImages[0] || null,
        images: allImages.slice(0, 3),
        plotArea: ad.plotSurface || 0,
        garage: ad.quality?.parking || 0,
        hasPool: !!ad.quality?.others?.swimmingPool,
        specs: {
          beds: ad.quality?.bedrooms || 0,
          bathrooms: ad.quality?.bathrooms || 0,
          area: ad.buildSurface || ad.plotSurface || 0,
        },
        tags: [
          ad.adBuildingType?.[0],
          ad.quality?.reformed && "Reformado",
          ad.quality?.others?.terrace && "Terraza",
          ad.quality?.others?.swimmingPool && "Piscina",
        ]
          .filter(Boolean)
          .slice(0, 3),
      };
    });

    // ---------------------------------------------------------
    // 7. RESPUESTA FINAL
    // ---------------------------------------------------------
    res.status(200).json({
      data: formattedAds,
      pagination: {
        total: totalDocs,
        page,
        limit,
        totalPages: Math.ceil(totalDocs / limit),
      },
      absoluteValues: {
        maxPriceSale: stats.maxPriceSale || 10000000,
        maxPriceRent: stats.maxPriceRent || 15000,
        maxSurface: stats.maxSurface || 2000,
      },
    });
  } catch (error) {
    console.error("Error en getFilteredAds:", error);
    next(error);
  }
};

const getHighlightAds = async (req, res, next) => {
  try {
    const ads = await Ad.find({ featuredOnMain: true }).select(
      "title slug adType sale rent adDirection images quality buildSurface plotSurface",
    );

    const formattedAds = ads.map((ad) => {
      const sPrice =
        ad.sale?.saleShowOnWeb && ad.sale?.saleValue ? ad.sale.saleValue : null;

      const rPrice =
        ad.rent?.rentShowOnWeb && ad.rent?.rentValue ? ad.rent.rentValue : null;

      return {
        id: ad._id.toString(),
        slug: ad.slug,
        title: ad.title,
        salePrice: sPrice,
        rentPrice: rPrice,
        operation: ad.adType.join(" / "),
        location: ad.adDirection?.city || "Madrid",
        image: ad.images?.main || "",
        specs: {
          beds: ad.quality?.bedrooms || 0,
          area: ad.buildSurface || ad.plotSurface || 0,
          bathrooms: ad.quality?.bathrooms || 0,
        },
        tags: ad.adType,
      };
    });

    res.status(200).json(formattedAds);
  } catch (error) {
    next(error);
  }
};

const getAdDetails = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return res.status(400).json({ message: "Falta el slug del inmueble" });
    }

    // 1. Búsqueda con filtros y .lean() para máximo rendimiento
    const ad = await Ad.findOne({
      slug: slug,
      showOnWeb: true,
      adStatus: { $in: ["Activo", "En preparación"] },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    })
      .populate("zone")
      .populate(
        "consultant",
        "avatar fullName consultantEmail consultantMobileNumber",
      )
      .lean(); // <--- Convierte el Mongoose Document a objeto puro JS

    if (!ad) {
      return res.status(404).json({ message: "Inmueble no encontrado" });
    }

    // 2. Extraer información de la zona poblada
    const mainZone = ad.zone && ad.zone.length > 0 ? ad.zone[0] : null;

    // 3. Lógica de Precios Dual (Venta / Alquiler)
    const salePrice =
      ad.sale?.saleShowOnWeb && ad.adType?.includes("Venta")
        ? ad.sale.saleValue
        : null;

    const rentPrice =
      ad.rent?.rentShowOnWeb && ad.adType?.includes("Alquiler")
        ? ad.rent.rentValue
        : null;

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

    // 4. Extracción de repercusión M2
    const saleRepercussionM2ShowOnWeb =
      ad.sale?.saleRepercussionM2ShowOnWeb || false;
    const rawRepercussion = ad.sale?.saleRepercussionM2;
    const m2Terrace = ad.m2Terrace;
    const m2StorageSpace = ad.m2StorageSpace;

    const saleRepercussionM2 =
      saleRepercussionM2ShowOnWeb && rawRepercussion
        ? Number(rawRepercussion)
        : null;

    // 4b. Unificación de Galería de Imágenes
    let gallery = [];
    if (ad.images?.main) gallery.push(ad.images.main);
    if (ad.images?.others && Array.isArray(ad.images.others)) {
      gallery = [...gallery, ...ad.images.others];
    }

    // 5. Mapeo Dinámico de Características
    const othersRaw = ad.quality?.others || {};

    // 5.1 Extraemos de others SOLO las claves cuyo valor sea exactamente true
    const featuresList = Object.entries(othersRaw).reduce(
      (acc, [key, value]) => {
        if (value === true) {
          acc[key] = true;
        }
        return acc;
      },
      {},
    );

    // 5.2 Evaluamos las manuales y las añadimos SOLO si son verdaderas
    const hasPool =
      ad.quality?.others?.swimmingPool === true ||
      (ad.quality?.indoorPool || 0) > 0 ||
      (ad.quality?.outdoorPool || 0) > 0;

    if (hasPool) featuresList.pool = true;

    const hasGarage =
      (ad.quality?.parking || 0) > 0 || ad.quality?.others?.garage === true;

    if (hasGarage) featuresList.garage = true;

    const hasHeating =
      ad.quality?.others?.centralHeating === true ||
      ad.quality?.others?.subfloorHeating === true;

    if (hasHeating) featuresList.heating = true;

    // 6. Construcción del objeto final (PropertyDetail)
    const propertyDetail = {
      id: ad._id,
      slug: ad.slug,
      title: ad.title,
      reference: ad.adReference,
      category: ad.department,
      subzone: mainZone ? mainZone.subzone : null,
      zoneName: mainZone ? mainZone.name : null,
      operation: ad.adType,

      description: ad.description?.web || "Sin descripción disponible.",
      distribution:
        ad.description?.distribution || "Sin distribución disponible",

      // Precios
      salePrice: salePrice,
      rentPrice: rentPrice,
      priceLabel: priceLabel,
      period: period,
      saleRepercussionM2: saleRepercussionM2,
      saleRepercussionM2ShowOnWeb: saleRepercussionM2ShowOnWeb,

      // Superficies Extra
      m2Terrace: m2Terrace,
      m2StorageSpace: m2StorageSpace,

      location: {
        address: {
          street: ad.adDirection?.address?.street,
          directionNumber: ad.adDirection?.address?.directionNumber,
          directionFloor: ad.adDirection?.address?.directionFloor,
        },
        postalCode: ad.adDirection?.postalCode,
        city: ad.adDirection?.city,
        country: ad.adDirection?.country,
      },

      specs: {
        beds: ad.quality?.bedrooms || 0,
        baths: ad.quality?.bathrooms || 0,
        area: ad.buildSurface || 0,
        plot: ad.plotSurface || 0,
        year: ad.buildingYear,
        floor: ad.floor || "",
        numberOfPools:
          (ad.quality?.indoorPool || 0) + (ad.quality?.outdoorPool || 0),
        parkingSpots: ad.quality?.parking || 0,
      },

      // Consultor (ya filtrado por el populate)
      consultant: ad.consultant || null,

      features: featuresList, // <--- Aquí inyectamos el objeto dinámico limpio
      images: gallery,
      mainImage: ad.images?.main || "",
      blueprints: ad.images?.blueprint || "",
      video: ad.images?.media || "",
      surfacesBox: ad.surfacesBox || [],
      tags: [],
    };

    // 7. Tags dinámicos basados en el tipo y calidades
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
  getFilteredAds,
  getHighlightAds,
  getAdDetails,
};
