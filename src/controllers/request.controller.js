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
        "_id"
      ).then((contacts) => contacts.map((contact) => contact._id));

      const consultantIds = await Consultant.find(
        {
          fullName: { $regex: new RegExp(search, "i") },
        },
        "_id"
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
    const request = await Request.find({ requestConsultant: consultantId });
    /* console.log('request',request); */
    return res.status(200).json(request);
  } catch (err) {
    return next(err);
  }
};

const requestGetAdsMatched = async (req, res, next) => {
  try {
    const { id } = req.params;
    let request = await Request.findById(id);

    // Si no se encuentra la solicitud, o si es nula por alguna razón, manejar el caso
    if (!request) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    // Array para acumular todas las condiciones principales (que se encadenarán con AND)
    let andConditions = [{ adStatus: "Activo" }];

    // --- Filtros que ya funcionan con lógica AND ---

    if (request.requestAdType && request.requestAdType.length !== 0) {
      andConditions.push({ adType: { $in: request.requestAdType } });
    }
    if (
      request.requestBuildingType &&
      request.requestBuildingType.length !== 0
    ) {
      andConditions.push({
        adBuildingType: { $in: request.requestBuildingType },
      });
    }
    if (request.requestZone && request.requestZone.length !== 0) {
      andConditions.push({ zone: { $in: request.requestZone } });
    }

    // Filtros de precios de venta
    const salePriceMin = request.requestSalePrice?.salePriceMin ?? 0; // Usamos ?? para manejar null/undefined y 0 si es cadena vacía
    const salePriceMax = request.requestSalePrice?.salePriceMax ?? 999999999;
    andConditions.push({
      "sale.saleValue": {
        $gte: salePriceMin,
        $lte: salePriceMax,
      },
    });

    // Filtros de precios de alquiler
    const rentPriceMin = request.requestRentPrice?.rentPriceMin ?? 0;
    const rentPriceMax = request.requestRentPrice?.rentPriceMax ?? 999999999;
    andConditions.push({
      "rent.rentValue": {
        $lte: rentPriceMax,
        $gte: rentPriceMin,
      },
    });

    // Filtros de superficie construida
    const buildSurfaceMin = request.requestBuildSurface?.buildSurfaceMin ?? 0;
    const buildSurfaceMax =
      request.requestBuildSurface?.buildSurfaceMax ?? 999999999;
    andConditions.push({
      buildSurface: {
        $gte: buildSurfaceMin,
        $lte: buildSurfaceMax,
      },
    });

    // Filtros de superficie de parcela
    const plotSurfaceMin = request.requestPlotSurface?.plotSurfaceMin ?? 0;
    const plotSurfaceMax =
      request.requestPlotSurface?.plotSurfaceMax ?? 999999999;
    andConditions.push({
      plotSurface: {
        $gte: plotSurfaceMin,
        $lte: plotSurfaceMax,
      },
    });

    // Filtros de dormitorios
    const bedroomsMin = request.requestBedrooms?.bedroomsMin ?? 0;
    const bedroomsMax = request.requestBedrooms?.bedroomsMax ?? 999;
    andConditions.push({
      "quality.bedrooms": {
        $gte: bedroomsMin,
        $lte: bedroomsMax,
      },
    });

    // Filtros de baños
    const bathroomsMin = request.requestBathrooms?.bathroomsMin ?? 0;
    const bathroomsMax = request.requestBathrooms?.bathroomsMax ?? 999;
    andConditions.push({
      "quality.bathrooms": {
        $gte: bathroomsMin,
        $lte: bathroomsMax,
      },
    });

    // --- ¡Manejo especial para 'reformed' y 'toReform' con lógica OR! ---
    const caracterristicConditions = [];

    // Si 'reformado' está marcado en la solicitud, añádelo como una condición OR
    if (request.reformed === true) {
      caracterristicConditions.push({ "quality.reformed": true });
    }

    // Si 'a reformar' está marcado en la solicitud, añádelo como una condición OR
    if (request.toReform === true) {
      caracterristicConditions.push({ "quality.toReform": true });
    }

    if (request.smokeOutlet === true) {
      caracterristicConditions.push({ "quality.others.smokeOutlet": true });
    }

    if (request.profitability === true) {
      caracterristicConditions.push({ profitability: true });
    }

    // Si alguna de las condiciones de 'reformed' o 'toReform' fue activada,
    // la añadimos a las condiciones principales usando $or
    if (caracterristicConditions.length > 0) {
      andConditions.push({ $or: caracterristicConditions });
    }
    // Si ninguna está marcada, no se añade ninguna condición para estos campos,
    // lo que significa que se muestran anuncios independientemente de su estado de reforma.

    // Ejecutamos la query combinando todas las condiciones AND
    // Si andConditions solo tiene la condición inicial, la pasamos directamente
    // Si tiene más, usamos $and para combinarlas
    const finalQuery =
      andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const ads = await Ad.find(finalQuery).exec();

    return res.status(200).json(ads);
  } catch (err) {
    console.error("Error en requestGetAdsMatched:", err);
    return next(err);
  }
};

const requestGetNewMatched = async (req, res, next) => {
  try {
    let query = Ad.find();
    query.where({ adStatus: "Activo" });

    if (req.body.requestAdType.length !== 0)
      query.where({ adType: { $in: req.body.requestAdType } });
    if (req.body.requestZone.length !== 0)
      query.where({ zone: { $in: req.body.requestZone } });
    if (req.body.requestBuildingType.length !== 0)
      query.where({ adBuildingType: { $in: req.body.requestBuildingType } });

    if (!req.body.salePriceMax) req.body.salePriceMax = 999999999;
    if (!req.body.salePriceMin) req.body.salePriceMin = 0;
    query.and({
      "sale.saleValue": {
        $gte: req.body.salePriceMin,
        $lte: req.body.salePriceMax,
      },
    });

    if (!req.body.rentPriceMax) req.body.rentPriceMax = 999999999;
    if (!req.body.rentPriceMin) req.body.rentPriceMin = 0;
    query.and({
      "rent.rentValue": {
        $gte: req.body.rentPriceMin,
        $lte: req.body.rentPriceMax,
      },
    });

    if (!req.body.buildSurfaceMax) req.body.buildSurfaceMax = 999999999;
    if (!req.body.buildSurfaceMin) req.body.buildSurfaceMin = 0;
    query.where({
      buildSurface: {
        $gte: req.body.buildSurfaceMin,
        $lte: req.body.buildSurfaceMax,
      },
    });

    if (!req.body.plotSurfaceMax) req.body.plotSurfaceMax = 999999999;
    if (!req.body.plotSurfaceMin) req.body.plotSurfaceMin = 0;
    query.where({
      plotSurface: {
        $gte: req.body.plotSurfaceMin,
        $lte: req.body.plotSurfaceMax,
      },
    });

    if (!req.body.bedroomsMax) req.body.bedroomsMax = 999;
    if (!req.body.bedroomsMin) req.body.bedroomsMin = 0;
    query.where({
      "quality.bedrooms": {
        $gte: req.body.bedroomsMin,
        $lte: req.body.bedroomsMax,
      },
    });

    if (!req.body.bathroomsMax) req.body.bathroomsMax = 999;
    if (!req.body.bathroomsMin) req.body.bathroomsMin = 0;
    query.where({
      "quality.bathrooms": {
        $gte: req.body.bathroomsMin,
        $lte: req.body.bathroomsMax,
      },
    });

    if (req.body.reformed === true) {
      query.where({ "quality.reformed": true });
    }

    if (req.body.toReform === true) {
      query.where({ "quality.toReform": true });
    }

    if (req.body.smokeOutlet === true) {
      query.where({ "quality.others.smokeOutlet": true });
    }

    if (req.body.profitability === true) {
      query.where({ profitability: true });
    }

    const ads = await query.exec();

    return res.status(200).json(ads);
  } catch (err) {
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

    const updatedRequest = await Request.findByIdAndUpdate(
      req.body.id,
      fieldsToUpdate,
      { new: true }
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
      { requestConsultant: req.body[0].requestConsultant }
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
