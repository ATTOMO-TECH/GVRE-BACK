const { deleteImage, getCdnUrl } = require("../middlewares/file.middleware");
const Ad = require("../models/ad.model");
const WebHome = require("../models/webHome.model");
const Consultant = require("../models/consultant.model");
const Zone = require("../models/zone.model");
const { revalidateWeb } = require("../utils/revalidateWeb");
const { default: mongoose } = require("mongoose");
const { makeDiacriticRegex } = require("../utils/utils");
const pdfGenerator = require("../services/pdfGenerator");

// Asegúrate de tener importado el modelo Zone al principio de tu archivo si no lo tienes:
// const Zone = require("../models/zone");

const webHomeGet = async (req, res, next) => {
  try {
    const webDocs = await WebHome.find().populate({
      path: "videoSection.videos.adId",
      select:
        "adStatus showOnWeb gvOperationClose adType sale rent adDirection department zone",
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
      video.location = ad.adDirection?.city
        ? ad.adDirection.city.trim().toLowerCase()
        : "";
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
      $and: [{ $or: [{ showOnWeb: true }, { showOnWebOffMarket: true }] }],
    };

    const loc2 = webData.categoriesSection?.location2?.title || "Marbella";
    const loc3 = webData.categoriesSection?.location3?.title || "Sotogrande";
    const loc4 =
      webData.categoriesSection?.location4?.title || "Puerto de Santa María";

    // Obtenemos las IDs de las zonas de costa para los contadores específicos
    const [marbellaZones, sotograndeZones, puertoZones] = await Promise.all([
      Zone.find({ subzone: { $regex: new RegExp(`^${loc2}$`, "i") } }).select(
        "_id",
      ),
      Zone.find({ subzone: { $regex: new RegExp(`^${loc3}$`, "i") } }).select(
        "_id",
      ),
      Zone.find({ subzone: { $regex: new RegExp(`^${loc4}$`, "i") } }).select(
        "_id",
      ),
    ]);

    const counts = await Promise.all([
      // 0. Residencial Web (Suma de Madrid + Costa)
      Ad.countDocuments({
        ...activeFilter,
        department: { $in: ["Residencial", "Costa"] },
      }),

      // 1. Patrimonio
      Ad.countDocuments({ ...activeFilter, department: "Patrimonio" }),

      // 2. Otros Activos (Solo la categoría real que queda)
      Ad.countDocuments({
        ...activeFilter,
        department: "Campos Rústicos & Activos Singulares",
      }),

      // 3. Location 1: Madrid (Usamos el departamento completo para incluir Alcobendas, etc. = 531)
      Ad.countDocuments({ ...activeFilter, department: "Residencial" }),

      // 4. Location 2: Marbella
      Ad.countDocuments({
        ...activeFilter,
        zone: { $in: marbellaZones.map((z) => z._id) },
      }),

      // 5. Location 3: Sotogrande
      Ad.countDocuments({
        ...activeFilter,
        zone: { $in: sotograndeZones.map((z) => z._id) },
      }),

      // 6. Location 4: Puerto de Santa María
      Ad.countDocuments({
        ...activeFilter,
        zone: { $in: puertoZones.map((z) => z._id) },
      }),
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
      portraidImage: req.file ? getCdnUrl(req.file) : "",
    });
    const webHomeCreated = await newWebHome.save();
    revalidateWeb(["home-data"]).catch((err) =>
      console.error("❌ Error revalidando home-data:", err),
    );
    return res.status(200).json(webHomeCreated);
  } catch (err) {
    console.error(err);
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
    revalidateWeb(["home-data"]).catch((err) =>
      console.error("❌ Error revalidando home-data:", err),
    );
    return res.status(200).json(updatedWebHome);
  } catch (err) {
    console.error(err);
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
//     console.error(err);
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
        }).select("title adReference adType sale rent images slug adDirection");

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
              location: ad.adDirection?.city || "",
            };
          })
          .filter(Boolean);

        webHome.videoSection.videos = newVideoCollection;
      } else {
        webHome.videoSection.videos = [];
      }
    }

    const updatedWebHome = await webHome.save();

    // 🚀 ACTUALIZADO: Batching y Fire & Forget
    revalidateWeb(["home-data"]).catch((err) =>
      console.error(
        "❌ Falló revalidación en background (webVideoSectionUpdate):",
        err,
      ),
    );

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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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

      webHomeToUpdate.otherCategoriesImages.singular = getCdnUrl(req.file);
      const updatedWebHome = await WebHome.findByIdAndUpdate(
        id,
        webHomeToUpdate,
        { new: true },
      );
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const webHomeTalkWithUs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webHome = await WebHome.findById(id);

    if (webHome) {
      const webHomeToUpdate = webHome;

      // --- FUNCIÓN DE NORMALIZACIÓN ---
      // Esta función asegura que el dato sea siempre un Array de Strings
      const toArray = (data) => {
        if (!data) return []; // Si no hay datos, array vacío
        if (Array.isArray(data)) return data; // Si ya es array, perfecto
        return [data]; // Si es un string, lo metemos en un array
      };

      // 1. Campos de texto simples
      webHomeToUpdate.talkWithUs.titleHome = req.body.titleHome;
      webHomeToUpdate.talkWithUs.titleContact = req.body.titleContact;
      webHomeToUpdate.talkWithUs.email = req.body.email;
      webHomeToUpdate.talkWithUs.contactButton = req.body.contactButton;
      webHomeToUpdate.talkWithUs.descriptionContact =
        req.body.descriptionContact;

      // 2. Procesar los nuevos campos como ARRAYS
      webHomeToUpdate.talkWithUs.directionsDistrict = toArray(
        req.body.directionsDistrict,
      );
      webHomeToUpdate.talkWithUs.directionsPhone = toArray(
        req.body.directionsPhone,
      );
      webHomeToUpdate.talkWithUs.directionsMapsUrl = toArray(
        req.body.directionsMapsUrl,
      );

      // 3. Procesar teléfonos y direcciones existentes
      webHomeToUpdate.talkWithUs.phones = toArray(req.body.phones);

      const oldDirections = Array.isArray(webHomeToUpdate.talkWithUs.directions)
        ? webHomeToUpdate.talkWithUs.directions
        : [];

      const newDirections = toArray(req.body.directions);
      webHomeToUpdate.talkWithUs.directions = newDirections;

      // ... (Mantenemos tu lógica de replacements de Consultores igual) ...

      // 4. Guardado con markModified
      // Al ser un objeto mixto y haber cambiado arrays, avisamos a Mongoose
      webHome.markModified("talkWithUs");
      const updatedWebHome = await webHome.save();

      // ... revalidate y respuesta ...
      return res.status(200).json(updatedWebHome);
    }
  } catch (err) {
    next(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
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
      revalidateWeb(["home-data"]).catch((err) =>
        console.error("❌ Error revalidando home-data:", err),
      );
      return res.status(200).json(updatedWebHome);
    } else {
      return res.status(400).json({
        statusCode: 400,
        message: "No se han adjuntado imágenes en la petición.",
      });
    }
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const getAdsByReference = async (req, res, next) => {
  try {
    const { ref } = req.query;

    if (!ref) return res.json([]);

    const ads = await Ad.find({
      adReference: { $regex: ref, $options: "i" },

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
    revalidateWeb(["home-data"]).catch((err) =>
      console.error("❌ Error revalidando home-data:", err),
    );
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
      minPrice, // 🚀 Añadido
      maxPrice,
      minSurface, // 🚀 Añadido
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
      agricultural,
      hunting,
      forestry,
      livestock,
      recess,
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
        "puerto de santa maria": "Puerto de Santa María",
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
      $and: [{ $or: [{ showOnWeb: true }, { showOnWebOffMarket: true }] }],
      department: targetDepartment,
    };

    if (zoneIds.length > 0) filter.zone = { $in: zoneIds };

    // --- 4. FILTROS DE OPERACIÓN Y PRECIO ---
    const selectedOps = operation
      ? Array.isArray(operation)
        ? operation
        : operation.split(",")
      : [];

    const normalizedOps = selectedOps
      .map((op) => {
        const lowOp = op.toLowerCase();
        if (["sale", "venta"].includes(lowOp)) return "Venta";
        if (["rent", "alquiler"].includes(lowOp)) return "Alquiler";
        return null;
      })
      .filter(Boolean);

    // 🚀 Función auxiliar para construir la query de precio con mínimos y máximos
    const buildPriceQuery = () => {
      const q = { $gt: 0 };
      if (minPrice) q.$gte = Number(minPrice);
      if (maxPrice) q.$lte = Number(maxPrice);
      return q;
    };

    if (normalizedOps.length > 0) {
      if (normalizedOps.length === 1) {
        filter.adType = { $in: normalizedOps };
      }

      // Evaluamos si existe un mínimo o un máximo
      if (minPrice || maxPrice) {
        const priceOrFilters = [];
        if (normalizedOps.includes("Venta")) {
          priceOrFilters.push({
            "sale.saleValue": buildPriceQuery(),
          });
        }
        if (normalizedOps.includes("Alquiler")) {
          priceOrFilters.push({
            "rent.rentValue": buildPriceQuery(),
          });
        }

        if (priceOrFilters.length > 0) {
          filter.$and.push({ $or: priceOrFilters });
        }
      }
    } else if (minPrice || maxPrice) {
      filter.$and.push({
        $or: [
          { "sale.saleValue": buildPriceQuery() },
          { "rent.rentValue": buildPriceQuery() },
        ],
      });
    }

    // --- 5. ATRIBUTOS Y SUPERFICIE ---
    if (propertyType && propertyType !== "Todos") {
      filter.adBuildingType = { $in: propertyType.split(",") };
    }

    // 🚀 Filtro Dual de Superficie
    if (minSurface || maxSurface) {
      filter.buildSurface = {};
      if (minSurface) filter.buildSurface.$gte = Number(minSurface);
      if (maxSurface) filter.buildSurface.$lte = Number(maxSurface);
    }

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
      "quality.others.agricultural": agricultural,
      "quality.others.hunting": hunting,
      "quality.others.forestry": forestry,
      "quality.others.livestock": livestock,
      "quality.others.recess": recess,
    };

    Object.entries(booleanFilters).forEach(([path, value]) => {
      if (value === "true") filter[path] = true;
    });

    if (garage === "true") filter["quality.parking"] = { $gt: 0 };

    // --- 6. ORDENACIÓN ---
    const isOnlyRent =
      normalizedOps.length === 1 && normalizedOps.includes("Alquiler");

    // Si es solo alquiler, usamos su campo. Si no hay selección o hay venta, usamos venta.
    const sortField = isOnlyRent ? "rent.rentValue" : "sale.saleValue";

    let sortQuery = { [sortField]: -1 };

    const sortOptions = {
      "creat-asc": { createdAt: -1 },
      "creat-des": { createdAt: 1 },
      "price-asc": { [sortField]: 1 },
      "price-desc": { [sortField]: -1 },
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

    // --- 8. FORMATEO DE RESPUESTA Y MEZCLA ---
    const normalAds = [];
    const offMarketAds = [];

    ads.forEach((ad) => {
      const isOffMarket =
        ad.showOnWebOffMarket === true && ad.showOnWeb !== true;

      let categorySlug = ad.department;
      if (ad.department === "Campos Rústicos & Activos Singulares") {
        categorySlug = "otros-activos-y-zonas";
      } else if (
        ad.department?.toLowerCase() === "patrimonial" ||
        ad.department?.toLowerCase() === "patrimonio"
      ) {
        categorySlug = "patrimonio";
      }

      const activeTags = [];
      if (ad.sale?.saleValue && ad.sale?.saleShowOnWeb)
        activeTags.push("Venta");
      if (ad.rent?.rentValue && ad.rent?.rentShowOnWeb)
        activeTags.push("Alquiler");

      if (isOffMarket) {
        offMarketAds.push({
          id: ad._id.toString(),
          slug: ad.slug,
          title: ad.title,
          category: categorySlug,
          ad: ad.profitability && "En Rentabilidad",
          subzone: ad.zone?.[0]?.subzone || null,
          ref: ad.adReference,
          salePrice: ad.sale?.saleValue || null,
          saleShowOnWeb: ad.sale?.saleShowOnWeb,
          rentPrice: ad.rent?.rentValue || null,
          rentShowOnWeb: ad.rent?.rentShowOnWeb,
          operation: activeTags,
          location:
            ad.adDirection?.city ||
            (ad.department === "Campos Rústicos & Activos Singulares"
              ? "España"
              : "Madrid"),
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
          gvOperationClose: ad.gvOperationClose || "",
          tags: [
            ad.adBuildingType?.[0],
            ad.quality?.reformed && "Reformado",
            ...activeTags,
          ]
            .filter(Boolean)
            .slice(0, 4),
          isOffMarket: true,
          consultant: ad.consultant,
          gvOperationClose: ad.gvOperationClose || "",
        });
      } else {
        normalAds.push({
          id: ad._id.toString(),
          slug: ad.slug,
          title: ad.title,
          category: categorySlug,
          profitability: ad.profitability && "En Rentabilidad",
          subzone: ad.zone?.[0]?.subzone || null,
          ref: ad.adReference,
          salePrice: ad.sale?.saleValue || null,
          saleShowOnWeb: ad.sale?.saleShowOnWeb,
          rentPrice: ad.rent?.rentValue || null,
          rentShowOnWeb: ad.rent?.rentShowOnWeb,
          operation: activeTags,
          location:
            ad.adDirection?.city ||
            (ad.department === "Campos Rústicos & Activos Singulares"
              ? "España"
              : "Madrid"),
          image: ad.images?.main || null,
          isOffMarket: false,
          images: [ad.images?.main, ...(ad.images?.others || [])].filter(
            Boolean,
          ),
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
          gvOperationClose: ad.gvOperationClose || "",
          tags: [
            ad.adBuildingType?.[0],
            ad.quality?.reformed && "Reformado",
            ...activeTags,
          ]
            .filter(Boolean)
            .slice(0, 4),
        });
      }
    });

    for (let i = offMarketAds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offMarketAds[i], offMarketAds[j]] = [offMarketAds[j], offMarketAds[i]];
    }

    const formattedAds = [];
    let normalIndex = 0;
    let offMarketIndex = 0;

    while (
      normalIndex < normalAds.length ||
      offMarketIndex < offMarketAds.length
    ) {
      let count = 0;
      while (count < 6 && normalIndex < normalAds.length) {
        formattedAds.push(normalAds[normalIndex]);
        normalIndex++;
        count++;
      }

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
    };

    const ads = await Ad.find(filter)
      .select(
        "title zone slug adType sale rent adDirection images quality buildSurface plotSurface department adReference gvOperationClose",
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
        salePrice: ad.sale?.saleValue || null,
        saleShowOnWeb: ad.sale?.saleShowOnWeb,
        rentPrice: ad.rent?.rentValue || null,
        rentShowOnWeb: ad.rent?.rentShowOnWeb,
        operation: finalOperations,
        location: ad.adDirection?.city || "Madrid",
        image: ad.images?.main || "",
        images: [ad.images?.main, ...(ad.images?.others || [])].filter(Boolean),
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
        gvOperationClose: ad.gvOperationClose || "",
        tags: [
          ad.adBuildingType?.[0],
          ad.profitability && "En Rentabilidad",
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
      consultant: { $ne: "623863e65752e4b62304306b" },
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

    const fixedExpensesIncluded = Number(ad.expensesIncluded) || null;
    const fixedMonthlyRent = Number(ad.monthlyRent) || null;
    const fixedExpenses = Number(ad.expenses) || null;

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
      zoneDescription: mainZone ? mainZone.zoneDescription : null,
      operation: ad.adType,
      description: ad.description?.web,
      distribution: ad.description?.distribution,
      salePrice: salePrice,
      rentPrice: rentPrice,
      priceLabel: priceLabel,
      period: period,
      saleRepercussionM2: saleRepercussionM2,
      saleRepercussionM2ShowOnWeb: saleRepercussionM2ShowOnWeb,
      expenses: fixedExpenses,
      expensesIncluded: fixedExpensesIncluded,
      monthlyRent: fixedMonthlyRent,
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
        jobPositions: ad.quality?.jobPositions || 0,
        beds: ad.quality?.bedrooms || 0,
        baths: ad.quality?.bathrooms || 0,
        area: ad.buildSurface || 0,
        plot: ad.plotSurface || 0,
        year: ad.buildingYear,
        disponibility: ad.disponibility,
        floor: ad.floor,
        subway: ad.quality.subway || "",
        bus: ad.quality.bus || "",
        numberOfPools:
          (ad.quality?.indoorPool || 0) + (ad.quality?.outdoorPool || 0),
        parkingSpots: ad.quality?.parking || 0,
      },
      consultant: ad.consultant || null,
      gvOperationClose: ad.gvOperationClose || "",
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

    let targetDepartment =
      department === "Patrimonial" ? "Patrimonio" : department;

    let zoneIds = [];
    if (
      zone &&
      zone.toLowerCase() !== "madrid" &&
      zone.toLowerCase() !== "espana"
    ) {
      const slugsArray = zone.split(",").map((s) => s.trim().toLowerCase());

      const searchZonesIn =
        targetDepartment === "Patrimonio"
          ? ["Patrimonial"]
          : ["Residencial", "Costa"];

      const zoneConditions = slugsArray.map((slug) => {
        let nameToSearch = slug.replace(/-/g, " ");
        if (nameToSearch === "puerto de santa maria")
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

        const hasCostaZone = matchingZones.some((z) => z.zone === "Costa");
        if (hasCostaZone && targetDepartment === "Residencial") {
          targetDepartment = "Costa";
        }
      } else {
        zoneIds = [new mongoose.Types.ObjectId()];
      }
    }

    const statsMatch = {
      showOnWeb: true,
      department: targetDepartment,
    };

    if (zoneIds.length > 0) {
      statsMatch.zone = { $in: zoneIds };
    }

    const statsResult = await Ad.aggregate([
      { $match: statsMatch },
      {
        $group: {
          _id: null,
          maxPriceSale: { $max: "$sale.saleValue" },
          maxPriceRent: { $max: "$rent.rentValue" },
          maxSurface: { $max: "$buildSurface" },
          // 🚀 Mínimos ignorando nulos o ceros
          minPriceSale: {
            $min: {
              $cond: [
                { $gt: ["$sale.saleValue", 0] },
                "$sale.saleValue",
                9999999999,
              ],
            },
          },
          minPriceRent: {
            $min: {
              $cond: [
                { $gt: ["$rent.rentValue", 0] },
                "$rent.rentValue",
                9999999999,
              ],
            },
          },
          minSurface: {
            $min: {
              $cond: [
                { $gt: ["$buildSurface", 0] },
                "$buildSurface",
                9999999999,
              ],
            },
          },
        },
      },
    ]);

    const rawStats = statsResult[0] || {};

    res.status(200).json({
      success: true,
      data: {
        maxPriceSale: rawStats.maxPriceSale || 10000000,
        maxPriceRent: rawStats.maxPriceRent || 15000,
        maxSurface: rawStats.maxSurface || 5000,
        // 🚀 Limpiamos 9999999999 por si acaso
        minPriceSale:
          rawStats.minPriceSale === 9999999999 ? 0 : rawStats.minPriceSale || 0,
        minPriceRent:
          rawStats.minPriceRent === 9999999999 ? 0 : rawStats.minPriceRent || 0,
        minSurface:
          rawStats.minSurface === 9999999999 ? 0 : rawStats.minSurface || 0,
      },
    });
  } catch (error) {
    console.error("Error en getFilterStats:", error);
    next(error);
  }
};

const getSimilarAds = async (req, res, next) => {
  try {
    const { id } = req.params;

    const currentAd = await Ad.findById(id).lean();

    if (!currentAd) {
      return res.status(404).json({ message: "Anuncio no encontrado" });
    }

    // 1. Filtros base para traer los candidatos
    const currentAdTypes = currentAd.adType || [];
    const filter = {
      _id: { $ne: id }, // Excluimos el anuncio actual
      showOnWeb: true,
      adStatus: { $in: ["En preparación", "Activo"] },
      department: currentAd.department,
      adType: { $in: currentAdTypes },
    };

    // 2. Buscamos en BBDD con un find normal y poblamos las zonas
    const ads = await Ad.find(filter)
      .select(
        "title zone slug adType adBuildingType sale rent adDirection images quality buildSurface plotSurface department adReference gvOperationClose profitability",
      )
      .populate("zone", "name")
      .lean();

    // 3. Preparamos variables para la puntuación (Scoring)
    const basePrice = currentAd.sale?.saleValue || 0;
    const minPrice = basePrice * 0.8;
    const maxPrice = basePrice * 1.2;

    // Pasamos a string los IDs para compararlos fácilmente en JS
    const currentZones = (currentAd.zone || []).map((z) => z.toString());
    const currentBuildingTypes = currentAd.adBuildingType || [];

    // 4. Calculamos la puntuación en JavaScript
    const scoredAds = ads.map((ad) => {
      let zoneScore = 0;
      let buildingTypeScore = 0;
      let priceScore = 0;

      // Evaluar coincidencia de Zona (3 puntos)
      const adZones = (ad.zone || []).map(
        (z) => z._id?.toString() || z.toString(),
      );
      if (adZones.some((z) => currentZones.includes(z))) {
        zoneScore = 3;
      }

      // Evaluar coincidencia de Tipo de Inmueble (1 punto)
      const adBuildingTypes = ad.adBuildingType || [];
      if (adBuildingTypes.some((bt) => currentBuildingTypes.includes(bt))) {
        buildingTypeScore = 1;
      }

      // Evaluar coincidencia de Precio (+- 20%) (1 punto)
      const adPrice = ad.sale?.saleValue || 0;
      if (basePrice > 0 && adPrice >= minPrice && adPrice <= maxPrice) {
        priceScore = 1;
      }

      const totalScore = zoneScore + buildingTypeScore + priceScore;

      return { ...ad, totalScore };
    });

    // 5. Ordenamos por puntuación y nos quedamos con los 10 mejores
    const topSimilarAds = scoredAds
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    // 6. Aplicamos EXACTAMENTE el mismo mapeo que en getHighlightAds
    const formattedAds = topSimilarAds.map((ad) => {
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
        profitability: ad.profitability && "En Rentabilidad",
        salePrice: ad.sale?.saleValue || null,
        saleShowOnWeb: ad.sale?.saleShowOnWeb,
        rentPrice: ad.rent?.rentValue || null,
        rentShowOnWeb: ad.rent?.rentShowOnWeb,
        operation: finalOperations,
        location: ad.adDirection?.city || "Madrid",
        image: ad.images?.main || "",
        images: [ad.images?.main, ...(ad.images?.others || [])].filter(Boolean),
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
        gvOperationClose: ad.gvOperationClose || "",
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
    console.error("❌ Error fetching similar ads:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const updateServicesSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, subtitle, cardsText, key } = req.body;
    const file = req.file;

    if (
      !key ||
      !["residenciales", "patrimoniales", "transversales"].includes(key)
    ) {
      return res.status(400).json({
        message:
          "Falta la clave (key) válida de la sección a editar (residenciales, patrimoniales o transversales)",
      });
    }

    const webHome = await WebHome.findById(id);
    if (!webHome) {
      return res.status(404).json({ message: "WebHome no encontrado" });
    }

    if (!webHome.services) webHome.services = {};
    if (!webHome.services[key]) webHome.services[key] = { cards: [] };

    if (title !== undefined) webHome.services[key].title = title;
    if (subtitle !== undefined) webHome.services[key].subtitle = subtitle;

    if (cardsText) {
      let parsedCards = [];
      try {
        parsedCards =
          typeof cardsText === "string" ? JSON.parse(cardsText) : cardsText;
      } catch (e) {
        return res.status(400).json({ message: "Formato de cards inválido" });
      }

      if (Array.isArray(parsedCards)) {
        webHome.services[key].cards = parsedCards.map((text) => ({ text }));
      }
    }

    if (file) {
      const oldImageUrl = webHome.services[key].image;
      if (oldImageUrl) {
        try {
          await deleteImage(oldImageUrl);
        } catch (e) {
          console.error(
            "Aviso: S3 falló al borrar la imagen de servicios anterior",
            e,
          );
        }
      }
      webHome.services[key].image = getCdnUrl(file);
    }

    webHome.markModified(`services.${key}`);
    const updatedWebHome = await webHome.save();

    // 🚀 ACTUALIZADO: Batching y Fire & Forget
    revalidateWeb(["services", "home-data"]).catch((err) =>
      console.error("❌ Error revalidando:", err),
    );

    return res.status(200).json(updatedWebHome);
  } catch (err) {
    console.error("Error en updateServicesSection:", err);
    return next(err);
  }
};

const getWebServicesPage = async (req, res, next) => {
  try {
    const webData = await WebHome.findOne();

    if (!webData) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron los datos de la web.",
      });
    }
    const servicesData = {
      residenciales: webData.services.residenciales,
      patrimoniales: webData.services.patrimoniales,
      transversales: webData.services.transversales,
    };

    return res.status(200).json({
      success: true,
      data: servicesData,
    });
  } catch (error) {
    console.error("Error en webServicesPage:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al cargar los servicios.",
    });
  }
};

const getWebConsultants = async (req, res) => {
  try {
    const teamMembers = await Consultant.find({ showOnWeb: "Yes" }).select(
      "_id fullName consultantEmail avatar",
    );

    return res.status(200).json({
      success: true,
      data: teamMembers,
    });
  } catch (error) {
    console.error("Error al obtener los consultores:", error);
    return res.status(500).json({
      success: false,
      message: "Hubo un error al obtener la información del equipo.",
    });
  }
};

const getWebContactAndOfficeData = async (req, res, next) => {
  try {
    const webData = await WebHome.findOne();

    if (!webData) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron los datos de la web.",
      });
    }

    const contactData = webData.talkWithUs || {};

    return res.status(200).json({
      success: true,
      data: contactData,
    });
  } catch (error) {
    console.error("Error en getWebContactAndOfficeData:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor al cargar los datos de contacto.",
    });
  }
};

const searchByreference = async (req, res, next) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res
        .status(400)
        .json({ message: "El término de búsqueda es obligatorio" });
    }

    const searchTerm = reference.trim();

    // 1. Escapamos caracteres especiales para que la búsqueda Regex sea segura
    const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 2. SOLO buscamos por Referencia o Título
    const searchConditions = [
      { adReference: { $regex: safeTerm, $options: "i" } },
      { title: { $regex: safeTerm, $options: "i" } },
    ];

    // 3. Ejecutamos la búsqueda final
    const ads = await Ad.find({
      $and: [
        { $or: searchConditions },
        { $or: [{ showOnWeb: true }, { showOnWebOffMarket: true }] },
      ],
    })
      .populate("zone")
      .limit(50);

    if (!ads || ads.length === 0) {
      return res
        .status(404)
        .json({ message: "No se han encontrado resultados" });
    }

    // 4. Mapeamos la respuesta
    const propertiesData = ads.map((ad) => {
      const activeTags = [];
      if (ad.sale?.saleValue && ad.sale?.saleShowOnWeb)
        activeTags.push("Venta");
      if (ad.rent?.rentValue && ad.rent?.rentShowOnWeb)
        activeTags.push("Alquiler");

      const salePrice = ad.sale?.saleShowOnWeb ? ad.sale.saleValue : null;
      const rentPrice = ad.rent?.rentShowOnWeb ? ad.rent.rentValue : null;

      const isOffMarket =
        ad.showOnWebOffMarket === true && ad.showOnWeb !== true;

      return {
        slug: ad.slug,
        title: ad.title,
        image: ad.images?.main || null,
        operation: activeTags,
        gvOperationClose: ad.gvOperationClose || "",
        location: ad.adDirection?.city || "madrid",
        zoneName: ad.zone && ad.zone.length > 0 ? ad.zone[0].name : "",
        category: ad.department,
        buildSurface: ad.buildSurface || 0,
        salePrice: salePrice,
        rentPrice: rentPrice,
        propertyType:
          ad.adBuildingType && ad.adBuildingType.length > 0
            ? ad.adBuildingType[0]
            : "",
        isOffMarket: isOffMarket,
        ref: ad.adReference,
      };
    });

    return res.status(200).json({ success: true, data: propertiesData });
  } catch (error) {
    console.error("Error buscando por referencia/título:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

const downloadAdPDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ad = await Ad.findById(id).populate("consultant").populate("zone");

    if (!ad) {
      return res.status(404).json({ message: "Inmueble no encontrado" });
    }

    let pdfBuffer;

    if (ad.department === "Patrimonio") {
      // Template de Patrimonio
      pdfBuffer = await pdfGenerator.generatePatrimonioPDF(ad);
    } else {
      // Template de Residencial, y el resto de departamentos
      pdfBuffer = await pdfGenerator.generateResidencialPDF(ad);
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Ficha-${ad.adReference}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Error en la generación del PDF:", error);
    return res.status(500).json({ message: "Error interno al generar el PDF" });
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
  getWebServicesPage,
  getAdsByReference,
  getWebConsultants,
  getWebContactAndOfficeData,
  updateServicesSection,
  updateCategoriesSection,
  getFilteredAds,
  getHighlightAds,
  getAdDetails,
  getActiveInventoryZones,
  getFilterStats,
  getSimilarAds,
  searchByreference,
  downloadAdPDF,
};
