const Ad = require("./../models/ad.model");
const Request = require("./../models/request.model");
const { deleteImage, getCdnUrl } = require("../middlewares/file.middleware");
const mongoose = require("mongoose");
const Contact = require("../models/contact.model");
const Consultant = require("../models/consultant.model");
const { normalizeAdHistory } = require("../utils/utils");
const { revalidateWeb } = require("../utils/revalidateWeb");
const WebHome = require("../models/webHome.model");
const Zone = require("../models/zone.model");

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

    // 1. Parseo inteligente de parámetros
    new URLSearchParams(search).forEach((value, key) => {
      // Limpiamos espacios en blanco de las llaves y valores
      params[key.trim()] = value.trim();
    });

    // 2. REPARACIÓN DEL DEPARTAMENTO (Caso especial Ampersand)
    // Si detectamos que el departamento se cortó en "Campos Rústicos", lo reconstruimos.
    let departmentName = params.department;
    if (
      departmentName === "Campos Rústicos" ||
      params["Activos Singulares"] !== undefined
    ) {
      departmentName = "Campos Rústicos & Activos Singulares";
    }

    let zoneParam = [];
    if (!!params.zone) {
      zoneParam = params.zone
        .split(",")
        .map((_id) => mongoose.Types.ObjectId(_id));
    }

    let page = !!params.page ? parseInt(params.page) : 1;

    // 3. CORRECCIÓN DE DEFAULTS (Evitamos usar 'true' booleano en búsquedas de texto)
    let department = departmentName || "Residencial";
    let adReference =
      params.adReference && params.adReference !== "true"
        ? params.adReference
        : null;

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

    // Calidades
    let hasSwimmingPool = params.swimmingPool === "true";
    let hasGarage = params.garage === "true";
    let hasTerrace = params.terrace === "true";
    let hasexclusiveOffice = params.exclusiveOfficeBuilding === "true";
    let hasClassicBuilding = params.classicBuilding === "true";
    let hasCoworking = params.coworking === "true";

    // 4. Mantenemos tus consultas originales de topes (Min/Max)
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

    let orderByDate = params.orderByDate === "true";

    // --- CONSTRUCCIÓN DE LA QUERY FINAL ---
    // Importante: department debe ser el string exacto
    let andConditions = [{ department: department, showOnWeb: true }];

    // Lógica específica para Costa
    if (department === "Costa") {
      const defaultCostaSubzones = [
        "Marbella",
        "Sotogrande",
        "Puerto de Santa María",
      ];
      if (!!params.subzone) {
        andConditions.push({ subzone: { $in: params.subzone.split(",") } });
      } else {
        andConditions.push({ subzone: { $in: defaultCostaSubzones } });
      }
    }

    // Filtros dinámicos
    if (params.featuredOnMain === "true")
      andConditions.push({ featuredOnMain: true });
    if (!!params.zone) andConditions.push({ zone: { $in: zoneParam } });
    if (!!params.adType) andConditions.push({ adType: { $in: adType } });
    if (adReference) andConditions.push({ adReference: adReference }); // Solo si existe valor real
    if (!!params.adBuildingType)
      andConditions.push({ adBuildingType: { $in: adBuildingType } });

    // Calidades
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

    // Rangos de Superficie y Precio
    if (!!params.minSurface && !!params.maxSurface) {
      andConditions.push({
        buildSurface: { $gte: minSurface, $lte: maxSurface },
      });
    } else if (minSurface[0] && maxSurface[0]) {
      andConditions.push({
        buildSurface: {
          $gte: minSurface[0].buildSurface,
          $lte: maxSurface[0].buildSurface,
        },
      });
    }

    if (adType.length === 1) {
      if (adType[0] === "Venta") {
        if (!!params.minSalePrice && !!params.maxSalePrice) {
          andConditions.push({
            "sale.saleValue": { $gte: minSalePrice, $lte: maxSalePrice },
          });
        } else if (minSalePrice[0] && maxSalePrice[0]) {
          andConditions.push({
            "sale.saleValue": {
              $gte: minSalePrice[0].sale.saleValue,
              $lte: maxSalePrice[0].sale.saleValue,
            },
          });
        }
      } else if (adType[0] === "Alquiler") {
        if (!!params.minRentPrice && !!params.maxRentPrice) {
          andConditions.push({
            "rent.rentValue": { $gte: minRentPrice, $lte: maxRentPrice },
          });
        } else if (minRentPrice[0] && maxRentPrice[0]) {
          andConditions.push({
            "rent.rentValue": {
              $gte: minRentPrice[0].rent.rentValue,
              $lte: maxRentPrice[0].rent.rentValue,
            },
          });
        }
      }
    }

    // Reforma
    const reformConditions = [];
    if (params.reformed === "true")
      reformConditions.push({ "quality.reformed": true });
    if (params.toReform === "true")
      reformConditions.push({ "quality.toReform": true });
    if (reformConditions.length > 0)
      andConditions.push({ $or: reformConditions });
    if (params.smokeOutlet === "true")
      andConditions.push({ "quality.others.smokeOutlet": true });

    const finalMongoQuery = { $and: andConditions };

    const adsPerPage = 30;
    let sortOptions = orderByDate
      ? { createdAt: -1 }
      : adType.length === 1 && adType[0] === "Alquiler"
        ? { "rent.rentValue": -1 }
        : { "sale.saleValue": -1 };

    const totalAds = await Ad.countDocuments(finalMongoQuery);
    const ads = await Ad.find(finalMongoQuery)
      .sort(sortOptions)
      .limit(adsPerPage)
      .skip((page - 1) * adsPerPage)
      .exec();

    return res.status(200).json({
      totalAds,
      totalPages: totalAds === 0 ? 1 : Math.ceil(totalAds / adsPerPage),
      ads,
    });
  } catch (err) {
    console.error("Error en getAdsPaginated:", err);
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

    // 1. Función de utilidad para extraer valores (nombres o IDs) de los filtros
    // Esto maneja si el front envía: "Activo", ["Activo"] o [{name: "Activo"}]
    const normalizeFilter = (val) => {
      if (!val) return [];
      const array = Array.isArray(val) ? val : [val];
      return array.map((item) => {
        if (typeof item === "object" && item !== null) {
          return item.name || item._id;
        }
        return item;
      });
    };

    // 2. Función para acentos (la mantenemos igual)
    const createAccentInsensitiveRegex = (str) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/a/g, "[aá]")
        .replace(/e/g, "[eé]")
        .replace(/i/g, "[ií]")
        .replace(/o/g, "[oó]")
        .replace(/u/g, "[uúü]")
        .replace(/c/g, "[cç]")
        .replace(/n/g, "[nñ]");
    };

    const queryConditions = {};

    // 3. Lógica de Búsqueda (Search)
    if (search) {
      const searchRegex = new RegExp(createAccentInsensitiveRegex(search), "i");

      // Buscamos contactos y consultores en paralelo para mejorar rendimiento
      const [ownerIds, consultantIds] = await Promise.all([
        Contact.find({ fullName: { $regex: searchRegex } }, "_id"),
        Consultant.find({ fullName: { $regex: searchRegex } }, "_id"),
      ]);

      const searchParts = search.trim().split(" ");
      let numberPart = searchParts.length > 1 ? searchParts.pop() : "";
      let streetPart = searchParts.join(" ");
      const isNumber = numberPart && !isNaN(parseInt(numberPart, 10));

      if (!isNumber && numberPart) {
        streetPart = search;
        numberPart = "";
      }

      const streetRegex = new RegExp(
        createAccentInsensitiveRegex(streetPart || search),
        "i",
      );
      const numberRegex = new RegExp(numberPart, "i");

      let addressSearchCondition = streetPart
        ? isNumber
          ? {
              $and: [
                { "adDirection.address.street": { $regex: streetRegex } },
                {
                  "adDirection.address.directionNumber": {
                    $regex: numberRegex,
                  },
                },
              ],
            }
          : { "adDirection.address.street": { $regex: streetRegex } }
        : {};

      queryConditions.$or = [
        { adReference: { $regex: searchRegex } },
        { title: { $regex: searchRegex } },
        ...(ownerIds.length > 0
          ? [{ owner: { $in: ownerIds.map((c) => c._id) } }]
          : []),
        ...(consultantIds.length > 0
          ? [{ consultant: { $in: consultantIds.map((c) => c._id) } }]
          : []),
        ...(Object.keys(addressSearchCondition).length > 0
          ? [addressSearchCondition]
          : []),
      ];
    }

    // 4. Aplicación de Filtros (Corregido)
    const statusValues = normalizeFilter(req.query.adStatus);
    if (statusValues.length > 0)
      queryConditions.adStatus = { $in: statusValues };

    const opCloseValues = normalizeFilter(req.query.gvOperationClose);
    if (opCloseValues.length > 0)
      queryConditions.gvOperationClose = { $in: opCloseValues };

    const buildingValues = normalizeFilter(req.query.adBuildingType);
    if (buildingValues.length > 0)
      queryConditions.adBuildingType = { $in: buildingValues };

    const typeValues = normalizeFilter(req.query.adType);
    if (typeValues.length > 0) queryConditions.adType = { $in: typeValues };

    const zoneValues = normalizeFilter(req.query.zone);
    if (zoneValues.length > 0) {
      queryConditions.zone = {
        $in: zoneValues.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (department && department !== "Todos") {
      queryConditions.department = department;
    }

    // 5. Ordenación y Paginación
    let sort = { updatedAt: -1 };
    if (sortField && (sortOrder === "ASC" || sortOrder === "DESC")) {
      sort = { [sortField]: sortOrder === "ASC" ? 1 : -1 };
    }

    page = Math.max(1, parseInt(page) || 1);
    limit = parseInt(limit) || 100;

    // 6. Ejecución
    const [ads, totalElements] = await Promise.all([
      Ad.find(queryConditions)
        .populate("zone", "zone name")
        .populate("owner", "fullName")
        .populate("consultant", "fullName")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Ad.countDocuments(queryConditions),
    ]);

    return res.status(200).json({
      ads,
      pageInfo: {
        page,
        totalPages: Math.ceil(totalElements / limit),
        totalElements,
        limit,
      },
    });
  } catch (err) {
    console.error("Error en adGetByFilters:", err);
    return next(err);
  }
};

const adGetMatchedRequests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById({ _id: id });
    const search = req.query.search;

    if (!ad) {
      return res.status(404).json({ message: "Anuncio no encontrado." });
    }

    let query = Request.find();

    if (ad.adType && ad.adType.length !== 0)
      query.where({ requestAdType: { $in: ad.adType } });
    if (ad.adBuildingType && ad.adBuildingType.length !== 0)
      query.where({ requestBuildingType: { $in: ad.adBuildingType } });
    if (ad.zone && ad.zone.length !== 0)
      query.where({ requestZone: { $in: ad.zone } });

    // --- FILTROS DE RANGO CON MANEJO DE NULL / 0 (Sin Límite) ---

    if (ad.sale && ad.sale.saleValue > 0) {
      query.and([
        {
          $or: [
            { "requestSalePrice.salePriceMax": { $gte: ad.sale.saleValue } },
            { "requestSalePrice.salePriceMax": null },
            { "requestSalePrice.salePriceMax": 0 },
          ],
        },
        {
          $or: [
            { "requestSalePrice.salePriceMin": { $lte: ad.sale.saleValue } },
            { "requestSalePrice.salePriceMin": null },
            { "requestSalePrice.salePriceMin": 0 },
          ],
        },
      ]);
    }

    if (ad.rent && ad.rent.rentValue > 0) {
      query.and([
        {
          $or: [
            { "requestRentPrice.rentPriceMax": { $gte: ad.rent.rentValue } },
            { "requestRentPrice.rentPriceMax": null },
            { "requestRentPrice.rentPriceMax": 0 },
          ],
        },
        {
          $or: [
            { "requestRentPrice.rentPriceMin": { $lte: ad.rent.rentValue } },
            { "requestRentPrice.rentPriceMin": null },
            { "requestRentPrice.rentPriceMin": 0 },
          ],
        },
      ]);
    }

    if (ad.buildSurface > 0) {
      query.and([
        {
          $or: [
            {
              "requestBuildSurface.buildSurfaceMax": { $gte: ad.buildSurface },
            },
            { "requestBuildSurface.buildSurfaceMax": null },
            { "requestBuildSurface.buildSurfaceMax": 0 },
          ],
        },
        {
          $or: [
            {
              "requestBuildSurface.buildSurfaceMin": { $lte: ad.buildSurface },
            },
            { "requestBuildSurface.buildSurfaceMin": null },
            { "requestBuildSurface.buildSurfaceMin": 0 },
          ],
        },
      ]);
    }

    if (ad.plotSurface > 0) {
      query.and([
        {
          $or: [
            { "requestPlotSurface.plotSurfaceMax": { $gte: ad.plotSurface } },
            { "requestPlotSurface.plotSurfaceMax": null },
            { "requestPlotSurface.plotSurfaceMax": 0 },
          ],
        },
        {
          $or: [
            { "requestPlotSurface.plotSurfaceMin": { $lte: ad.plotSurface } },
            { "requestPlotSurface.plotSurfaceMin": null },
            { "requestPlotSurface.plotSurfaceMin": 0 },
          ],
        },
      ]);
    }

    if (ad.quality && ad.quality.bedrooms > 0) {
      query.and([
        {
          $or: [
            { "requestBedrooms.bedroomsMax": { $gte: ad.quality.bedrooms } },
            { "requestBedrooms.bedroomsMax": null },
            { "requestBedrooms.bedroomsMax": 0 },
          ],
        },
        {
          $or: [
            { "requestBedrooms.bedroomsMin": { $lte: ad.quality.bedrooms } },
            { "requestBedrooms.bedroomsMin": null },
            { "requestBedrooms.bedroomsMin": 0 },
          ],
        },
      ]);
    }

    if (ad.quality && ad.quality.bathrooms > 0) {
      query.and([
        {
          $or: [
            { "requestBathrooms.bathroomsMax": { $gte: ad.quality.bathrooms } },
            { "requestBathrooms.bathroomsMax": null },
            { "requestBathrooms.bathroomsMax": 0 },
          ],
        },
        {
          $or: [
            { "requestBathrooms.bathroomsMin": { $lte: ad.quality.bathrooms } },
            { "requestBathrooms.bathroomsMin": null },
            { "requestBathrooms.bathroomsMin": 0 },
          ],
        },
      ]);
    }

    // --- FILTRO DE REFORMADO / A REFORMAR ---
    // Reglas de negocio:
    //  - Si el anuncio tiene alguna marca (reformed o toReform), solo cruzan
    //    peticiones sin marcas o con al menos una marca coincidente.
    //  - Si el anuncio no tiene marcas, no se aplica filtro (aparece en todas
    //    las peticiones).
    const adReformed = ad.quality?.reformed === true;
    const adToReform = ad.quality?.toReform === true;

    if (adReformed || adToReform) {
      const reformOr = [
        { reformed: { $ne: true }, toReform: { $ne: true } },
      ];
      if (adReformed) reformOr.push({ reformed: true });
      if (adToReform) reformOr.push({ toReform: true });
      query.and([{ $or: reformOr }]);
    }

    // --- RESTO DE FILTROS ---

    if (!ad.quality?.others?.smokeOutlet) {
      query.where({ smokeOutlet: { $ne: true } });
    }

    if (!ad.profitability) {
      query.where({ profitability: { $ne: true } });
    }

    if (!ad.quality?.others?.coworking) {
      query.where({ coworking: { $ne: true } });
    }

    if (!ad.quality?.others?.exclusiveOfficeBuilding) {
      query.where({ exclusiveOfficeBuilding: { $ne: true } });
    }

    if (!ad.quality?.others?.implanted) {
      query.where({ implanted: { $ne: true } });
    }

    if (!ad.quality?.others?.seaViews) {
      query.where({ seaViews: { $ne: true } });
    }

    if (!ad.quality?.others?.golfCourseView) {
      query.where({ golfCourseView: { $ne: true } });
    }

    if (!ad.quality?.others?.fullHoursSecurity) {
      query.where({ fullHoursSecurity: { $ne: true } });
    }

    if (!ad.quality?.others?.gatedCommunity) {
      query.where({ gatedCommunity: { $ne: true } });
    }

    query.populate([
      {
        path: "requestContact",
        select:
          "fullName company email contactComments notReceiveCommunications",
      },
      {
        path: "requestZone",
      },
    ]);

    query.sort({ createdAt: -1 });

    const requests = await query.exec();

    let filteredRequests = requests;
    if (search) {
      const regex = new RegExp(search, "i");
      filteredRequests = requests.filter((req) => {
        const name = req.requestContact?.fullName || "";
        const company = req.requestContact?.company || "";
        const comment = req.requestComment || "";
        const zoneNames = req.requestZone?.map((z) => z.name).join(" ") || "";
        return (
          regex.test(name) ||
          regex.test(company) ||
          regex.test(comment) ||
          regex.test(zoneNames)
        );
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
    const ad = await Ad.findById(id).populate("zone");
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
      saleRepercussionM2: req.body.saleRepercussionM2,
      saleRepercussionM2ShowOnWeb: req.body.saleRepercussionM2ShowOnWeb,
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
      storageRoom: req.body.storageRoom,
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
        indoorPoolCheck: req.body.indoorPoolCheck,
        outdoorPoolCheck: req.body.outdoorPoolCheck,
        outdoorPoolClimatized: req.body.outdoorPoolCheck
          ? req.body.outdoorPoolClimatized
          : false,
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
        individualHeating: req.body.individualHeating,
        concierge: req.body.concierge,
        mixedBuilding: req.body.mixedBuilding,
        accessiblePMR: req.body.accessiblePMR,
        agricultural: req.body.agricultural,
        hunting: req.body.hunting,
        forestry: req.body.forestry,
        livestock: req.body.livestock,
        rusticOther: req.body.rusticOther,
        warehouses: req.body.warehouses,
        secondaryHousing: req.body.secondaryHousing,
        equestrianFacilities: req.body.equestrianFacilities,
        electricSupply: req.body.electricSupply,
        pond: req.body.pond,
        reservoir: req.body.reservoir,

        recess: req.body.recess,
        fenced: req.body.fenced,
        porch: req.body.porch,
        fireplace: req.body.fireplace,
        gym: req.body.gym,

        modernStyle: req.body.modernStyle,
        classicStyle: req.body.classicStyle,
        andaluzStyle: req.body.andaluzStyle,
        seaViews: req.body.seaViews,
        panoramicView: req.body.panoramicView,

        golfCourseView: req.body.golfCourseView,
        mountainView: req.body.mountainView,
        privateGarden: req.body.privateGarden,
        solarium: req.body.solarium,
        outdoorKitchen: req.body.outdoorKitchen,

        carPort: req.body.carPort,
        lounge: req.body.lounge,
        firePlace: req.body.firePlace,
        showKitchen: req.body.showKitchen,
        dirtyKitchen: req.body.dirtyKitchen,

        spa: req.body.spa,
        movieTheater: req.body.movieTheater,
        wineCellar: req.body.wineCellar,
        laundry: req.body.laundry,
        brandedDesign: req.body.brandedDesign,

        conciergeService: req.body.conciergeService,
        gatedCommunity: req.body.gatedCommunity,
        panicRoom: req.body.panicRoom,
        newConstruction: req.body.newConstruction,
        goodConservation: req.body.goodConservation,
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
      showOnWebOffMarket: req.body.showOnWebOffMarket,
      featuredOnMain: req.body.featuredOnMain,
      featuredDrawings: req.body.featuredDrawings,
      adDirection: adDirection,
      adType: req.body.adType,
      gvOperationClose: req.body.gvOperationClose,
      owner: req.body.owner,
      consultant: req.body.consultant,
      realStatePortals: req.body.realStatePortals,
      adBuildingType: req.body.adBuildingType,
      zone: req.body.zone,
      department: req.body.department,
      webSubtitle: req.body.webSubtitle,
      buildSurface: req.body.buildSurface,
      plotSurface: req.body.plotSurface,
      m2StorageSpace: req.body.m2StorageSpace,
      m2Terrace: req.body.m2Terrace,
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

    try {
      let consultantInfo = null;
      if (req.body.userId) {
        try {
          const c = await Consultant.findById(
            req.body.userId,
            "fullName",
          ).lean();
          if (c) consultantInfo = { _id: c._id, fullName: c.fullName };
        } catch (e) {}
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
      console.error("Failed to prepare creation history entry:", e);
    }

    const adCreated = await newAd.save();

    // =====================================================================
    // 🔌 INTEGRACIÓN ISR: REVALIDACIÓN AUTOMÁTICA
    // =====================================================================

    const validStatuses = ["Activo", "En preparación"];
    const isVisible =
      adCreated.showOnWeb && validStatuses.includes(adCreated.adStatus);

    if (isVisible) {
      const tagsToRevalidate = new Set([
        "home-data",
        "ads-list",
        "inventory-zones",
        "filter-stats",
        "similar-ads",
      ]);

      if (adCreated.featuredOnMain) {
        tagsToRevalidate.add("featured-ads");
      }

      // 🚀 ACTUALIZADO: Batching y Fire & Forget (No bloqueamos el backend)
      const tagsArray = Array.from(tagsToRevalidate);
      revalidateWeb(tagsArray).catch((err) =>
        console.error("❌ Falló revalidación en background (creación):", err),
      );
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

    // CORRECCIÓN: Uso de getCdnUrl
    fieldsToUpdate.images.main = req.file ? getCdnUrl(req.file) : "";

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

    // CORRECCIÓN: Uso de getCdnUrl
    fieldsToUpdate.images.media = req.file ? getCdnUrl(req.file) : "";

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

    // CORRECCIÓN: Uso de getCdnUrl en el mapeo
    const newImageUrls = req.files
      ? req.files.map((file) => getCdnUrl(file))
      : [];

    if (newImageUrls.length === 0) {
      const ad = await Ad.findById(id);
      return res.status(200).json(ad);
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $push: { "images.blueprint": { $each: newImageUrls } } },
      { new: true },
    );

    if (!updatedAd)
      return res.status(404).json({ message: "Anuncio no encontrado." });
    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adOthersImagesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    // CORRECCIÓN: Uso de getCdnUrl en el mapeo
    const newImageUrls = req.files
      ? req.files.map((file) => getCdnUrl(file))
      : [];

    if (newImageUrls.length === 0) {
      const ad = await Ad.findById(id);
      return res.status(200).json(ad);
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $push: { "images.others": { $each: newImageUrls } } },
      { new: true },
    );

    if (!updatedAd)
      return res.status(404).json({ message: "Anuncio no encontrado." });
    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adMainImagesDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteImage(req.body.toDelete);

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

    await deleteImage(req.body.toDelete);

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

    const imagesToDelete = Array.isArray(toDelete) ? toDelete : [toDelete];

    await Promise.all(imagesToDelete.map((img) => deleteImage(img)));

    fieldsToUpdate.images.blueprint = fieldsToUpdate.images.blueprint.filter(
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

const adOthersImagesDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { toDelete } = req.body;

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    const imagesToDelete = Array.isArray(toDelete) ? toDelete : [toDelete];

    await Promise.all(imagesToDelete.map((img) => deleteImage(img)));

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

    const currentAd = await Ad.findById(id)
      .populate("owner", "fullName")
      .populate("consultant", "fullName")
      .lean();

    if (!currentAd) {
      return res.status(404).json({ message: "Anuncio no encontrado" });
    }

    const fieldsToUpdate = {};
    fieldsToUpdate.title = req.body.title;
    fieldsToUpdate.showOnWeb = req.body.showOnWeb;
    fieldsToUpdate.showOnWebOffMarket = req.body.showOnWebOffMarket;
    fieldsToUpdate.adStatus = req.body.adStatus;
    fieldsToUpdate.adReference = req.body.adReference;
    fieldsToUpdate.internalComments = req.body.internalComments;
    fieldsToUpdate.featuredOnMain = req.body.featuredOnMain;
    fieldsToUpdate.featuredDrawings = req.body.featuredDrawings;
    fieldsToUpdate.adType = req.body.adType;
    fieldsToUpdate.gvOperationClose = req.body.gvOperationClose;
    fieldsToUpdate.owner = req.body.owner;
    fieldsToUpdate.consultant = req.body.consultant;
    fieldsToUpdate.realStatePortals = req.body.realStatePortals;
    fieldsToUpdate.adBuildingType = req.body.adBuildingType;
    fieldsToUpdate.zone = req.body.zone;
    fieldsToUpdate.department = req.body.department;
    fieldsToUpdate.webSubtitle = req.body.webSubtitle;
    fieldsToUpdate.profitability = req.body.profitability;
    fieldsToUpdate.profitabilityValue = req.body.profitabilityValue;
    fieldsToUpdate.buildSurface = req.body.buildSurface;
    fieldsToUpdate.plotSurface = req.body.plotSurface;
    fieldsToUpdate.m2StorageSpace = req.body.m2StorageSpace;
    fieldsToUpdate.m2Terrace = req.body.m2Terrace;
    fieldsToUpdate.floor = req.body.floor;
    fieldsToUpdate.disponibility = req.body.disponibility;
    fieldsToUpdate.monthlyRent = req.body.monthlyRent;
    fieldsToUpdate.expenses = req.body.expenses;
    fieldsToUpdate.expensesIncluded = req.body.expensesIncluded;

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
    fieldsToUpdate.sale = {
      saleValue: req.body.saleValue,
      saleShowOnWeb: req.body.saleShowOnWeb,
      saleRepercussionM2: req.body.saleRepercussionM2,
      saleRepercussionM2ShowOnWeb: req.body.saleRepercussionM2ShowOnWeb,
    };
    fieldsToUpdate.rent = {
      rentValue: req.body.rentValue,
      rentShowOnWeb: req.body.rentShowOnWeb,
    };
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
      storageRoom: req.body.storageRoom,
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
        indoorPoolCheck: req.body.indoorPoolCheck,
        outdoorPoolCheck: req.body.outdoorPoolCheck,
        outdoorPoolClimatized: req.body.outdoorPoolCheck
          ? req.body.outdoorPoolClimatized
          : false,
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
        individualHeating: req.body.individualHeating,
        concierge: req.body.concierge,
        mixedBuilding: req.body.mixedBuilding,
        accessiblePMR: req.body.accessiblePMR,
        agricultural: req.body.agricultural,
        hunting: req.body.hunting,
        forestry: req.body.forestry,
        livestock: req.body.livestock,
        rusticOther: req.body.rusticOther,
        warehouses: req.body.warehouses,
        secondaryHousing: req.body.secondaryHousing,
        equestrianFacilities: req.body.equestrianFacilities,
        electricSupply: req.body.electricSupply,
        pond: req.body.pond,
        reservoir: req.body.reservoir,
        recess: req.body.recess,
        fenced: req.body.fenced,
        porch: req.body.porch,
        fireplace: req.body.fireplace,
        gym: req.body.gym,
        modernStyle: req.body.modernStyle,
        classicStyle: req.body.classicStyle,
        andaluzStyle: req.body.andaluzStyle,
        seaViews: req.body.seaViews,
        panoramicView: req.body.panoramicView,
        golfCourseView: req.body.golfCourseView,
        mountainView: req.body.mountainView,
        privateGarden: req.body.privateGarden,
        solarium: req.body.solarium,
        outdoorKitchen: req.body.outdoorKitchen,
        carPort: req.body.carPort,
        lounge: req.body.lounge,
        firePlace: req.body.firePlace,
        showKitchen: req.body.showKitchen,
        dirtyKitchen: req.body.dirtyKitchen,
        spa: req.body.spa,
        movieTheater: req.body.movieTheater,
        wineCellar: req.body.wineCellar,
        laundry: req.body.laundry,
        brandedDesign: req.body.brandedDesign,
        conciergeService: req.body.conciergeService,
        gatedCommunity: req.body.gatedCommunity,
        panicRoom: req.body.panicRoom,
        newConstruction: req.body.newConstruction,
        goodConservation: req.body.goodConservation,
      },
    };

    fieldsToUpdate.description = {
      web: req.body.web,
      emailPDF: req.body.emailPDF,
      distribution: req.body.distribution,
    };

    const historyEntries = [];
    let consultantInfo = null;
    if (req.body.userId) {
      try {
        const c = await Consultant.findById(req.body.userId, "fullName").lean();
        if (c) consultantInfo = { _id: c._id, fullName: c.fullName };
      } catch (e) {}
    }
    if (!consultantInfo && currentAd && currentAd.consultant) {
      consultantInfo =
        currentAd.consultant && currentAd.consultant.fullName
          ? {
              _id: currentAd.consultant._id,
              fullName: currentAd.consultant.fullName,
            }
          : { _id: currentAd.consultant };
    }

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

    // 4. Actualización masiva
    if (req.body.updateSameRef && req.body.adReference) {
      await Ad.updateMany(
        {
          adReference: req.body.adReference,
          _id: { $ne: id },
        },
        {
          $set: { surfacesBox: req.body.surfacesBox },
        },
      );
    }

    // 5. Update Ops e Historial Sintético
    const updateOps = { $set: fieldsToUpdate };
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

    await Ad.findByIdAndUpdate(id, updateOps);

    const updatedAdDoc = await Ad.findById(id)
      .populate("consultant", "fullName")
      .populate("owner", "fullName");
    const titleChanged = currentAd.title !== req.body.title;
    if (!updatedAdDoc.slug || titleChanged) {
      if (titleChanged) updatedAdDoc.slug = null;
      updatedAdDoc.markModified("title");
      await updatedAdDoc.save();
    }

    // =====================================================================
    // 🚀 SINCRONIZACIÓN CON WEBHOME
    // =====================================================================
    try {
      const labels = [];
      if (updatedAdDoc.sale?.saleShowOnWeb && updatedAdDoc.sale?.saleValue)
        labels.push("Venta");
      if (updatedAdDoc.rent?.rentShowOnWeb && updatedAdDoc.rent?.rentValue)
        labels.push("Alquiler");

      await WebHome.updateMany(
        { "videoSection.videos.adId": id },
        {
          $set: {
            "videoSection.videos.$.title": updatedAdDoc.title,
            "videoSection.videos.$.slug": updatedAdDoc.slug,
            "videoSection.videos.$.adReference": updatedAdDoc.adReference,
            "videoSection.videos.$.price": {
              sale:
                updatedAdDoc.sale?.saleShowOnWeb && updatedAdDoc.sale.saleValue
                  ? updatedAdDoc.sale.saleValue
                  : null,
              rent:
                updatedAdDoc.rent?.rentShowOnWeb && updatedAdDoc.rent.rentValue
                  ? updatedAdDoc.rent.rentValue
                  : null,
              label: labels.join(" / "),
            },
          },
        },
      );
    } catch (syncError) {
      console.error("Error Sync Home:", syncError);
    }

    const updatedAd = updatedAdDoc.toObject();
    if (typeof normalizeAdHistory === "function") {
      updatedAd.changesHistory = normalizeAdHistory(updatedAd);
    }

    const validStatuses = ["Activo", "En preparación"];
    const isVisibleNow =
      updatedAd.showOnWeb && validStatuses.includes(updatedAd.adStatus);

    // =====================================================================
    // LÓGICA DE REVALIDACIÓN BATCHING
    // =====================================================================
    const tagsToRevalidate = new Set();

    const zoneChanged =
      JSON.stringify(currentAd.zone) !== JSON.stringify(req.body.zone);
    const statusChanged = currentAd.adStatus !== req.body.adStatus;
    const visibilityChanged = currentAd.showOnWeb !== req.body.showOnWeb;
    const operationCloseChanged =
      currentAd.gvOperationClose !== req.body.gvOperationClose;
    const departmentChanged = currentAd.department !== req.body.department;

    if (
      zoneChanged ||
      statusChanged ||
      visibilityChanged ||
      operationCloseChanged ||
      departmentChanged
    ) {
      tagsToRevalidate.add("inventory-zones");
    }

    if (
      isVisibleNow ||
      currentAd.showOnWeb !== req.body.showOnWeb ||
      currentAd.adStatus !== req.body.adStatus
    ) {
      tagsToRevalidate.add("home-data");
      tagsToRevalidate.add("ads-list");
      tagsToRevalidate.add("filter-stats");
      tagsToRevalidate.add("similar-ads");
    }

    if (
      updatedAd.featuredOnMain ||
      currentAd.featuredOnMain !== req.body.featuredOnMain
    ) {
      tagsToRevalidate.add("featured-ads");
    }

    if (updatedAd.slug) {
      tagsToRevalidate.add(`ad-${updatedAd.slug}`);
      if (currentAd.slug && currentAd.slug !== updatedAd.slug) {
        tagsToRevalidate.add(`ad-${currentAd.slug}`);
      }
    }

    const tagsArray = Array.from(tagsToRevalidate);
    if (tagsArray.length > 0) {
      revalidateWeb(tagsArray).catch((err) =>
        console.error(
          "❌ Falló revalidación en background (actualización):",
          err,
        ),
      );
    }

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

    // =====================================================================
    // 🧹 NUEVO: LIMPIEZA DE S3 (Evitamos imágenes huérfanas)
    // =====================================================================
    try {
      const deletePromises = [];

      if (adToDelete.images?.main)
        deletePromises.push(deleteImage(adToDelete.images.main));
      if (adToDelete.images?.media)
        deletePromises.push(deleteImage(adToDelete.images.media));

      if (adToDelete.images?.blueprint?.length > 0) {
        adToDelete.images.blueprint.forEach((img) =>
          deletePromises.push(deleteImage(img)),
        );
      }

      if (adToDelete.images?.others?.length > 0) {
        adToDelete.images.others.forEach((img) =>
          deletePromises.push(deleteImage(img)),
        );
      }

      if (deletePromises.length > 0) {
        await Promise.allSettled(deletePromises);
      }
    } catch (e) {
      console.error("Aviso: Error durante el borrado de imágenes en S3", e);
    }
    // =====================================================================

    response = "Anuncio borrado de la base de datos";

    // =====================================================================
    // 🔌 INTEGRACIÓN ISR (BORRADO)
    // =====================================================================

    const validStatuses = ["Activo", "En preparación"];

    // Verificamos si el anuncio QUE ACABAMOS DE BORRAR era visible
    const wasVisible =
      adToDelete.showOnWeb && validStatuses.includes(adToDelete.adStatus);

    if (wasVisible) {
      const tagsToRevalidate = [
        "home-data",
        "ads-list",
        "filter-stats",
        "similar-ads",
      ];

      if (adToDelete.featuredOnMain) {
        tagsToRevalidate.push("featured-ads");
      }

      revalidateWeb(tagsToRevalidate).catch((err) =>
        console.error("❌ Falló revalidación en background (borrado):", err),
      );
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
