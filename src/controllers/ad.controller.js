const Ad = require("./../models/ad.model");
const Request = require("./../models/request.model");
const { deleteImage } = require("../middlewares/file.middleware");
const mongoose = require("mongoose");
const Contact = require("../models/contact.model");
const Consultant = require("../models/consultant.model");
const { normalizeAdHistory } = require("../utils/utils");
const { revalidateWeb } = require("../utils/revalidateWeb");

const repairAds = async (req, res, next) => {
  try {
    const ads = await Ad.find();
    let count = 1;
    for (ad of ads) {
      const fieldsToUpdate = ad;
      fieldsToUpdate.adDirection.address.street =
        ad.adDirection.address.street.trim();
      fieldsToUpdate.adDirection.address.directionNumber =
        ad.adDirection.address.directionNumber.trim();
      fieldsToUpdate.adDirection.address.directionFloor =
        ad.adDirection.address.directionFloor.trim();
      await Ad.findByIdAndUpdate(ad.id, fieldsToUpdate, { new: true });
      count++;
    }
    return res
      .status(200)
      .json(
        `${count} anuncios han sido corregidos. La reparación ha finalizado correctamente`,
      );
  } catch (e) {
    return next(e);
  }
};

const getAdsPaginated = async (req, res, next) => {
  try {
    const search = req.params.query;
    const params = {};
    new URLSearchParams(search).forEach((value, key) => {
      params[key] = value;
    });

    let zoneParam = [];
    if (!!params.zone) {
      zoneParam = params.zone.split(",");
      zoneParam = zoneParam.map((_id) => mongoose.Types.ObjectId(_id));
    }
    let page = !!params.page ? parseInt(params.page) : 1;
    let featuredOnMain = !!params.featuredOnMain ? params.featuredOnMain : true;
    let department = !!params.department ? params.department : true;
    let adReference = !!params.adReference ? params.adReference : true;
    let adType = !!params.adType
      ? params.adType.split(",")
      : ["Alquiler", "Venta"];
    let adBuildingType = !!params.adBuildingType
      ? params.adBuildingType.split(",")
      : [
          "Casa",
          "Piso",
          "Parcela",
          "Ático",
          "Oficina",
          "Edificio",
          "Local",
          "Campo Rústico",
          "Activos singulares",
          "Costa",
        ];
    let hasSwimmingPool = params.swimmingPool === "true" ? true : false;
    let hasGarage = params.garage === "true" ? true : false;
    let hasTerrace = params.terrace === "true" ? true : false;
    let hasexclusiveOffice =
      params.exclusiveOfficeBuilding === "true" ? true : false;
    let hasClassicBuilding = params.classicBuilding === "true" ? true : false;
    let hasCoworking = params.coworking === "true" ? true : false;
    let minSalePrice = !!params.minSalePrice
      ? parseInt(params.minSalePrice)
      : await Ad.find({}, { "sale.saleValue": 1, _id: 0 })
          .sort({ "sale.saleValue": 1 })
          .limit(1);
    let maxSalePrice = !!params.maxSalePrice
      ? parseInt(params.maxSalePrice)
      : await Ad.find({}, { "sale.saleValue": 1, _id: 0 })
          .sort({ "sale.saleValue": -1 })
          .limit(1);
    let minRentPrice = !!params.minRentPrice
      ? parseInt(params.minRentPrice)
      : await Ad.find({}, { "rent.rentValue": 1, _id: 0 })
          .sort({ "rent.rentValue": 1 })
          .limit(1);
    let maxRentPrice = !!params.maxRentPrice
      ? parseInt(params.maxRentPrice)
      : await Ad.find({}, { "rent.rentValue": 1, _id: 0 })
          .sort({ "rent.rentValue": -1 })
          .limit(1);
    let minSurface = !!params.minSurface
      ? parseInt(params.minSurface)
      : await Ad.find({}, { buildSurface: 1, _id: 0 })
          .sort({ buildSurface: 1 })
          .limit(1);
    let maxSurface = !!params.maxSurface
      ? parseInt(params.maxSurface)
      : await Ad.find({}, { buildSurface: 1, _id: 0 })
          .sort({ buildSurface: -1 })
          .limit(1);
    let orderByDate =
      !!params.orderByDate && params.orderByDate === "true" ? true : false;

    // --- Nuevas variables para los filtros de estado de reforma y salida de humos ---
    // ¡Es crucial que estos nombres (params.reformed, params.toReform, params.smokeOutlet)
    // coincidan con los nombres exactos que tu frontend envía en la URL!
    let isReformed = params.reformed === "true" ? true : false;
    let isToReform = params.toReform === "true" ? true : false;
    let hasSmokeOutlet = params.smokeOutlet === "true" ? true : false;

    // Reemplazar la construcción de `query` encadenando `.and()` por un objeto de condiciones.
    // Esto permite combinar AND y OR de forma flexible sin reescribir todo.
    // Se inicializa con las condiciones que siempre deben aplicarse (department, showOnWeb).
    let andConditions = [{ department: department, showOnWeb: true }];

    // --- Mover los filtros existentes a andConditions ---
    // Aquí solo se empujan condiciones si el parámetro existe en `params`
    if (!!params.featuredOnMain)
      andConditions.push({ featuredOnMain: featuredOnMain });
    if (!!params.zone) {
      andConditions.push({ zone: { $in: zoneParam } });
    }
    if (!!params.adType) andConditions.push({ adType: { $in: adType } });
    if (!!params.adReference) andConditions.push({ adReference: adReference }); // Usar adReference directamente
    if (!!params.adBuildingType)
      andConditions.push({ adBuildingType: { $in: adBuildingType } });
    if (!!params.swimmingPool)
      andConditions.push({ "quality.others.swimmingPool": hasSwimmingPool });
    if (!!params.garage)
      andConditions.push({ "quality.others.garage": hasGarage });
    if (!!params.terrace)
      andConditions.push({ "quality.others.terrace": hasTerrace });
    if (!!params.exclusiveOfficeBuilding)
      andConditions.push({
        "quality.others.exclusiveOfficeBuilding": hasexclusiveOffice,
      });
    if (!!params.classicBuilding)
      andConditions.push({
        "quality.others.classicBuilding": hasClassicBuilding,
      });
    if (!!params.coworking)
      andConditions.push({ "quality.others.coworking": hasCoworking });

    // Lógica para rangos de precios y superficies (se mantiene como la tenías, ajustada al array)
    // Se asume que minSalePrice, maxSalePrice, etc. ya son números o arrays de un elemento.
    if (!!params.minSurface && !!params.maxSurface) {
      andConditions.push({
        buildSurface: { $gte: minSurface, $lte: maxSurface },
      });
    } else {
      andConditions.push({
        buildSurface: {
          $gte: minSurface[0].buildSurface,
          $lte: maxSurface[0].buildSurface,
        },
      });
    }

    if (!!params.adType && adType.length === 1) {
      if (adType[0] === "Venta") {
        if (!!params.minSalePrice && !!params.maxSalePrice) {
          andConditions.push({
            "sale.saleValue": {
              $gte: minSalePrice,
              $lte: maxSalePrice,
            },
          });
        } else {
          andConditions.push({
            "sale.saleValue": {
              $gte: minSalePrice[0].sale.saleValue,
              $lte: maxSalePrice[0].sale.saleValue,
            },
          });
        }
      }
      if (adType[0] === "Alquiler") {
        if (!!params.minRentPrice && !!params.maxRentPrice) {
          andConditions.push({
            "rent.rentValue": {
              $gte: minRentPrice,
              $lte: maxRentPrice,
            },
          });
        } else {
          andConditions.push({
            "rent.rentValue": {
              $gte: minRentPrice[0].rent.rentValue,
              $lte: maxRentPrice[0].rent.rentValue,
            },
          });
        }
      }
    }
    // --- Fin de filtros existentes movidos ---

    // --- ¡Nuevas líneas para los filtros de estado de reforma y salida de humos! ---
    const reformedToReformOrConditions = [];

    // Si 'reformed' es true en los parámetros de la URL
    if (isReformed) {
      reformedToReformOrConditions.push({ "quality.reformed": true });
    }
    // Si 'toReform' es true en los parámetros de la URL
    if (isToReform) {
      reformedToReformOrConditions.push({ "quality.toReform": true });
    }

    // Si al menos uno de 'reformed' o 'toReform' está activo, añadir la condición $or al array principal
    if (reformedToReformOrConditions.length > 0) {
      andConditions.push({ $or: reformedToReformOrConditions });
    }
    // Filtro para 'smokeOutlet' (es un AND, por lo que se añade directamente si es true)
    if (hasSmokeOutlet) {
      andConditions.push({ "quality.others.smokeOutlet": true });
    }
    // --- Fin de nuevas líneas añadidas ---

    // Ahora, en lugar de `const query = Ad.find();` y `query.where().and()`,
    // usamos el array `andConditions` para construir la query final.
    // Si `andConditions` tiene solo un elemento (e.g., `{ department: ..., showOnWeb: ... }`),
    // lo usamos directamente. Si tiene más, los combinamos con `$and`.
    const finalMongoQuery =
      andConditions.length > 0 ? { $and: andConditions } : {};

    // --- Paginación y Ordenación (se mantiene tu lógica, pero aplicada a finalMongoQuery) ---
    const adsPerPage = 30;
    let sortOptions = {};

    if (orderByDate) {
      sortOptions = { createdAt: -1 };
    } else {
      // Tu lógica de ordenación existente
      if (!!params.adType && adType.length === 1) {
        if (adType[0] === "Alquiler") {
          sortOptions = { "rent.rentValue": -1 };
        } else {
          // Asumo que si length es 1 y no es Alquiler, es Venta
          sortOptions = { "sale.saleValue": -1 };
        }
      } else {
        // Si no hay tipo específico o ambos
        sortOptions = { "sale.saleValue": -1, "rent.rentValue": -1 };
      }
    }

    const totalAds = await Ad.countDocuments(finalMongoQuery);
    const ads = await Ad.find(finalMongoQuery)
      .sort(sortOptions)
      .limit(adsPerPage)
      .skip((page - 1) * adsPerPage)
      .exec();

    let totalPages = Math.ceil(totalAds / adsPerPage);
    if (totalAds === 0) totalPages = 1;

    const messageToSend = {
      totalAds,
      totalPages,
      ads,
    };

    return res.status(200).json(messageToSend);
  } catch (err) {
    console.error("Error en getAdsPaginated:", err); // Añadir para depuración
    return next(err);
  }
};

const adGetAll = async (req, res, next) => {
  try {
    const ads = await Ad.find()
      .populate({ path: "owner", select: "fullName" })
      .populate({ path: "consultant", select: "fullName" })
      .populate({ path: "zone", select: "zone name" });
    return res.status(200).json(ads);
  } catch (err) {
    return next(err);
  }
};

const adGetByFilters = async (req, res, next) => {
  try {
    let limit = 100;

    let { department, sortField, sortOrder, page, search } = req.query;

    // ELIMINA JSON.parse() aquí. Express ya te da el objeto/array.
    let adStatusValue = req.query.adStatus;
    let gvOperationCloseValue = req.query.gvOperationClose;
    let adBuildingTypeValue = req.query.adBuildingType;
    let zoneValue = req.query.zone;
    let adTypeValue = req.query.adType;

    department = department !== "Todos" ? department : undefined;

    const queryConditions = {};

    function createAccentInsensitiveRegex(str) {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remueve los acentos
        .replace(/a/g, "[aá]")
        .replace(/e/g, "[eé]")
        .replace(/i/g, "[ií]")
        .replace(/o/g, "[oó]")
        .replace(/u/g, "[uúü]")
        .replace(/c/g, "[cç]") // Si necesitas otros caracteres, añádelos aquí
        .replace(/n/g, "[nñ]");
    }

    if (search) {
      // Tu código existente para obtener ownerIds y consultantIds...
      const ownerIds = await Contact.find(
        {
          fullName: {
            $regex: new RegExp(createAccentInsensitiveRegex(search), "i"),
          },
        },
        "_id",
      ).then((contacts) => contacts.map((contact) => contact._id));

      const consultantIds = await Consultant.find(
        {
          fullName: {
            $regex: new RegExp(createAccentInsensitiveRegex(search), "i"),
          },
        },
        "_id",
      ).then((consultants) => consultants.map((consultant) => consultant._id));

      const searchParts = search.split(" ");
      let numberPart = searchParts.pop(); // Asumimos inicialmente que el último elemento podría ser un número
      let streetPart = searchParts.join(" ");
      const isNumber = !isNaN(parseInt(numberPart, 10)); // Verificamos si es realmente un número

      // Revertimos la extracción si no era un número
      if (!isNumber) {
        streetPart = search; // Usar toda la búsqueda como nombre de la calle si no hay número
        numberPart = ""; // No hay parte numérica
      }

      // Preparamos las regex para la calle y el número, insensibles a tildes y mayúsculas
      const streetRegex = new RegExp(
        createAccentInsensitiveRegex(streetPart),
        "i",
      );
      const numberRegex = new RegExp(numberPart, "i"); // Usado solo si isNumber es true

      // Construir la condición de búsqueda para la dirección
      let addressSearchCondition = {};
      if (streetPart) {
        if (isNumber) {
          // Solo crea una condición compuesta si hay tanto una calle como un número
          addressSearchCondition = {
            $and: [
              { "adDirection.address.street": { $regex: streetRegex } },
              {
                "adDirection.address.directionNumber": { $regex: numberRegex },
              },
            ],
          };
        } else {
          // Si no hay número, solo busca por la calle
          addressSearchCondition = {
            "adDirection.address.street": { $regex: streetRegex },
          };
        }
      }

      // Condiciones de búsqueda originales para otros campos
      const originalSearchConditions = [
        {
          adReference: {
            $regex: new RegExp(createAccentInsensitiveRegex(search), "i"),
          },
        },
        {
          title: {
            $regex: new RegExp(createAccentInsensitiveRegex(search), "i"),
          },
        },
        ...(ownerIds.length > 0 ? [{ owner: { $in: ownerIds } }] : []),
        ...(consultantIds.length > 0
          ? [{ consultant: { $in: consultantIds } }]
          : []),
      ];

      // Combinar todas las condiciones en la consulta principal
      queryConditions.$or = [
        ...originalSearchConditions,
        ...(Object.keys(addressSearchCondition).length > 0
          ? [addressSearchCondition]
          : []),
      ];
    }

    if (adStatusValue && adStatusValue.length > 0)
      queryConditions.adStatus = {
        $in: adStatusValue.map((item) => item.name),
      };

    if (gvOperationCloseValue && gvOperationCloseValue.length > 0)
      queryConditions.gvOperationClose = {
        $in: gvOperationCloseValue.map((item) => item.name),
      };

    if (adBuildingTypeValue && adBuildingTypeValue.length > 0)
      queryConditions.adBuildingType = {
        $in: adBuildingTypeValue.map((item) => item.name),
      };

    if (adTypeValue && adTypeValue.length > 0)
      queryConditions.adType = {
        $in: adTypeValue.map((item) => item.name),
      };

    if (zoneValue && zoneValue.length > 0)
      queryConditions.zone = {
        $in: zoneValue.map((item) => mongoose.Types.ObjectId(item._id)),
      };

    if (department) queryConditions.department = department;

    let sort = { updatedAt: -1 };

    if (sortField && (sortOrder === "ASC" || sortOrder === "DESC")) {
      sort = { [sortField]: sortOrder === "ASC" ? 1 : -1 };
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const ads = await Ad.find(queryConditions)
      .populate("zone", "zone name")
      .populate("owner", "fullName")
      .populate("consultant", "fullName")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalElements = await Ad.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalElements / limit);

    return res.status(200).json({
      ads,
      pageInfo: {
        page,
        totalPages,
        totalElements,
        limit,
      },
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const adGetMatchedRequests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById({ _id: id });
    const search = req.query.search;

    // Query constructor
    let query = Request.find();

    if (ad.adType.length !== 0)
      query.where({ requestAdType: { $in: ad.adType } });
    if (ad.adBuildingType.length !== 0)
      query.where({ requestBuildingType: { $in: ad.adBuildingType } });
    if (ad.zone.length !== 0) query.where({ requestZone: { $in: ad.zone } });

    if (!ad.sale.saleValue) ad.sale.saleValue = 0;
    query.where({
      "requestSalePrice.salePriceMax": { $gte: ad.sale.saleValue },
      "requestSalePrice.salePriceMin": { $lte: ad.sale.saleValue },
    });

    if (!ad.rent.rentValue) ad.rent.rentValue = 0;
    query.where({
      "requestRentPrice.rentPriceMax": { $gte: ad.rent.rentValue },
      "requestRentPrice.rentPriceMin": { $lte: ad.rent.rentValue },
    });

    if (!ad.buildSurface) ad.buildSurface = 0;
    query.where({
      "requestBuildSurface.buildSurfaceMax": { $gte: ad.buildSurface },
      "requestBuildSurface.buildSurfaceMin": { $lte: ad.buildSurface },
    });

    if (!ad.plotSurface) ad.plotSurface = 0;
    query.where({
      "requestPlotSurface.plotSurfaceMax": { $gte: ad.plotSurface },
      "requestPlotSurface.plotSurfaceMin": { $lte: ad.plotSurface },
    });

    if (!ad.quality.bedrooms) ad.quality.bedrooms = 0;
    query.where({
      "requestBedrooms.bedroomsMax": { $gte: ad.quality.bedrooms },
      "requestBedrooms.bedroomsMin": { $lte: ad.quality.bedrooms },
    });

    if (!ad.quality.bathrooms) ad.quality.bathrooms = 0;
    query.where({
      "requestBathrooms.bathroomsMax": { $gte: ad.quality.bathrooms },
      "requestBathrooms.bathroomsMin": { $lte: ad.quality.bathrooms },
    });

    if (ad.quality.others.smokeOutlet === false) {
      query.where({ smokeOutlet: { $ne: true } });
    }

    if (!ad.profitability) {
      query.where({ profitability: { $ne: true } });
    }

    query.populate({
      path: "requestContact",
      select: "fullName company email contactComments notReceiveCommunications",
    });

    // Ejecutar la query
    const requests = await query.exec();

    // Filtrar si hay búsqueda
    let filteredRequests = requests;
    if (search) {
      const regex = new RegExp(search, "i");
      filteredRequests = requests.filter((req) => {
        const name = req.requestContact?.fullName || "";
        const company = req.requestContact?.company || "";
        const comment = req.requestComment || "";
        return regex.test(name) || regex.test(company) || regex.test(comment);
      });
    }

    if (ad.adStatus === "Activo") {
      return res.status(200).json(filteredRequests);
    } else {
      return next();
    }
  } catch (err) {
    return next(err);
  }
};

const adGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    return res.status(200).json(ad);
  } catch (err) {
    return next(err);
  }
};

const getAdsByContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;

    const ads = await Ad.find({ owner: contactId })
      .select({
        title: 1,
        adReference: 1,
        adStatus: 1,
        adBuildingType: 1,
        buildSurface: 1,
        plotSurface: 1,
        "adDirection.city": 1,
        "adDirection.address.street": 1,
        "sale.saleValue": 1,
        "rent.rentValue": 1,
        "quality.bedrooms": 1,
        "quality.bathrooms": 1,
        "quality.others.lift": 1,
        "images.main": 1,
        zone: 1, // Necesario para el populate
        createdAt: 1,
        updatedAt: 1,
      })
      .populate("zone", "name"); // Traemos solo el nombre de la zona

    return res.status(200).json(ads);
  } catch (err) {
    return next(err);
  }
};

const allAdsGetByIdConsultant = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const ad = await Ad.find({ consultant: consultantId });
    return res.status(200).json(ad);
  } catch (err) {
    return next(err);
  }
};

const adCreate = async (req, res, next) => {
  try {
    const idCopy = req.body.idCopy;

    let images = {
      main: "",
      blueprint: [],
      others: [],
      media: "",
    };

    // 🔁 Si hay un anuncio a copiar, copia sus imágenes
    if (idCopy) {
      const adToCopy = await Ad.findById(idCopy);
      if (adToCopy) {
        images = {
          main: adToCopy.images.main,
          blueprint: [...adToCopy.images.blueprint],
          others: [...adToCopy.images.others],
          media: adToCopy.images.media,
        };
      }
    }
    const adDirection = {
      address: {
        street: req.body.street,
        directionNumber: req.body.directionNumber,
        directionFloor: req.body.directionFloor ? req.body.directionFloor : "",
      },
      postalCode: req.body.postalCode ? req.body.postalCode : "",
      city: req.body.city ? req.body.city : "",
      country: req.body.country ? req.body.country : "",
    };

    const sale = {
      saleValue: req.body.saleValue,
      saleShowOnWeb: req.body.saleShowOnWeb,
    };

    const rent = {
      rentValue: req.body.rentValue,
      rentShowOnWeb: req.body.rentShowOnWeb,
    };

    const communityExpenses = {
      expensesValue: req.body.expensesValue,
      expensesShowOnWeb: req.body.expensesShowOnWeb,
    };
    const ibi = {
      ibiValue: req.body.ibiValue,
      ibiShowOnWeb: req.body.ibiShowOnWeb,
    };

    const trashFee = {
      trashFeeValue: req.body.trashFeeValue,
      trashFeeShowOnWeb: req.body.trashFeeShowOnWeb,
    };

    const quality = {
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      parking: req.body.parking,
      reformed: req.body.reformed,
      toReform: req.body.toReform,
      indoorPool: req.body.indoorPool,
      outdoorPool: req.body.outdoorPool,
      jobPositions: req.body.jobPositions,
      subway: req.body.subway,
      bus: req.body.bus,
      others: {
        lift: req.body.lift,
        dumbwaiter: req.body.dumbwaiter,
        liftTruck: req.body.liftTruck,
        airConditioning: req.body.airConditioning,
        centralHeating: req.body.centralHeating,
        subfloorHeating: req.body.subfloorHeating,
        indoorAlarm: req.body.indoorAlarm,
        outdoorAlarm: req.body.outdoorAlarm,
        fullHoursSecurity: req.body.fullHoursSecurity,
        gunRack: req.body.gunRack,
        strongBox: req.body.strongBox,
        well: req.body.well,
        homeAutomation: req.body.homeAutomation,
        centralVacuum: req.body.centralVacuum,
        padelCourt: req.body.padelCourt,
        tennisCourt: req.body.tennisCourt,
        terrace: req.body.terrace,
        storage: req.body.storage,
        swimmingPool: req.body.swimmingPool,
        garage: req.body.garage,
        falseCeiling: req.body.falseCeiling,
        raisedFloor: req.body.raisedFloor,
        qualityBathrooms: req.body.qualityBathrooms,
        freeHeight: req.body.freeHeight,
        smokeOutlet: req.body.smokeOutlet,
        accessControl: req.body.accessControl,
        furnished: req.body.furnished,
        implanted: req.body.implanted,
        separateEntrance: req.body.separateEntrance,
        exclusiveOfficeBuilding: req.body.exclusiveOfficeBuilding,
        classicBuilding: req.body.classicBuilding,
        coworking: req.body.coworking,
      },
    };

    const description = {
      web: req.body.web,
      emailPDF: req.body.emailPDF,
      distribution: req.body.distribution,
    };

    const newAd = new Ad({
      title: req.body.title,
      adReference: req.body.adReference,
      internalComments: req.body.internalComments,
      adStatus: req.body.adStatus,
      showOnWeb: req.body.showOnWeb,
      featuredOnMain: req.body.featuredOnMain,
      featuredDrawings: req.body.featuredDrawings,
      adDirection: adDirection,
      adType: req.body.adType,
      gvOperationClose: req.body.gvOperationClose,
      owner: req.body.owner,
      consultant: req.body.consultant,
      adBuildingType: req.body.adBuildingType,
      zone: req.body.zone,
      distrito: req.body.distrito,
      barrio: req.body.barrio,
      department: req.body.department,
      webSubtitle: req.body.webSubtitle,
      buildSurface: req.body.buildSurface,
      plotSurface: req.body.plotSurface,
      floor: req.body.floor,
      disponibility: req.body.disponibility,
      surfacesBox: req.body.surfacesBox,
      sale,
      rent,
      monthlyRent: req.body.monthlyRent,
      expenses: req.body.expenses,
      expensesIncluded: req.body.expensesIncluded,
      communityExpenses,
      ibi,
      trashFee: trashFee,
      buildingYear: req.body.buildingYear,
      quality,
      description,
      images,
    });
    // Add initial CREATION entry to changesHistory (persisted)
    try {
      let consultantInfo = null;
      if (req.body.userId) {
        try {
          const c = await Consultant.findById(
            req.body.userId,
            "fullName",
          ).lean();
          if (c) consultantInfo = { _id: c._id, fullName: c.fullName };
        } catch (e) {
          // ignore resolution errors and leave consultantInfo null
        }
      }

      const creationEntry = {
        type: "CREATION",
        field: "createdAt",
        oldValue: null,
        newValue: new Date(),
        date: new Date(),
        consultant: consultantInfo,
        note: "Creación del anuncio",
      };

      newAd.changesHistory = [creationEntry];
    } catch (e) {
      // If anything goes wrong while preparing the history, continue without blocking creation
      console.error("Failed to prepare creation history entry:", e);
    }

    const adCreated = await newAd.save();

    // =====================================================================
    // 🔌 INTEGRACIÓN ISR: REVALIDACIÓN AUTOMÁTICA
    // =====================================================================

    // CORRECCIÓN: Definimos qué estados son visibles en la web
    const validStatuses = ["Activo", "En preparación"];

    // Evaluamos si el anuncio debe verse:
    // 1. Tiene el check de showOnWeb en true
    // 2. Y su estado es "Activo" O "En preparación"
    const isVisible =
      adCreated.showOnWeb && validStatuses.includes(adCreated.adStatus);

    if (isVisible) {
      await Promise.all([
        // A. Home: Porque cambian los contadores (Madrid: 20 -> 21)
        revalidateWeb("home-data"),

        // B. Listado: Para que aparezca la nueva Card en búsquedas
        revalidateWeb("ads-list"),

        // C. Destacados: Solo si está marcado
        adCreated.featuredOnMain
          ? revalidateWeb("featured-ads")
          : Promise.resolve(),
      ]);
    }

    return res.status(200).json(adCreated);
  } catch (err) {
    return next(err);
  }
};

const adMainImageUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    fieldsToUpdate.images.main = req.file
      ? `https://${req.file.bucket}.fra1.digitaloceanspaces.com/${req.file.key}`
      : "";

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adMediaImageUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    fieldsToUpdate.images.media = req.file
      ? `https://${req.file.bucket}.fra1.digitaloceanspaces.com/${req.file.key}`
      : "";

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adBlueprintImageUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    const newImageUrls = req.files
      ? req.files.map(
          (file) =>
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`,
        )
      : [];

    if (newImageUrls.length === 0) {
      const ad = await Ad.findById(id);
      return res.status(200).json(ad);
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      {
        $push: { "images.blueprint": { $each: newImageUrls } },
      },
      { new: true },
    );

    if (!updatedAd) {
      return res.status(404).json({ message: "Anuncio no encontrado." });
    }

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adOthersImagesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Obtenemos las URLs de los archivos recién subidos por Multer.
    const newImageUrls = req.files
      ? req.files.map(
          (file) =>
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`,
        )
      : [];

    // Si por alguna razón no se subieron archivos, devolvemos el anuncio actual.
    if (newImageUrls.length === 0) {
      const ad = await Ad.findById(id);
      return res.status(200).json(ad);
    }

    // 2. Usamos '$push' con '$each' para añadir TODAS las nuevas URLs al array 'images.others'
    // en una sola operación atómica y segura.
    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      {
        $push: { "images.others": { $each: newImageUrls } },
      },
      { new: true }, // Esta opción nos devuelve el documento ya actualizado.
    );

    if (!updatedAd) {
      return res.status(404).json({ message: "Anuncio no encontrado." });
    }

    // 3. Devolvemos el anuncio completo y actualizado al frontend.
    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adMainImagesDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    deleteImage(req.body.toDelete);
    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    fieldsToUpdate.images.main = "";

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adMediaImagesDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    deleteImage(req.body.toDelete);
    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    fieldsToUpdate.images.media = "";

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adBlueprintImagesDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { toDelete } = req.body;

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    // Asegúrate de que sea un array
    const imagesToDelete = Array.isArray(toDelete) ? toDelete : [toDelete];

    // Eliminar del storage
    await Promise.all(imagesToDelete.map((img) => deleteImage(img)));
    // Filtrar las imágenes del array
    fieldsToUpdate.images.blueprint = fieldsToUpdate.images.blueprint.filter(
      (location) => !imagesToDelete.includes(location),
    );

    // Guardar en la base de datos
    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adOthersImagesDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { toDelete } = req.body;

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    // ✅ Asegúrate de tener un array
    const imagesToDelete = Array.isArray(toDelete) ? toDelete : [toDelete];

    // ✅ Elimina físicamente cada imagen
    await Promise.all(imagesToDelete.map((img) => deleteImage(img)));

    // ✅ Filtra del array original
    fieldsToUpdate.images.others = fieldsToUpdate.images.others.filter(
      (location) => !imagesToDelete.includes(location),
    );

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adUpdate = async (req, res, next) => {
  try {
    const { id } = req.body;

    // 1. Cargar estado ACTUAL (antes del cambio) para comparar
    // Usamos .lean() para optimizar la comparación inicial
    const currentAd = await Ad.findById(id)
      .populate("owner", "fullName")
      .populate("consultant", "fullName")
      .lean();

    if (!currentAd) {
      return res.status(404).json({ message: "Anuncio no encontrado" });
    }

    // 2. Mapeo EXHAUSTIVO de campos (Sin omitir nada)
    const fieldsToUpdate = {};

    fieldsToUpdate.title = req.body.title;
    fieldsToUpdate.showOnWeb = req.body.showOnWeb;
    fieldsToUpdate.adStatus = req.body.adStatus;
    fieldsToUpdate.adReference = req.body.adReference;
    fieldsToUpdate.internalComments = req.body.internalComments;
    fieldsToUpdate.featuredOnMain = req.body.featuredOnMain;
    fieldsToUpdate.featuredDrawings = req.body.featuredDrawings;
    fieldsToUpdate.adType = req.body.adType;
    fieldsToUpdate.gvOperationClose = req.body.gvOperationClose;
    fieldsToUpdate.owner = req.body.owner;
    fieldsToUpdate.consultant = req.body.consultant;
    fieldsToUpdate.adBuildingType = req.body.adBuildingType;
    fieldsToUpdate.zone = req.body.zone;
    fieldsToUpdate.department = req.body.department;
    fieldsToUpdate.webSubtitle = req.body.webSubtitle;
    fieldsToUpdate.profitability = req.body.profitability;
    fieldsToUpdate.profitabilityValue = req.body.profitabilityValue;
    fieldsToUpdate.buildSurface = req.body.buildSurface;
    fieldsToUpdate.plotSurface = req.body.plotSurface;
    fieldsToUpdate.floor = req.body.floor;
    fieldsToUpdate.disponibility = req.body.disponibility;
    fieldsToUpdate.monthlyRent = req.body.monthlyRent;
    fieldsToUpdate.expenses = req.body.expenses;
    fieldsToUpdate.expensesIncluded = req.body.expensesIncluded;
    fieldsToUpdate.distrito = req.body.distrito;
    fieldsToUpdate.barrio = req.body.barrio;

    // Campos anidados: Dirección
    fieldsToUpdate.adDirection = {
      address: {
        street: req.body.street,
        directionNumber: req.body.directionNumber,
        directionFloor: req.body.directionFloor,
      },
      postalCode: req.body.postalCode,
      city: req.body.city,
      country: req.body.country,
    };

    fieldsToUpdate.surfacesBox = req.body.surfacesBox;

    // Campos anidados: Venta y Alquiler
    fieldsToUpdate.sale = {
      saleValue: req.body.saleValue,
      saleShowOnWeb: req.body.saleShowOnWeb,
    };
    fieldsToUpdate.rent = {
      rentValue: req.body.rentValue,
      rentShowOnWeb: req.body.rentShowOnWeb,
    };

    // Campos anidados: Gastos
    fieldsToUpdate.communityExpenses = {
      expensesValue: req.body.expensesValue,
      expensesShowOnWeb: req.body.expensesShowOnWeb,
    };

    fieldsToUpdate.ibi = {
      ibiValue: req.body.ibiValue,
      ibiShowOnWeb: req.body.ibiShowOnWeb,
    };

    fieldsToUpdate.trashFee = {
      trashFeeValue: req.body.trashFeeValue,
      trashFeeShowOnWeb: req.body.trashFeeShowOnWeb,
    };

    // Campos anidados: Calidades (Lista completa)
    fieldsToUpdate.quality = {
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      parking: req.body.parking,
      reformed: req.body.reformed,
      toReform: req.body.toReform,
      indoorPool: req.body.indoorPool,
      outdoorPool: req.body.outdoorPool,
      jobPositions: req.body.jobPositions,
      subway: req.body.subway,
      bus: req.body.bus,
      others: {
        lift: req.body.lift,
        dumbwaiter: req.body.dumbwaiter,
        liftTruck: req.body.liftTruck,
        airConditioning: req.body.airConditioning,
        centralHeating: req.body.centralHeating,
        subfloorHeating: req.body.subfloorHeating,
        indoorAlarm: req.body.indoorAlarm,
        outdoorAlarm: req.body.outdoorAlarm,
        fullHoursSecurity: req.body.fullHoursSecurity,
        gunRack: req.body.gunRack,
        strongBox: req.body.strongBox,
        well: req.body.well,
        homeAutomation: req.body.homeAutomation,
        centralVacuum: req.body.centralVacuum,
        padelCourt: req.body.padelCourt,
        tennisCourt: req.body.tennisCourt,
        terrace: req.body.terrace,
        storage: req.body.storage,
        swimmingPool: req.body.swimmingPool,
        garage: req.body.garage,
        falseCeiling: req.body.falseCeiling,
        raisedFloor: req.body.raisedFloor,
        qualityBathrooms: req.body.qualityBathrooms,
        freeHeight: req.body.freeHeight,
        smokeOutlet: req.body.smokeOutlet,
        accessControl: req.body.accessControl,
        furnished: req.body.furnished,
        implanted: req.body.implanted,
        separateEntrance: req.body.separateEntrance,
        exclusiveOfficeBuilding: req.body.exclusiveOfficeBuilding,
        classicBuilding: req.body.classicBuilding,
        coworking: req.body.coworking,
      },
    };

    fieldsToUpdate.description = {
      web: req.body.web,
      emailPDF: req.body.emailPDF,
      distribution: req.body.distribution,
    };

    // 3. Lógica del Historial (Changes History)
    const historyEntries = [];

    // Resolver información del consultor
    let consultantInfo = null;
    if (req.body.userId) {
      try {
        const c = await Consultant.findById(req.body.userId, "fullName").lean();
        if (c) consultantInfo = { _id: c._id, fullName: c.fullName };
      } catch (e) {
        /* ignore */
      }
    }

    // Fallback al consultor actual si no viene userId
    if (!consultantInfo && currentAd && currentAd.consultant) {
      consultantInfo =
        currentAd.consultant && currentAd.consultant.fullName
          ? {
              _id: currentAd.consultant._id,
              fullName: currentAd.consultant.fullName,
            }
          : { _id: currentAd.consultant };
    }

    // Historial: Cambio de Precio Venta
    if (req.body.saleValue !== undefined) {
      const oldSale =
        currentAd && currentAd.sale ? currentAd.sale.saleValue : null;
      const newSale = req.body.saleValue;
      if (
        oldSale || oldSale === 0
          ? Number(oldSale) !== Number(newSale)
          : newSale !== undefined && newSale !== null
      ) {
        historyEntries.push({
          type: "PRICE_CHANGE",
          field: "sale.saleValue",
          oldValue: oldSale,
          newValue: newSale,
          date: new Date(),
          consultant: consultantInfo,
          note: "Cambio de precio de venta",
        });
      }
    }

    // Historial: Cambio de Precio Alquiler
    if (req.body.rentValue !== undefined) {
      const oldRent =
        currentAd && currentAd.rent ? currentAd.rent.rentValue : null;
      const newRent = req.body.rentValue;
      if (
        oldRent || oldRent === 0
          ? Number(oldRent) !== Number(newRent)
          : newRent !== undefined && newRent !== null
      ) {
        historyEntries.push({
          type: "PRICE_CHANGE",
          field: "rent.rentValue",
          oldValue: oldRent,
          newValue: newRent,
          date: new Date(),
          consultant: consultantInfo,
          note: "Cambio de precio de alquiler",
        });
      }
    }

    // Historial: Cambio de Propietario
    if (req.body.owner !== undefined) {
      const oldOwnerId =
        currentAd && currentAd.owner
          ? currentAd.owner._id
            ? String(currentAd.owner._id)
            : String(currentAd.owner)
          : null;
      const newOwnerId = req.body.owner ? String(req.body.owner) : null;
      if (oldOwnerId !== newOwnerId) {
        let oldOwnerName = null;
        let newOwnerName = null;
        try {
          if (oldOwnerId) {
            const o = await Contact.findById(oldOwnerId, "fullName").lean();
            if (o) oldOwnerName = o.fullName;
          }
        } catch (e) {}
        try {
          if (newOwnerId) {
            const n = await Contact.findById(newOwnerId, "fullName").lean();
            if (n) newOwnerName = n.fullName;
          }
        } catch (e) {}

        historyEntries.push({
          type: "OWNER_CHANGE",
          field: "owner",
          oldValue: { _id: oldOwnerId, name: oldOwnerName },
          newValue: { _id: newOwnerId, name: newOwnerName },
          date: new Date(),
          consultant: consultantInfo,
          note: "Cambio de propietario",
        });
      }
    }

    // Historial: Cambio de Tipo de Anuncio
    if (req.body.adType !== undefined) {
      const oldType = currentAd && currentAd.adType ? currentAd.adType : null;
      const newType = req.body.adType;
      const oldStr = JSON.stringify(oldType || []);
      const newStr = JSON.stringify(newType || []);
      if (oldStr !== newStr) {
        historyEntries.push({
          type: "ADTYPE_CHANGE",
          field: "adType",
          oldValue: oldType,
          newValue: newType,
          date: new Date(),
          consultant: consultantInfo,
          note: "Cambio de tipo de anuncio",
        });
      }
    }

    // Historial: Cambio Operación GV
    if (req.body.gvOperationClose !== undefined) {
      const oldGV = currentAd ? currentAd.gvOperationClose : null;
      const newGV = req.body.gvOperationClose;
      if (oldGV !== newGV) {
        historyEntries.push({
          type: "GV_OPERATION_CHANGE",
          field: "gvOperationClose",
          oldValue: oldGV,
          newValue: newGV,
          date: new Date(),
          consultant: consultantInfo,
          note: "Cambio de cierre de operación GV",
        });
      }
    }

    // 4. Actualización masiva opcional (updateSameRef)
    if (req.body.updateSameRef && req.body.adReference) {
      await Ad.updateMany(
        {
          adReference: req.body.adReference,
          _id: { $ne: req.body.id },
        },
        {
          $set: { surfacesBox: req.body.surfacesBox },
        },
      );
    }

    // 5. Preparar operador de actualización MongoDB
    const updateOps = { $set: fieldsToUpdate };

    // Creación sintética de historial si no existe
    const needCreation =
      !currentAd ||
      !Array.isArray(currentAd.changesHistory) ||
      currentAd.changesHistory.length === 0;
    if (needCreation) {
      const creationEntry = {
        type: "CREATION",
        field: "createdAt",
        oldValue: null,
        newValue:
          currentAd && currentAd.createdAt ? currentAd.createdAt : new Date(),
        date:
          currentAd && currentAd.createdAt ? currentAd.createdAt : new Date(),
        consultant: null,
        note: "Creación sintética del campo",
      };
      historyEntries.unshift(creationEntry);
    }

    if (historyEntries.length > 0) {
      if (needCreation) {
        updateOps.$push = {
          changesHistory: { $each: historyEntries, $position: 0 },
        };
      } else {
        updateOps.$push = { changesHistory: { $each: historyEntries } };
      }
    }

    // 6. EJECUTAR EL UPDATE PRINCIPAL (Sin revalidar slug aún)
    await Ad.findByIdAndUpdate(id, updateOps);

    // =====================================================================
    // REGENERACIÓN DE SLUG + REVALIDACIÓN WEB
    // =====================================================================

    // Recuperamos el documento actualizado.
    // IMPORTANTE: NO usamos .lean() porque necesitamos métodos como .save()
    const updatedAdDoc = await Ad.findById(id)
      .populate("consultant", "fullName")
      .populate("owner", "fullName");

    // A. Lógica de Slug: ¿Necesitamos regenerarlo?
    // Si el título cambió O si no tiene slug (caso legacy)
    const titleChanged = currentAd.title !== req.body.title;
    const missingSlug = !updatedAdDoc.slug;

    if (missingSlug || titleChanged) {
      // 1. Si cambió el título, reseteamos slug a null para forzar recreación limpia
      if (titleChanged) updatedAdDoc.slug = null;

      // 2. Marcamos 'title' como modificado para despertar al plugin
      updatedAdDoc.markModified("title");

      // 3. Guardamos. Aquí es donde mongoose-slug-updater se ejecuta.
      await updatedAdDoc.save();
    }

    // Convertimos a objeto plano para manipulación final y respuesta
    const updatedAd = updatedAdDoc.toObject();

    // Normalizar historial (si tienes esta función)
    if (typeof normalizeAdHistory === "function") {
      updatedAd.changesHistory = normalizeAdHistory(updatedAd);
    }

    // B. Lógica de Revalidación ISR (Next.js 16)
    const validStatuses = ["Activo", "En preparación"];
    const isVisibleNow =
      updatedAd.showOnWeb && validStatuses.includes(updatedAd.adStatus);

    // Detectamos si la visibilidad pudo haber cambiado (pasó de inactivo a activo o viceversa)
    const visibilityChanged =
      currentAd.showOnWeb !== req.body.showOnWeb ||
      currentAd.adStatus !== req.body.adStatus;

    const featuredChanged =
      currentAd.featuredOnMain !== req.body.featuredOnMain;

    const revalidationPromises = [];

    // 1. Revalidar Listados Generales y Home
    // Si es visible ahora, o si su visibilidad cambió, necesitamos actualizar las listas
    if (isVisibleNow || visibilityChanged) {
      revalidationPromises.push(revalidateWeb("home-data"));
      revalidationPromises.push(revalidateWeb("ads-list"));
    }

    // 2. Revalidar Destacados
    if (updatedAd.featuredOnMain || featuredChanged) {
      revalidationPromises.push(revalidateWeb("featured-ads"));
    }

    // 3. Revalidar la Página de Detalle Específica
    // IMPORTANTE: El tag debe coincidir con el del frontend (ad-{slug})
    if (updatedAd.slug) {
      // Revalidamos el NUEVO slug
      revalidationPromises.push(revalidateWeb(`ad-${updatedAd.slug}`));

      // Opcional PRO: Si el slug cambió, revalidar también el viejo para forzar el 404 rápido
      if (currentAd.slug && currentAd.slug !== updatedAd.slug) {
        revalidationPromises.push(revalidateWeb(`ad-${currentAd.slug}`));
      }
    }

    // Ejecutamos revalidaciones en paralelo (sin await para no bloquear respuesta)
    Promise.allSettled(revalidationPromises);

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adUpdateSendedTo = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const fieldsToUpdate = {};
    fieldsToUpdate.sendedTo = req.body.sendedTo;
    const updatedAd = await Ad.findByIdAndUpdate(_id, fieldsToUpdate);
    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adUpdateManyConsultantByConsultantId = async (req, res, next) => {
  try {
    const { currentConsultant } = req.params;

    const updatedAds = await Ad.updateMany(
      { consultant: currentConsultant },
      { consultant: req.body[0].consultant },
    );
    if (updatedAds !== null) {
      return res.status(200).json(req.body);
    } else {
      return res.status(409).json({
        message:
          "No se ha encontrado ningún anuncio asigando a este consultor.",
      });
    }
  } catch (err) {
    return next(err);
  }
};

const adDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let response = "";

    // 1. Buscamos y Borramos
    // adToDelete contendrá los datos del anuncio borrado (snapshot).
    const adToDelete = await Ad.findByIdAndDelete(id);

    if (!adToDelete) {
      return res
        .status(404)
        .json(
          "No se ha podido encontrar este anuncio. ¿Estás seguro de que existe?",
        );
    }

    response = "Anuncio borrado de la base de datos";

    // =====================================================================
    // 🔌 INTEGRACIÓN ISR (BORRADO)
    // =====================================================================

    const validStatuses = ["Activo", "En preparación"];

    // Verificamos si el anuncio QUE ACABAMOS DE BORRAR era visible
    const wasVisible =
      adToDelete.showOnWeb && validStatuses.includes(adToDelete.adStatus);

    if (wasVisible) {
      // Siempre limpiamos Home y Listado
      await revalidateWeb("home-data");
      await revalidateWeb("ads-list");

      // Si era destacado, limpiamos esa sección
      if (adToDelete.featuredOnMain) {
        await revalidateWeb("featured-ads");
      }
    }
    // =====================================================================

    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const adUpdateImageOrder = async (req, res, next) => {
  // Corregí 'nect' por 'next'
  try {
    // 1. Recogemos los datos necesarios
    const { id } = req.params; // El ID del anuncio viene de la URL
    const { from, urls } = req.body; // 'from' y 'urls' vienen del cuerpo de la petición

    // 2. Validación básica de los datos recibidos
    if (!from || !urls || !Array.isArray(urls)) {
      return res.status(400).json({
        message: "Datos inválidos.",
      });
    }

    // 3. Preparamos el campo que vamos a actualizar en la BD
    let fieldToUpdate;
    if (from === "others") {
      fieldToUpdate = "images.others";
    } else if (from === "blueprint") {
      fieldToUpdate = "images.blueprint";
    } else {
      // Si 'from' no es ni 'others' ni 'blueprint', es un error.
      return res
        .status(400)
        .json({ message: "El campo 'from' debe ser 'others' o 'blueprint'." });
    }

    // 4. Buscamos el anuncio por ID y actualizamos el campo correspondiente
    // Usamos $set para reemplazar completamente el array viejo con el nuevo.
    // La opción { new: true } nos devuelve el documento ya actualizado.
    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $set: { [fieldToUpdate]: urls } }, // Usamos corchetes para usar la variable como nombre de la clave
      { new: true },
    );

    // 5. Verificamos si se encontró y actualizó el anuncio
    if (!updatedAd) {
      return res.status(404).json({
        message: "No se encontró el anuncio con el ID proporcionado.",
      });
    }

    // 6. Enviamos la respuesta con el anuncio actualizado
    return res.status(200).json(updatedAd);
  } catch (error) {
    console.log(error);
    // Si algo sale mal, lo pasamos al manejador de errores de Express
    return next(error);
  }
};

module.exports = {
  adGetAll,
  adGetByFilters,
  adGetOne,
  allAdsGetByIdConsultant,
  adCreate,
  adUpdate,
  adUpdateSendedTo,
  adUpdateManyConsultantByConsultantId,
  adMainImageUpload,
  adMainImagesDelete,
  adMediaImageUpload,
  adMediaImagesDelete,
  adBlueprintImageUpload,
  adBlueprintImagesDelete,
  adOthersImagesUpload,
  adOthersImagesDelete,
  adDelete,
  adGetMatchedRequests,
  repairAds,
  getAdsPaginated,
  adUpdateImageOrder,
  getAdsByContact,
};
