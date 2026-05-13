const Request = require("./../models/request.model");
const Ad = require("./../models/ad.model");
const Consultant = require("../models/consultant.model");
const Contact = require("../models/contact.model");

const requestsGetAll = async (req, res, next) => {
  try {
    const requests = await Request.find()
      .populate({
        path: "requestContact",
        select: "fullName company email contactComments",
      })
      .populate({ path: "requestConsultant", select: "fullName" });
    return res.status(200).json(requests);
  } catch (err) {
    return next(err);
  }
};

const requestsGetByFilters = async (req, res, next) => {
  try {
    let limit = 100;

    let {
      requestAdType,
      requestBuildingType,
      saleOrder,
      rentOrder,
      sortField,
      sortOrder,
      page,
      search,
    } = req.query;

    let requestBuildingTypeValue = requestBuildingType
      ? JSON.parse(requestBuildingType)
      : null;

    let requestAdTypeValue = requestAdType ? JSON.parse(requestAdType) : null;

    const queryConditions = {};

    if (search) {
      let orConditions = [];
      const contactIds = await Contact.find(
        {
          fullName: { $regex: new RegExp(search, "i") },
        },
        "_id",
      ).then((contacts) => contacts.map((contact) => contact._id));

      const consultantIds = await Consultant.find(
        {
          fullName: { $regex: new RegExp(search, "i") },
        },
        "_id",
      ).then((consultants) => consultants.map((consultant) => consultant._id));

      if (consultantIds.length > 0) {
        orConditions.push({ requestConsultant: { $in: consultantIds } });
      }

      if (contactIds.length > 0) {
        orConditions.push({ requestContact: { $in: contactIds } });
      }

      if (!isNaN(search)) {
        // Solo agrega esta condición si 'search' es numérico
        orConditions.push({ requestReference: Number(search) });
      }

      if (orConditions.length > 0) {
        queryConditions.$or = orConditions;
      } else {
        queryConditions.$or = [{ _id: null }];
      }
    }

    if (requestBuildingTypeValue && requestBuildingTypeValue.length > 0)
      queryConditions.requestBuildingType = {
        $in: requestBuildingTypeValue.map((item) => item.name),
      };

    if (requestAdTypeValue && requestAdTypeValue.length > 0)
      queryConditions.requestAdType = {
        $in: requestAdTypeValue.map((item) => item.name),
      };

    let sort = { updatedAt: -1 };

    if (sortField && (sortOrder === "ASC" || sortOrder === "DESC")) {
      sort = { [sortField]: sortOrder === "ASC" ? 1 : -1 };
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const requests = await Request.find(queryConditions)
      .populate({
        path: "requestContact",
        select: "fullName company email contactComments",
      })
      .populate({ path: "requestConsultant", select: "fullName" })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalElements = await Request.countDocuments(queryConditions);
    const totalPages = Math.ceil(totalElements / limit);

    return res.status(200).json({
      requests,
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

const requestGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await Request.findById(id)
      .populate({
        path: "requestContact",
        select:
          "_id fullName company email contactComments notReceiveCommunications",
      })
      .populate({ path: "requestConsultant", select: "_id fullName" });
    return res.status(200).json(request);
  } catch (err) {
    return next(err);
  }
};

const requestLastReference = async (req, res, next) => {
  try {
    const lastReference = await Request.find().sort({ requestReference: -1 });
    let reference = 0;
    if (lastReference.length !== 0)
      reference = lastReference[0].requestReference;
    return res.status(200).json(reference);
  } catch (err) {
    return next(err);
  }
};

const requestGetByContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await Request.find({ requestContact: id }).populate({
      path: "requestConsultant",
      select: "fullName",
    });

    return res.status(200).json(request);
  } catch (err) {
    return next(err);
  }
};

const allRequestGetByIdConsultant = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const request = await Request.find({
      requestConsultant: consultantId,
    }).populate({
      path: "requestContact",
      select: "fullName",
    });
    return res.status(200).json(request);
  } catch (err) {
    return next(err);
  }
};

const requestGetAdsMatched = async (req, res, next) => {
  try {
    const { id } = req.params;
    let request = await Request.findById(id).populate("requestZone");

    if (!request) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    let andConditions = [{ adStatus: "Activo" }];

    // --- Filtros de Arrays ---
    if (request.requestAdType && request.requestAdType.length > 0) {
      andConditions.push({ adType: { $in: request.requestAdType } });
    }
    if (request.requestBuildingType && request.requestBuildingType.length > 0) {
      andConditions.push({
        adBuildingType: { $in: request.requestBuildingType },
      });
    }
    if (request.requestZone && request.requestZone.length > 0) {
      andConditions.push({ zone: { $in: request.requestZone } });
    }

    // --- Filtros Numéricos (Solo se aplican si no son los valores por defecto) ---

    // Precio de Venta
    const salePriceMin = request.requestSalePrice?.salePriceMin ?? 0;
    const salePriceMax = request.requestSalePrice?.salePriceMax ?? 999999999;
    if (salePriceMin > 0 || salePriceMax < 999999999) {
      andConditions.push({
        "sale.saleValue": { $gte: salePriceMin, $lte: salePriceMax },
      });
    }

    // Precio de Alquiler
    const rentPriceMin = request.requestRentPrice?.rentPriceMin ?? 0;
    const rentPriceMax = request.requestRentPrice?.rentPriceMax ?? 999999999;
    if (rentPriceMin > 0 || rentPriceMax < 999999999) {
      andConditions.push({
        "rent.rentValue": { $gte: rentPriceMin, $lte: rentPriceMax },
      });
    }

    // Superficie Construida
    const buildSurfaceMin = request.requestBuildSurface?.buildSurfaceMin ?? 0;
    const buildSurfaceMax =
      request.requestBuildSurface?.buildSurfaceMax ?? 999999999;
    if (buildSurfaceMin > 0 || buildSurfaceMax < 999999999) {
      andConditions.push({
        buildSurface: { $gte: buildSurfaceMin, $lte: buildSurfaceMax },
      });
    }

    // Superficie de Parcela
    const plotSurfaceMin = request.requestPlotSurface?.plotSurfaceMin ?? 0;
    const plotSurfaceMax =
      request.requestPlotSurface?.plotSurfaceMax ?? 999999999;
    if (plotSurfaceMin > 0 || plotSurfaceMax < 999999999) {
      andConditions.push({
        plotSurface: { $gte: plotSurfaceMin, $lte: plotSurfaceMax },
      });
    }

    // Dormitorios (Unificado a 999 según tu código original)
    const bedroomsMin = request.requestBedrooms?.bedroomsMin ?? 0;
    const bedroomsMax = request.requestBedrooms?.bedroomsMax ?? 999;
    if (bedroomsMin > 0 || bedroomsMax < 999) {
      andConditions.push({
        "quality.bedrooms": { $gte: bedroomsMin, $lte: bedroomsMax },
      });
    }

    // Baños (Unificado a 999 según tu código original)
    const bathroomsMin = request.requestBathrooms?.bathroomsMin ?? 0;
    const bathroomsMax = request.requestBathrooms?.bathroomsMax ?? 999;
    if (bathroomsMin > 0 || bathroomsMax < 999) {
      andConditions.push({
        "quality.bathrooms": { $gte: bathroomsMin, $lte: bathroomsMax },
      });
    }

    // --- Filtros Booleanos (Características) ---

    // Estos deben ser AND obligatorios si el cliente los solicita
    if (request.smokeOutlet === true) {
      andConditions.push({ "quality.others.smokeOutlet": true });
    }
    if (request.profitability === true) {
      andConditions.push({ profitability: true });
    }

    // 'reformed' y 'toReform':
    //  - Si la petición tiene alguna marca, cruzan los anuncios con esa misma
    //    marca o los anuncios sin marcas (regla: anuncios sin marcas aparecen
    //    en todas las peticiones).
    //  - Si la petición no tiene marcas, no se aplica filtro.
    const reformConditions = [];
    if (request.reformed === true) {
      reformConditions.push({ "quality.reformed": true });
    }
    if (request.toReform === true) {
      reformConditions.push({ "quality.toReform": true });
    }
    if (reformConditions.length > 0) {
      reformConditions.push({
        "quality.reformed": { $ne: true },
        "quality.toReform": { $ne: true },
      });
    }

    if (request.coworking === true) {
      andConditions.push({ "quality.others.coworking": true });
    }

    if (request.exclusiveOfficeBuilding === true) {
      andConditions.push({ "quality.others.exclusiveOfficeBuilding": true });
    }

    if (request.implanted === true) {
      andConditions.push({ "quality.others.implanted": true });
    }

    if (request.seaViews === true) {
      andConditions.push({ "quality.others.seaViews": true });
    }

    if (request.golfCourseView === true) {
      andConditions.push({ "quality.others.golfCourseView": true });
    }

    if (request.fullHoursSecurity === true) {
      andConditions.push({ "quality.others.fullHoursSecurity": true });
    }

    if (request.gatedCommunity === true) {
      andConditions.push({ "quality.others.gatedCommunity": true });
    }

    if (reformConditions.length > 0) {
      andConditions.push({ $or: reformConditions });
    }

    // --- Ejecución de la Query ---
    const finalQuery =
      andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // IMPORTANTE: Añadimos el .sort() para ordenar por los más recientes
    const ads = await Ad.find(finalQuery)
      .sort({ "sale.saleValue": -1, "rent.rentValue": -1 })
      .populate("zone")
      .exec();

    return res.status(200).json(ads);
  } catch (err) {
    console.error("Error en requestGetAdsMatched:", err);
    return next(err);
  }
};

const requestGetNewMatched = async (req, res, next) => {
  try {
    // Array para acumular todas las condiciones
    let andConditions = [{ adStatus: "Activo" }];

    // --- Filtros de Arrays ---
    if (req.body.requestAdType && req.body.requestAdType.length > 0) {
      andConditions.push({ adType: { $in: req.body.requestAdType } });
    }
    if (req.body.requestZone && req.body.requestZone.length > 0) {
      andConditions.push({ zone: { $in: req.body.requestZone } });
    }
    if (
      req.body.requestBuildingType &&
      req.body.requestBuildingType.length > 0
    ) {
      andConditions.push({
        adBuildingType: { $in: req.body.requestBuildingType },
      });
    }

    // --- Filtros Numéricos (Solo se aplican si no son los valores por defecto) ---

    // Precio de Venta
    const salePriceMin = req.body.salePriceMin ?? 0;
    const salePriceMax = req.body.salePriceMax ?? 999999999;
    if (salePriceMin > 0 || salePriceMax < 999999999) {
      andConditions.push({
        "sale.saleValue": { $gte: salePriceMin, $lte: salePriceMax },
      });
    }

    // Precio de Alquiler
    const rentPriceMin = req.body.rentPriceMin ?? 0;
    const rentPriceMax = req.body.rentPriceMax ?? 999999999;
    if (rentPriceMin > 0 || rentPriceMax < 999999999) {
      andConditions.push({
        "rent.rentValue": { $gte: rentPriceMin, $lte: rentPriceMax },
      });
    }

    // Superficie Construida
    const buildSurfaceMin = req.body.buildSurfaceMin ?? 0;
    const buildSurfaceMax = req.body.buildSurfaceMax ?? 999999999;
    if (buildSurfaceMin > 0 || buildSurfaceMax < 999999999) {
      andConditions.push({
        buildSurface: { $gte: buildSurfaceMin, $lte: buildSurfaceMax },
      });
    }

    // Superficie de Parcela
    const plotSurfaceMin = req.body.plotSurfaceMin ?? 0;
    const plotSurfaceMax = req.body.plotSurfaceMax ?? 999999999;
    if (plotSurfaceMin > 0 || plotSurfaceMax < 999999999) {
      andConditions.push({
        plotSurface: { $gte: plotSurfaceMin, $lte: plotSurfaceMax },
      });
    }

    // Dormitorios
    const bedroomsMin = req.body.bedroomsMin ?? 0;
    const bedroomsMax = req.body.bedroomsMax ?? 999;
    if (bedroomsMin > 0 || bedroomsMax < 999) {
      andConditions.push({
        "quality.bedrooms": { $gte: bedroomsMin, $lte: bedroomsMax },
      });
    }

    // Baños
    const bathroomsMin = req.body.bathroomsMin ?? 0;
    const bathroomsMax = req.body.bathroomsMax ?? 999;
    if (bathroomsMin > 0 || bathroomsMax < 999) {
      andConditions.push({
        "quality.bathrooms": { $gte: bathroomsMin, $lte: bathroomsMax },
      });
    }

    // --- Filtros Booleanos (Características) ---

    // Obligatorias
    if (req.body.smokeOutlet === true) {
      andConditions.push({ "quality.others.smokeOutlet": true });
    }
    if (req.body.profitability === true) {
      andConditions.push({ profitability: true });
    }

    // Lógica OR para reformado / a reformar
    const reformConditions = [];
    if (req.body.reformed === true) {
      reformConditions.push({ "quality.reformed": true });
    }
    if (req.body.toReform === true) {
      reformConditions.push({ "quality.toReform": true });
    }

    if (req.body.coworking === true) {
      andConditions.push({ "quality.others.coworking": true });
    }

    if (req.body.exclusiveOfficeBuilding === true) {
      andConditions.push({ "quality.others.exclusiveOfficeBuilding": true });
    }

    if (req.body.implanted === true) {
      andConditions.push({ "quality.others.implanted": true });
    }

    if (req.body.seaViews === true) {
      andConditions.push({ "quality.others.seaViews": true });
    }

    if (req.body.golfCourseView === true) {
      andConditions.push({ "quality.others.golfCourseView": true });
    }

    if (req.body.fullHoursSecurity === true) {
      andConditions.push({ "quality.others.fullHoursSecurity": true });
    }

    if (req.body.gatedCommunity === true) {
      andConditions.push({ "quality.others.gatedCommunity": true });
    }

    if (reformConditions.length > 0) {
      andConditions.push({ $or: reformConditions });
    }

    // --- Ejecución de la Query ---
    const finalQuery =
      andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    // Mismo ordenamiento por precio de venta y de alquiler que en el otro controlador
    const ads = await Ad.find(finalQuery)
      .sort({ "sale.saleValue": -1, "rent.rentValue": -1 })
      .populate("zone")
      .exec();

    return res.status(200).json(ads);
  } catch (err) {
    console.error("Error en requestGetNewMatched:", err);
    return next(err);
  }
};

const requestCreate = async (req, res, next) => {
  try {
    const lastRequest = await Request.findOne().sort({ requestReference: -1 });
    const reference = lastRequest ? lastRequest.requestReference + 1 : 1;
    const requestSalePrice = {
      salePriceMax: req.body.salePriceMax,
      salePriceMin: req.body.salePriceMin,
    };

    const requestRentPrice = {
      rentPriceMax: req.body.rentPriceMax,
      rentPriceMin: req.body.rentPriceMin,
    };

    const requestBuildSurface = {
      buildSurfaceMax: req.body.buildSurfaceMax,
      buildSurfaceMin: req.body.buildSurfaceMin,
    };

    const requestPlotSurface = {
      plotSurfaceMax: req.body.plotSurfaceMax,
      plotSurfaceMin: req.body.plotSurfaceMin,
    };

    const requestBedrooms = {
      bedroomsMax: req.body.bedroomsMax,
      bedroomsMin: req.body.bedroomsMin,
    };

    const requestBathrooms = {
      bathroomsMax: req.body.bathroomsMax,
      bathroomsMin: req.body.bathroomsMin,
    };

    const newRequest = new Request({
      requestContact: req.body.requestContact,
      requestConsultant: req.body.requestConsultant,
      requestComment: req.body.requestComment,
      requestAdType: req.body.requestAdType,
      requestBuildingType: req.body.requestBuildingType,
      requestPlotSurface,
      requestBedrooms,
      requestBathrooms,
      requestReference: reference,
      requestZone: req.body.requestZone,
      requestSalePrice,
      requestRentPrice,
      requestBuildSurface,
      reformed: req.body.reformed,
      toReform: req.body.toReform,
      smokeOutlet: req.body.smokeOutlet,
      profitability: req.body.profitability,
      coworking: req.body.coworking,
      exclusiveOfficeBuilding: req.body.exclusiveOfficeBuilding,
      implanted: req.body.implanted,
      seaViews: req.body.seaViews,
      golfCourseView: req.body.golfCourseView,
      fullHoursSecurity: req.body.fullHoursSecurity,
      gatedCommunity: req.body.gatedCommunity,
    });

    const requestCreated = await newRequest.save();

    return res.status(200).json(requestCreated);
  } catch (err) {
    return next(err);
  }
};

const requestUpdate = async (req, res, next) => {
  try {
    let fieldsToUpdate = {};

    fieldsToUpdate.requestContact = req.body.requestContact;
    fieldsToUpdate.requestConsultant = req.body.requestConsultant;
    fieldsToUpdate.requestComment = req.body.requestComment;
    fieldsToUpdate.requestAdType = req.body.requestAdType;
    fieldsToUpdate.requestBuildingType = req.body.requestBuildingType;
    fieldsToUpdate.requestReference = req.body.requestReference;
    fieldsToUpdate.requestZone = req.body.requestZone;

    fieldsToUpdate.requestSalePrice = {
      salePriceMax: req.body.salePriceMax,
      salePriceMin: req.body.salePriceMin,
    };

    fieldsToUpdate.requestRentPrice = {
      rentPriceMax: req.body.rentPriceMax,
      rentPriceMin: req.body.rentPriceMin,
    };

    fieldsToUpdate.requestBuildSurface = {
      buildSurfaceMax: req.body.buildSurfaceMax,
      buildSurfaceMin: req.body.buildSurfaceMin,
    };

    fieldsToUpdate.requestPlotSurface = {
      plotSurfaceMax: req.body.plotSurfaceMax,
      plotSurfaceMin: req.body.plotSurfaceMin,
    };

    fieldsToUpdate.requestBedrooms = {
      bedroomsMax: req.body.bedroomsMax,
      bedroomsMin: req.body.bedroomsMin,
    };

    fieldsToUpdate.requestBathrooms = {
      bathroomsMax: req.body.bathroomsMax,
      bathroomsMin: req.body.bathroomsMin,
    };

    fieldsToUpdate.reformed = req.body.reformed;
    fieldsToUpdate.toReform = req.body.toReform;
    fieldsToUpdate.smokeOutlet = req.body.smokeOutlet;
    fieldsToUpdate.profitability = req.body.profitability;
    fieldsToUpdate.coworking = req.body.coworking;
    fieldsToUpdate.exclusiveOfficeBuilding = req.body.exclusiveOfficeBuilding;
    fieldsToUpdate.implanted = req.body.implanted;
    fieldsToUpdate.seaViews = req.body.seaViews;
    fieldsToUpdate.golfCourseView = req.body.golfCourseView;
    fieldsToUpdate.fullHoursSecurity = req.body.fullHoursSecurity;
    fieldsToUpdate.gatedCommunity = req.body.gatedCommunity;

    const updatedRequest = await Request.findByIdAndUpdate(
      req.body.id,
      fieldsToUpdate,
      { new: true },
    );

    return res.status(200).json(updatedRequest);
  } catch (err) {
    return next(err);
  }
};

const requyestsUpdateManyConsultantByConsultantId = async (req, res, next) => {
  try {
    const { currentConsultant } = req.params;
    /* console.log(req.body) */
    /* console.log(currentConsultant) */
    const updatedRequests = await Request.updateMany(
      { requestConsultant: currentConsultant },
      { requestConsultant: req.body[0].requestConsultant },
    );
    /* console.log('resultado',updatedRequests) */
    if (updatedRequests !== null) {
      return res.status(200).json(req.body);
    } else {
      return res.status(409).json({
        message:
          "No se ha encontrado ninga petición asiganda a este consultor.",
      });
    }
  } catch (err) {
    return next(err);
  }
};

const requestDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let response = "";

    const deleted = await Request.findByIdAndDelete(id);
    if (deleted) response = "Petición borrada de la base de datos";
    else
      response =
        "No se ha podido encontrar esta petición. ¿Estás seguro de que existe?";

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestsGetAll,
  requestsGetByFilters,
  requestGetOne,
  allRequestGetByIdConsultant,
  requestLastReference,
  requestGetByContact,
  requestGetAdsMatched,
  requestGetNewMatched,
  requestCreate,
  requestUpdate,
  requyestsUpdateManyConsultantByConsultantId,
  requestDelete,
};
