const { deleteImage, getCdnUrl } = require("../middlewares/file.middleware"); // ¡CORRECCIÓN AQUÍ!
const Ad = require("../models/ad.model");
const WebHome = require("../models/webHome.model");
const Consultant = require("../models/consultant.model");
const Zone = require("../models/zone.model");
const { revalidateWeb } = require("../utils/revalidateWeb");
const { default: mongoose } = require("mongoose");
const { makeDiacriticRegex } = require("../utils/utils");

const webHomeGet = async (req, res, next) => {
  try {
    const webDocs = await WebHome.find().populate({
      path: "videoSection.videos.adId",
      select: "adStatus showOnWeb gvOperationClose adType sale rent",
    });

    if (!webDocs || webDocs.length === 0) return res.status(200).json([]);

    const webHomeDoc = webDocs[0];
    const initialCount = webHomeDoc.videoSection.videos.length;

    const validVideos = webHomeDoc.videoSection.videos.filter((video) => {
      const ad = video.adId;
      if (!ad) return false;

      const isVisible = ad.showOnWeb === true;
      const isActive = ["Activo", "En preparación"].includes(ad.adStatus);
      const isNotClosed = !ad.gvOperationClose || ad.gvOperationClose === "";

      if (!isVisible || !isActive || !isNotClosed) return false;

      const isSaleValid =
        ad.adType.includes("Venta") &&
        ad.sale?.saleValue &&
        ad.sale?.saleShowOnWeb === true;

      const isRentValid =
        ad.adType.includes("Alquiler") &&
        ad.rent?.rentValue &&
        ad.rent?.rentShowOnWeb === true;

      let labels = [];
      video.price.sale = isSaleValid ? ad.sale.saleValue : null;
      video.price.rent = isRentValid ? ad.rent.rentValue : null;

      if (video.price.sale) labels.push("Venta");
      if (video.price.rent) labels.push("Alquiler");
      video.price.label = labels.join(" / ");

      return true;
    });

    if (validVideos.length !== initialCount) {
      webHomeDoc.videoSection.videos = validVideos;
      await webHomeDoc.save();
    }

    const webData = webHomeDoc.toObject();

    const activeFilter = {
      adStatus: { $in: ["Activo", "En preparación"] },
      showOnWeb: true,
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
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
      // CORRECCIÓN: Uso de getCdnUrl
      portraidImage: req.file ? getCdnUrl(req.file) : "",
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
    webHomeToUpdate.mainTitle = req.body.mainTitle;
    webHomeToUpdate.mainSubtitle = req.body.mainSubtitle;

    // CORRECCIÓN: Detectamos file y aplicamos getCdnUrl
    if (req.file) {
      if (webHomeToUpdate.portraidImage) {
        try {
          await deleteImage(webHomeToUpdate.portraidImage);
        } catch (e) {
          console.error("Aviso: S3 falló al borrar la imagen anterior", e);
        }
      }
      webHomeToUpdate.portraidImage = getCdnUrl(req.file);
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

    if (req.body.title) webHome.videoSection.title = req.body.title;
    if (req.body.subtitle) webHome.videoSection.subtitle = req.body.subtitle;

    if (req.body.selectedAdIds && Array.isArray(req.body.selectedAdIds)) {
      if (req.body.selectedAdIds.length > 0) {
        const foundAds = await Ad.find({
          _id: { $in: req.body.selectedAdIds },
          showOnWeb: true,
          adStatus: { $in: ["Activo", "En preparación"] },
        }).select("title adReference adType sale rent images slug");

        const newVideoCollection = req.body.selectedAdIds
          .map((adId) => {
            const ad = foundAds.find((a) => a._id.toString() === adId);
            if (!ad) return null;

            let priceObj = { sale: null, rent: null, label: "" };
            let labels = [];

            const isSaleValid =
              ad.adType.includes("Venta") &&
              ad.sale?.saleValue &&
              ad.sale?.saleShowOnWeb === true;

            if (isSaleValid) {
              priceObj.sale = ad.sale.saleValue;
              labels.push("Venta");
            }

            const isRentValid =
              ad.adType.includes("Alquiler") &&
              ad.rent?.rentValue &&
              ad.rent?.rentShowOnWeb === true;

            if (isRentValid) {
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
    await revalidateWeb("home-data");

    return res.status(200).json(updatedWebHome);
  } catch (err) {
    console.error("Error en webVideoSectionUpdate:", err);
    return next(err);
  }
};

const webResidentialCategoryImageUpload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.residential) {
        try {
          await deleteImage(webHomeToUpdate.categoriesImages.residential);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.categoriesImages.residential = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.patrimonial) {
        try {
          await deleteImage(webHomeToUpdate.categoriesImages.patrimonial);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.categoriesImages.patrimonial = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.art) {
        try {
          await deleteImage(webHomeToUpdate.categoriesImages.art);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.categoriesImages.art = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.categoriesImages.catalog) {
        try {
          await deleteImage(webHomeToUpdate.categoriesImages.catalog);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.categoriesImages.catalog = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.otherCategoriesImages.coast) {
        try {
          await deleteImage(webHomeToUpdate.otherCategoriesImages.coast);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.otherCategoriesImages.coast = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.otherCategoriesImages.rustic) {
        try {
          await deleteImage(webHomeToUpdate.otherCategoriesImages.rustic);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.otherCategoriesImages.rustic = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (req.file) {
      if (webHomeToUpdate.otherCategoriesImages.singular) {
        try {
          await deleteImage(webHomeToUpdate.otherCategoriesImages.singular);
        } catch (e) {
          console.error(e);
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHomeToUpdate.otherCategoriesImages.singular = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.sections.interiorims.image) {
          try {
            await deleteImage(webHomeToUpdate.sections.interiorims.image);
          } catch (e) {
            console.error(e);
          }
        }
        // CORRECCIÓN: Uso de getCdnUrl
        webHomeToUpdate.sections.interiorims.image = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.sections.sell.image) {
          try {
            await deleteImage(webHomeToUpdate.sections.sell.image);
          } catch (e) {
            console.error(e);
          }
        }
        // CORRECCIÓN: Uso de getCdnUrl
        webHomeToUpdate.sections.sell.image = getCdnUrl(req.file);
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.sections.offices.image) {
          try {
            await deleteImage(webHomeToUpdate.sections.offices.image);
          } catch (e) {
            console.error(e);
          }
        }
        // CORRECCIÓN: Uso de getCdnUrl
        webHomeToUpdate.sections.offices.image = getCdnUrl(req.file);
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
        if (webHomeToUpdate.talkWithUs.contactImage) {
          try {
            await deleteImage(webHomeToUpdate.talkWithUs.contactImage);
          } catch (e) {
            console.error(e);
          }
        }
        webHomeToUpdate.talkWithUs.contactImage = getCdnUrl(req.file);
      }
      webHomeToUpdate.talkWithUs.titleHome = req.body.titleHome;
      webHomeToUpdate.talkWithUs.titleContact = req.body.titleContact;

      const oldDirections = Array.isArray(webHomeToUpdate.talkWithUs.directions)
        ? webHomeToUpdate.talkWithUs.directions
        : [];

      let newDirections = req.body.directions;
      if (typeof newDirections === "string") {
        try {
          newDirections = JSON.parse(newDirections);
        } catch (e) {
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
        try {
          for (const { from, to } of replacements) {
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

        try {
          if (Array.isArray(newDirections)) {
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
    const { id } = req.params;
    const webHome = await WebHome.findById(id);
    const webHomeToUpdate = webHome;
    if (webHome) {
      if (req.file) {
        if (webHomeToUpdate.services.development.image) {
          try {
            await deleteImage(webHomeToUpdate.services.development.image);
          } catch (e) {
            console.error(e);
          }
        }
        // CORRECCIÓN: Uso de getCdnUrl
        webHomeToUpdate.services.development.image = getCdnUrl(req.file);
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
        if (webHomeToUpdate.services.interiorims.image) {
          try {
            await deleteImage(webHomeToUpdate.services.interiorims.image);
          } catch (e) {
            console.error(e);
          }
        }
        // CORRECCIÓN: Uso de getCdnUrl
        webHomeToUpdate.services.interiorims.image = getCdnUrl(req.file);
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
      adReference: { $regex: ref, $options: "i" },
      adStatus: { $in: ["Activo", "En preparación"] },
      showOnWeb: { $in: true },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
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

    if (!key) {
      return res
        .status(400)
        .json({ message: "Falta la clave (key) de la sección a editar" });
    }

    const webHome = await WebHome.findById(id);
    if (!webHome) {
      return res.status(404).json({ message: "WebHome no encontrado" });
    }

    if (!webHome.categoriesSection) {
      webHome.categoriesSection = {};
    }
    if (!webHome.categoriesSection[key]) {
      webHome.categoriesSection[key] = {};
    }

    if (title) {
      webHome.categoriesSection[key].title = title;
    }

    if (subtitle) {
      webHome.categoriesSection[key].subtitle = subtitle;
    }

    if (file) {
      const oldImageUrl = webHome.categoriesSection[key].image;
      if (oldImageUrl) {
        try {
          await deleteImage(oldImageUrl);
        } catch (e) {
          console.error(
            "Aviso: S3 falló al borrar la imagen de categoría anterior",
            e,
          );
        }
      }
      // CORRECCIÓN: Uso de getCdnUrl
      webHome.categoriesSection[key].image = getCdnUrl(file);
    }

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
    const {
      page = 1,
      limit = 15,
      department,
      zone,
      operation,
      propertyType,
      maxPrice,
      maxSurface,
      pool,
      garage,
      terrace,
      profitability,
      coworking,
      smokeOutlet,
      implanted,
      separateEntrance,
      exclusiveOffice,
      classicBuilding,
      mixedBuilding,
      reformed,
      toReform,
      sort,
    } = req.body;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. Normalización del Departamento
    let targetDepartment =
      department === "Patrimonial" ? "Patrimonio" : department;

    // --- 2. LÓGICA DE ZONAS ---
    let zoneIds = [];

    if (zone && !["madrid", "espana"].includes(zone.toLowerCase())) {
      const zoneString = Array.isArray(zone) ? zone.join(",") : String(zone);
      const decodedZone = decodeURIComponent(zoneString).trim().toLowerCase();

      const citySubzones = {
        marbella: "Marbella",
        sotogrande: "Sotogrande",
        "puerto santa maria": "Puerto de Santa María",
      };

      let matchingZones = [];

      const searchZonesIn =
        targetDepartment === "Patrimonio"
          ? ["Patrimonial"]
          : ["Residencial", "Costa"];

      if (citySubzones[decodedZone]) {
        matchingZones = await Zone.find({
          subzone: citySubzones[decodedZone],
          zone: { $in: searchZonesIn },
        }).lean();
      } else {
        const slugsArray = decodedZone.split(",").map((s) => s.trim());
        matchingZones = await Zone.find({
          slug: { $in: slugsArray },
          zone: { $in: searchZonesIn },
        }).lean();
      }

      if (matchingZones.length > 0) {
        zoneIds = matchingZones.map((z) => z._id);
        const hasCostaZone = matchingZones.some((z) => z.zone === "Costa");
        if (hasCostaZone && targetDepartment === "Residencial") {
          targetDepartment = "Costa";
        }
      } else {
        return res
          .status(200)
          .json({ data: [], pagination: { total: 0, page, totalPages: 0 } });
      }
    }

    // 3. Filtro Principal
    const filter = {
      $or: [{ showOnWeb: true }, { showOnWebOffMarket: true }],
      department: targetDepartment,
      adStatus: { $in: ["Activo", "En preparación"] },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    };

    if (zoneIds.length > 0) filter.zone = { $in: zoneIds };

    // --- 4. FILTROS DE OPERACIÓN Y PRECIO ---
    if (operation) {
      const isSale = ["sale", "venta"].includes(operation.toLowerCase());
      filter.adType = { $in: [isSale ? "Venta" : "Alquiler"] };
      const priceField = isSale ? "sale.saleValue" : "rent.rentValue";
      if (maxPrice) filter[priceField] = { $lte: Number(maxPrice), $gt: 0 };
    } else if (maxPrice) {
      filter.$or = [
        { "sale.saleValue": { $lte: Number(maxPrice), $gt: 0 } },
        { "rent.rentValue": { $lte: Number(maxPrice), $gt: 0 } },
      ];
    }

    // --- 5. ATRIBUTOS ---
    if (propertyType && propertyType !== "Todos") {
      filter.adBuildingType = { $in: propertyType.split(",") };
    }
    if (maxSurface) filter.buildSurface = { $lte: Number(maxSurface) };

    const booleanFilters = {
      "quality.others.swimmingPool": pool,
      "quality.others.terrace": terrace,
      profitability: profitability,
      "quality.others.coworking": coworking,
      "quality.others.smokeOutlet": smokeOutlet,
      "quality.others.implanted": implanted,
      "quality.others.separateEntrance": separateEntrance,
      "quality.others.exclusiveOfficeBuilding": exclusiveOffice,
      "quality.others.classicBuilding": classicBuilding,
      "quality.others.mixedBuilding": mixedBuilding,
      "quality.reformed": reformed,
      "quality.toReform": toReform,
    };

    Object.entries(booleanFilters).forEach(([path, value]) => {
      if (value === "true") filter[path] = true;
    });

    if (garage === "true") filter["quality.parking"] = { $gt: 0 };

    // --- 6. ORDENACIÓN ---
    let sortQuery = { createdAt: -1 };
    const sortOptions = {
      "creat-asc": { createdAt: -1 },
      "creat-des": { createdAt: 1 },
      "price-asc": ["rent", "alquiler"].includes(operation?.toLowerCase())
        ? { "rent.rentValue": 1 }
        : { "sale.saleValue": 1 },
      "price-desc": ["rent", "alquiler"].includes(operation?.toLowerCase())
        ? { "rent.rentValue": -1 }
        : { "sale.saleValue": -1 },
    };
    if (sortOptions[sort]) sortQuery = sortOptions[sort];

    // --- 7. EJECUCIÓN PARALELA ---
    const statsQuery = Ad.aggregate([
      {
        $match: {
          department: targetDepartment,
          showOnWeb: true,
          adStatus: "Activo",
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
        .populate("zone", "name")
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      statsQuery,
    ]);

    const stats = statsResult[0] || {
      maxPriceSale: 10000000,
      maxPriceRent: 20000,
      maxSurface: 5000,
    };

    // --- 8. FORMATEO DE RESPUESTA Y MEZCLA (1 Off-Market cada 6 Normales) ---
    const normalAds = [];
    const offMarketAds = [];

    // 8.1. Separar y formatear los anuncios según su tipo
    ads.forEach((ad) => {
      const isOffMarket = ad.showOnWebOffMarket === true;

      if (isOffMarket) {
        offMarketAds.push({
          id: ad._id.toString(),
          ref: ad.adReference,
          slug: ad.slug,
          title: ad.title,
          location: ad.adDirection?.city || "Madrid",
          category: ad.department,
          isOffMarket: true,
        });
      } else {
        const activeTags = [];
        if (ad.sale?.saleValue && ad.sale?.saleShowOnWeb)
          activeTags.push("Venta");
        if (ad.rent?.rentValue && ad.rent?.rentShowOnWeb)
          activeTags.push("Alquiler");

        normalAds.push({
          id: ad._id.toString(),
          slug: ad.slug,
          title: ad.title,
          category: ad.department,
          subzone: ad.zone?.[0]?.subzone || null,
          ref: ad.adReference,
          salePrice: ad.sale?.saleValue || null,
          rentPrice: ad.rent?.rentValue || null,
          operation: activeTags,
          location: ad.adDirection?.city || "Madrid",
          image: ad.images?.main || null,
          isOffMarket: false,
          images: [ad.images?.main, ...(ad.images?.others || [])]
            .filter(Boolean)
            .slice(0, 3),
          specs: {
            beds: ad.quality?.bedrooms || 0,
            bathrooms: ad.quality?.bathrooms || 0,
            area: ad.buildSurface || 0,
            plotArea: ad.plotSurface || 0,
            garage: ad.quality?.parking || 0,
            pool: ad.quality?.others?.swimmingPool
              ? Number(ad.quality.indoorPool || 0) +
                  Number(ad.quality.outdoorPool || 0) || 1
              : 0,
          },
          zoneName: ad.zone?.[0]?.name || "",
          tags: [
            ad.adBuildingType?.[0],
            ad.quality?.reformed && "Reformado",
            ad.profitability && "Rentabilidad",
            ...activeTags,
          ]
            .filter(Boolean)
            .slice(0, 4),
        });
      }
    });

    // 8.2. Ordenar aleatoriamente (shuffle) los anuncios Off-Market
    for (let i = offMarketAds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offMarketAds[i], offMarketAds[j]] = [offMarketAds[j], offMarketAds[i]];
    }

    // 8.3. Intercalar: 6 Normales seguidos de 1 Off-Market
    const formattedAds = [];
    let normalIndex = 0;
    let offMarketIndex = 0;

    while (
      normalIndex < normalAds.length ||
      offMarketIndex < offMarketAds.length
    ) {
      // Metemos hasta 6 normales manteniendo su orden de la BBDD
      let count = 0;
      while (count < 6 && normalIndex < normalAds.length) {
        formattedAds.push(normalAds[normalIndex]);
        normalIndex++;
        count++;
      }

      // Metemos 1 Off-Market aleatorio
      if (offMarketIndex < offMarketAds.length) {
        formattedAds.push(offMarketAds[offMarketIndex]);
        offMarketIndex++;
      }
    }

    res.status(200).json({
      data: formattedAds,
      pagination: {
        total: totalDocs,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalDocs / limit),
      },
      absoluteValues: {
        maxPriceSale: stats.maxPriceSale,
        maxPriceRent: stats.maxPriceRent,
        maxSurface: stats.maxSurface,
      },
    });
  } catch (error) {
    console.error("❌ Error en getFilteredAds:", error);
    next(error);
  }
};

const getHighlightAds = async (req, res, next) => {
  try {
    const filter = {
      featuredOnMain: true,
      showOnWeb: true,
      adStatus: { $in: ["Activo", "En preparación"] },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    };

    const ads = await Ad.find(filter)
      .select(
        "title zone slug adType sale rent adDirection images quality buildSurface plotSurface department adReference",
      )
      .populate("zone", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formattedAds = ads.map((ad) => {
      const categoryMap = {
        Residencial: "residencial",
        Costa: "residencial",
        Patrimonio: "patrimonio",
        "Campos Rústicos & Activos Singulares": "otros-activos-y-zonas",
      };

      const category = categoryMap[ad.department] || "residencial";

      // Lógica de precios y etiquetas activas
      const activeTags = [];
      const sPrice =
        ad.sale?.saleValue && ad.sale?.saleShowOnWeb ? ad.sale.saleValue : null;
      const rPrice =
        ad.rent?.rentValue && ad.rent?.rentShowOnWeb ? ad.rent.rentValue : null;

      if (sPrice) activeTags.push("Venta");
      if (rPrice) activeTags.push("Alquiler");

      // Si no hay precios marcados para web, usamos el adType por defecto
      const finalOperations = activeTags.length > 0 ? activeTags : ad.adType;

      return {
        id: ad._id.toString(),
        slug: ad.slug,
        title: ad.title,
        ref: ad.adReference,
        zoneName: ad.zone[0]?.name || "",
        category,
        salePrice: sPrice,
        rentPrice: rPrice,
        operation: finalOperations,
        location: ad.adDirection?.city || "Madrid",
        image: ad.images?.main || "",
        // 🚀 SINCRONIZADO: Añadimos array de imágenes para el carrusel horizontal
        images: [ad.images?.main, ...(ad.images?.others || [])]
          .filter(Boolean)
          .slice(0, 3),
        specs: {
          beds: ad.quality?.bedrooms || 0,
          bathrooms: ad.quality?.bathrooms || 0,
          area: ad.buildSurface || 0,
          plotArea: ad.plotSurface || 0,
          garage: ad.quality?.parking || 0,
          pool: ad.quality?.others?.swimmingPool
            ? Number(ad.quality.indoorPool || 0) +
                Number(ad.quality.outdoorPool || 0) || 1
            : 0,
        },
        tags: [
          ad.adBuildingType?.[0],
          ad.quality?.reformed && "Reformado",
          ...finalOperations,
        ]
          .filter(Boolean)
          .slice(0, 4),
      };
    });

    res.status(200).json(formattedAds);
  } catch (error) {
    console.error("❌ Error en getHighlightAds:", error);
    next(error);
  }
};

const getAdDetails = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return res.status(400).json({ message: "Falta el slug del inmueble" });
    }

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
      .lean();

    if (!ad) {
      return res.status(404).json({ message: "Inmueble no encontrado" });
    }

    const mainZone = ad.zone && ad.zone.length > 0 ? ad.zone[0] : null;

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

    const saleRepercussionM2ShowOnWeb =
      ad.sale?.saleRepercussionM2ShowOnWeb || false;
    const rawRepercussion = ad.sale?.saleRepercussionM2;
    const m2Terrace = ad.m2Terrace;
    const m2StorageSpace = ad.m2StorageSpace;

    const saleRepercussionM2 =
      saleRepercussionM2ShowOnWeb && rawRepercussion
        ? Number(rawRepercussion)
        : null;

    let gallery = [];
    if (ad.images?.main) gallery.push(ad.images.main);
    if (ad.images?.others && Array.isArray(ad.images.others)) {
      gallery = [...gallery, ...ad.images.others];
    }

    const othersRaw = ad.quality?.others || {};

    const featuresList = Object.entries(othersRaw).reduce(
      (acc, [key, value]) => {
        if (value === true) {
          acc[key] = true;
        }
        return acc;
      },
      {},
    );

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
      salePrice: salePrice,
      rentPrice: rentPrice,
      priceLabel: priceLabel,
      period: period,
      saleRepercussionM2: saleRepercussionM2,
      saleRepercussionM2ShowOnWeb: saleRepercussionM2ShowOnWeb,
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
      profitability: ad.profitability,
      profitabilityValue: ad.profitabilityValue,
      ibi: ad.ibi,
      trashFee: ad.trashFee,
      communityExpenses: ad.communityExpenses,
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
      consultant: ad.consultant || null,
      features: featuresList,
      images: gallery,
      mainImage: ad.images?.main || "",
      blueprints: ad.images?.blueprint || "",
      video: ad.images?.media || "",
      surfacesBox: ad.surfacesBox || [],
      tags: [],
    };

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

const getActiveInventoryZones = async (req, res) => {
  try {
    const { department } = req.body;

    // 1. Buscamos los anuncios y traemos el campo 'slug' de la zona referenciada
    const ads = await Ad.find({
      department,
      adStatus: { $in: ["Activo", "En preparación"] },
      showOnWeb: true,
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    }).populate("zone", "slug"); // 🔄 CAMBIO: Pedimos el slug, no el name

    // 2. Extraemos los slugs únicos
    // Usamos z.slug en lugar de z.name
    const activeSlugs = [
      ...new Set(ads.flatMap((ad) => ad.zone.map((z) => z.slug))),
    ];

    // 3. Devolvemos la lista de slugs
    res.status(200).json({ success: true, data: activeSlugs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFilterStats = async (req, res, next) => {
  try {
    const { department, zone } = req.body;

    // 1. Identificación inicial
    let targetDepartment =
      department === "Patrimonial" ? "Patrimonio" : department;

    // 2. Búsqueda de zonas para determinar el departamento real y obtener IDs
    let zoneIds = [];
    if (
      zone &&
      zone.toLowerCase() !== "madrid" &&
      zone.toLowerCase() !== "espana"
    ) {
      const slugsArray = zone.split(",").map((s) => s.trim().toLowerCase());

      // Buscamos en ambos departamentos posibles para evitar conflictos
      const searchZonesIn =
        targetDepartment === "Patrimonio"
          ? ["Patrimonial"]
          : ["Residencial", "Costa"];

      const zoneConditions = slugsArray.map((slug) => {
        let nameToSearch = slug.replace(/-/g, " ");
        if (nameToSearch === "puerto santa maria")
          nameToSearch = "puerto de santa maria";

        const flexiblePattern = makeDiacriticRegex(nameToSearch);
        return {
          $or: [
            { subzone: { $regex: new RegExp(`^${flexiblePattern}$`, "i") } },
            { name: { $regex: new RegExp(`^${flexiblePattern}$`, "i") } },
          ],
        };
      });

      const matchingZones = await Zone.find({
        zone: { $in: searchZonesIn },
        $or: zoneConditions,
      }).lean();

      if (matchingZones.length > 0) {
        zoneIds = matchingZones.map((z) => z._id);

        // Si encontramos que la zona es de "Costa", actualizamos el departamento
        const hasCostaZone = matchingZones.some((z) => z.zone === "Costa");
        if (hasCostaZone && targetDepartment === "Residencial") {
          targetDepartment = "Costa";
        }
      } else {
        zoneIds = [new mongoose.Types.ObjectId()];
      }
    }

    // 3. Filtro base para la agregación
    const statsMatch = {
      showOnWeb: true,
      department: targetDepartment,
      adStatus: { $in: ["Activo", "En preparación"] },
      gvOperationClose: { $nin: ["Vendido", "Alquilado"] },
    };

    if (zoneIds.length > 0) {
      statsMatch.zone = { $in: zoneIds };
    }

    // 4. Ejecución de la agregación
    const statsResult = await Ad.aggregate([
      { $match: statsMatch },
      {
        $group: {
          _id: null,
          maxPriceSale: { $max: "$sale.saleValue" },
          maxPriceRent: { $max: "$rent.rentValue" },
          maxSurface: { $max: "$buildSurface" },
        },
      },
    ]);

    const stats = statsResult[0] || {
      maxPriceSale: 10000000,
      maxPriceRent: 15000,
      maxSurface: 5000,
    };

    res.status(200).json({
      success: true,
      data: {
        maxPriceSale: stats.maxPriceSale || 10000000,
        maxPriceRent: stats.maxPriceRent || 15000,
        maxSurface: stats.maxSurface || 5000,
      },
    });
  } catch (error) {
    console.error("Error en getFilterStats:", error);
    next(error);
  }
};

const getSimilarAds = async (req, res) => {
  try {
    const { id } = req.params;

    const currentAd = await Ad.findById(id).lean();

    if (!currentAd) {
      return res.status(404).json({ message: "Anuncio no encontrado" });
    }

    const basePrice = currentAd.sale?.saleValue || 0;
    const minPrice = basePrice * 0.8;
    const maxPrice = basePrice * 1.2;

    const currentZones = currentAd.zone || [];
    const currentAdTypes = currentAd.adType || [];
    const currentBuildingTypes = currentAd.adBuildingType || [];

    const similarAds = await Ad.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(id) },
          showOnWeb: true,
          adStatus: { $in: ["En preparación", "Activo"] },
          department: currentAd.department,
          adType: { $in: currentAdTypes },
        },
      },
      {
        $addFields: {
          zoneScore: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $setIntersection: [
                        { $ifNull: ["$zone", []] },
                        currentZones,
                      ],
                    },
                  },
                  0,
                ],
              },
              3,
              0,
            ],
          },
          buildingTypeScore: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $setIntersection: [
                        { $ifNull: ["$adBuildingType", []] },
                        currentBuildingTypes,
                      ],
                    },
                  },
                  0,
                ],
              },
              1,
              0,
            ],
          },
          priceScore: {
            $cond: [
              {
                $and: [
                  { $gte: ["$sale.saleValue", minPrice] },
                  { $lte: ["$sale.saleValue", maxPrice] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          totalScore: {
            $add: ["$zoneScore", "$buildingTypeScore", "$priceScore"],
          },
        },
      },
      {
        $sort: { totalScore: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "zones",
          localField: "zone",
          foreignField: "_id",
          as: "zone",
        },
      },
      {
        $project: {
          _id: 1,
          slug: 1,
          department: 1,
          title: 1,
          "sale.saleValue": 1,
          "sale.saleShowOnWeb": 1,
          "images.main": 1,
          "adDirection.city": 1,
          zone: 1,
        },
      },
    ]);

    res.status(200).json(similarAds);
  } catch (error) {
    console.error("Error fetching similar ads:", error);
    res.status(500).json({ message: "Error interno del servidor" });
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
  getActiveInventoryZones,
  getFilterStats,
  getSimilarAds,
};
