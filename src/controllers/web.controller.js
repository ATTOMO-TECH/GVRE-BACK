const { deleteImage } = require("../middlewares/file.middleware");
const Ad = require("../models/ad.model");
const WebHome = require("../models/webHome.model");

const webHomeGet = async (req, res, next) => {
  try {
    // 1. Obtenemos la configuración visual
    const webDocs = await WebHome.find();

    if (!webDocs || webDocs.length === 0) {
      return res.status(200).json([]);
    }

    // Convertimos a objeto JS para poder modificarlo libremente
    let webData = webDocs[0].toObject();

    // 2. Filtro Base
    const activeFilter = {
      adStatus: "Activo",
      showOnWeb: true,
    };

    // 3. Obtenemos nombres de ciudades
    // Usamos el operador ?. por seguridad, aunque tengan defaults
    const city1 = webData.categoriesSection?.location1?.title || "Madrid";
    const city2 = webData.categoriesSection?.location2?.title || "Marbella";
    const city3 = webData.categoriesSection?.location3?.title || "Sotogrande";
    const city4 =
      webData.categoriesSection?.location4?.title || "Puerto de Santa María";

    // 4. Conteos en paralelo
    const [
      countResidential,
      countPatrimonial,
      countOthers,
      countLocation1,
      countLocation2,
      countLocation3,
      countLocation4,
    ] = await Promise.all([
      // A. Departamentos
      Ad.countDocuments({ ...activeFilter, department: "Residencial" }),
      Ad.countDocuments({ ...activeFilter, department: "Patrimonio" }),
      Ad.countDocuments({ ...activeFilter, department: "Otros" }),

      // B. Ciudades (Ubicaciones)
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

    // 5. INYECCIÓN DIRECTA EN CADA OBJETO
    // Verificamos que el objeto exista antes de asignarle el count para evitar errores
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

    // Nota: Ya no creamos webData.categoriesSection.counts

    return res.status(200).json([webData]);
  } catch (err) {
    console.error("Error obteniendo datos de home:", err);
    return next(err);
  }
};

const webHomeCreate = async (req, res, next) => {
  try {
    // console.log(req.body);
    // console.log(req.file);
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

const webVideoSectionUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    const webHome = await WebHome.findById(id);

    if (!webHome) {
      return res.status(404).json({ message: "WebHome no encontrado" });
    }

    const webHomeToUpdate = webHome;

    // 2. Actualizamos el Título (si viene en el body)
    // Usamos el operador ternario o if para no borrar el título si no se envía nada
    if (req.body.title) {
      webHomeToUpdate.videoSection.title = req.body.title;
    }

    if (req.body.subtitle) {
      webHomeToUpdate.videoSection.subtitle = req.body.subtitle;
    }

    // 3. Gestión de los Videos (req.files es un ARRAY)
    if (req.files && req.files.length > 0) {
      // A) LIMPIEZA: Si ya había videos antes, los borramos de la nube para no acumular basura
      if (
        webHomeToUpdate.videoSection.videos &&
        webHomeToUpdate.videoSection.videos.length > 0
      ) {
        // Recorremos el array de videos viejos y los borramos uno a uno
        webHomeToUpdate.videoSection.videos.forEach((videoUrl) => {
          deleteImage(videoUrl);
        });
      }

      // B) GUARDADO: Mapeamos los archivos nuevos para sacar sus URLs (location)
      // req.files devuelve un array de objetos, queremos un array de strings (urls)
      const newVideoUrls = req.files.map((file) => file.location);

      // Asignamos el nuevo array al modelo
      webHomeToUpdate.videoSection.videos = newVideoUrls;
    }

    // 4. Guardamos en Base de Datos
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
    // console.log(req.body);
    // console.log(req.params);
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
      webHomeToUpdate.talkWithUs.directions = req.body.directions;
      webHomeToUpdate.talkWithUs.phones = req.body.phones;
      webHomeToUpdate.talkWithUs.email = req.body.email;
      webHomeToUpdate.talkWithUs.contactButton = req.body.contactButton;
      webHomeToUpdate.talkWithUs.descriptionContact =
        req.body.descriptionContact;
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

    console.log(req.body);

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
    const ads = await Ad.find({ featuredOnMain: true });
    res.status(200).json(ads);
  } catch (error) {
    console.error("Error obteniendo activos destacados:", error);
  }
};

module.exports = {
  webHomeGet,
  webHomeCreate,
  webHomeEdit,
  webVideoSectionUpload,
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
  updateCategoriesSection,
  getMapData,
  getAdCardData,
  getHighlightAds,
};
