const Ad = require("./../models/ad.model");
const Request = require("./../models/request.model");
const { deleteImage } = require("../middlewares/file.middleware");
const mongoose = require("mongoose");
const Contact = require("../models/contact.model");
const Consultant = require("../models/consultant.model");
const {
  orderAdsAscendentBySalePrice,
  orderAdsDescendentBySalePrice,
  orderAdsAscendentByRentPrice,
  orderAdsDescendentByRentPrice,
} = require("./utils");

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
        `${count} anuncios han sido corregidos. La reparación ha finalizado correctamente`
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
    // console.log('paramsIniciales:',params)

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

    /* console.log('adType:', adType) */
    /* console.log('minSurface:', minSurface) */
    /* console.log('maxSurface:', maxSurface) */
    /* console.log('minRentPrice:', minRentPrice) */
    /* console.log('maxRentPrice:', maxRentPrice) */
    /* console.log('minSalePrice:', minSalePrice) */
    /* console.log('maxSalePrice:', maxSalePrice) */
    /* console.log('parametros finales:',params) */
    /* console.log('paramtro fecha:', params.orderByDate) */
    /* console.log('ordenacion por fecha:',orderByDate) */

    const query = Ad.find();

    query.where({ department: department });
    query.and({ showOnWeb: true });
    // query.and({ adStatus: "Activo" })
    if (!!params.featuredOnMain) query.and({ featuredOnMain: featuredOnMain });
    if (!!params.zone) {
      query.and({ zone: { $in: zoneParam } });
    }
    if (!!params.adType) query.and({ adType: { $in: adType } });
    if (!!params.adReference) query.and({ adReference });
    if (!!params.adBuildingType)
      query.and({ adBuildingType: { $in: adBuildingType } });
    if (!!params.swimmingPool)
      query.and({ "quality.others.swimmingPool": hasSwimmingPool });
    if (!!params.garage) query.and({ "quality.others.garage": hasGarage });
    if (!!params.terrace) query.and({ "quality.others.terrace": hasTerrace });
    if (!!params.exclusiveOfficeBuilding)
      query.and({
        "quality.others.exclusiveOfficeBuilding": hasexclusiveOffice,
      });
    if (!!params.classicBuilding)
      query.and({ "quality.others.classicBuilding": hasClassicBuilding });
    if (!!params.coworking)
      query.and({ "quality.others.coworking": hasCoworking });
    if (!!params.minSurface && !!params.maxSurface) {
      query.and({ buildSurface: { $gte: minSurface, $lte: maxSurface } });
    } else {
      query.and({
        buildSurface: {
          $gte: minSurface[0].buildSurface,
          $lte: maxSurface[0].buildSurface,
        },
      });
    }

    /* console.log(!!params.adType) */
    if (!!params.adType && adType.length === 1) {
      /* console.log(adType) */
      if (adType[0] === "Venta") {
        /* console.log('dentro de venta') */
        if (!!params.minSalePrice && !!params.maxSalePrice) {
          /* console.log('en el if') */
          query.and({
            "sale.saleValue": {
              $gte: minSalePrice,
              $lte: maxSalePrice,
            },
          });
        } else {
          /* console.log('en el else') */
          query.and({
            "sale.saleValue": {
              $gte: minSalePrice[0].sale.saleValue,
              $lte: maxSalePrice[0].sale.saleValue,
            },
          });
        }
      }
      if (adType[0] === "Alquiler") {
        if (!!params.minRentPrice && !!params.maxRentPrice) {
          query.and({
            "rent.rentValue": {
              $gte: minRentPrice,
              $lte: maxRentPrice,
            },
          });
        } else {
          query.and({
            "rent.rentValue": {
              $gte: minRentPrice[0].rent.rentValue,
              $lte: maxRentPrice[0].rent.rentValue,
            },
          });
        }
      }
    }
    if (orderByDate) {
      /* console.log('ordeno por fecha') */
      query.sort({ createdAt: -1 });
    } else {
      if (!!params.adType && params.adType === "Alquiler")
        query.sort({ "rent.rentValue": -1 });
      else query.sort({ "sale.saleValue": -1, "rent.rentValue": -1 });
    }

    const adsPerPage = 30;

    let ads = await query.exec();
    /* ads.forEach(ad => console.log(ad.title)) */
    let totalAds = ads.length;
    // console.log('anuncios:', totalAds )
    const totalActives = ads.length === 0 ? 0 : ads.length;
    let totalPages = Math.ceil(totalActives / adsPerPage);

    // let totalPages = totalAds / adsPerPage
    if (totalPages === 0) totalPages = 1;
    if (parseInt(page) === 1) {
      if (totalActives > adsPerPage) {
        ads = ads.slice(page - 1, adsPerPage);
      }
    } else if (parseInt(page) === totalPages) {
      ads = ads.slice((page - 1) * adsPerPage, ads.length);
    } else {
      ads = ads.slice((page - 1) * adsPerPage, adsPerPage * page);
    }
    if (ads.length === 0) {
      ads = [];
      totalPages = 1;
    }

    // if (totalPages < 0) totalPages = 1;
    // else if (Math.floor(totalPages) !== 0) totalPages + 1;

    // if (page === 1) {
    //   if (totalAds > adsPerPage) {
    //     ads = ads.slice(page - 1, adsPerPage);
    //   }
    // } else if (ads.length === 0) {
    //   ads = [];
    //   totalPages = 0;
    // } else {
    //   ads = ads.slice((page - 1) * adsPerPage + 1, adsPerPage * page + 1);
    // }
    const messageToSend = {
      totalAds,
      totalPages,
      //   totalPages: Math.trunc(totalPages),
      ads,
    };

    return res.status(200).json(messageToSend);
  } catch (err) {
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
        "_id"
      ).then((contacts) => contacts.map((contact) => contact._id));

      const consultantIds = await Consultant.find(
        {
          fullName: {
            $regex: new RegExp(createAccentInsensitiveRegex(search), "i"),
          },
        },
        "_id"
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
        "i"
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

const allAdsGetByIdConsultant = async (req, res, next) => {
  try {
    const { consultantId } = req.params;
    const ad = await Ad.find({ consultant: consultantId });
    /* console.log('ad',ad.length); */
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

    const adCreated = await newAd.save();
    /* console.log(adCreated) */

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

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    const blueprint = req.files
      ? req.files.map(
          (file) =>
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`
        )
      : [];

    if (ad.images.blueprint.length !== 0) {
      req.files.forEach((file) => {
        if (
          !fieldsToUpdate.images.blueprint.includes(
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`
          )
        ) {
          fieldsToUpdate.images.blueprint.push(
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`
          );
        }
      });
    } else {
      fieldsToUpdate.images.blueprint = blueprint;
    }

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adOthersImagesUpload = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    const others = req.files
      ? req.files.map(
          (file) =>
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`
        )
      : [];

    if (ad.images.others.length !== 0) {
      req.files.forEach((file) => {
        if (
          !fieldsToUpdate.images.others.includes(
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`
          )
        ) {
          fieldsToUpdate.images.others.push(
            `https://${file.bucket}.fra1.digitaloceanspaces.com/${file.key}`
          );
        }
      });
    } else {
      fieldsToUpdate.images.others = others;
    }

    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });

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
      (location) => !imagesToDelete.includes(location)
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
      (location) => !imagesToDelete.includes(location)
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
    fieldsToUpdate.buildSurface = req.body.buildSurface;
    fieldsToUpdate.plotSurface = req.body.plotSurface;
    fieldsToUpdate.floor = req.body.floor;
    fieldsToUpdate.disponibility = req.body.disponibility;
    fieldsToUpdate.monthlyRent = req.body.monthlyRent;
    fieldsToUpdate.expenses = req.body.expenses;
    fieldsToUpdate.expensesIncluded = req.body.expensesIncluded;
    fieldsToUpdate.buildingYear = req.body.buildingYear;

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

    if (req.body.updateSameRef && req.body.adReference) {
      await Ad.updateMany(
        {
          adReference: req.body.adReference,
          _id: { $ne: req.body.id }, // para no volver a actualizar el mismo anuncio
        },
        {
          $set: { surfacesBox: req.body.surfacesBox },
        }
      );
    }
    const updatedAd = await Ad.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
    });
    /* console.log(updatedAd) */

    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adUpdateSendedTo = async (req, res, next) => {
  try {
    const { _id } = req.body;
    /* console.log('enviados a:',req.body.sendedTo) */
    /* console.log('id:',_id) */
    const fieldsToUpdate = {};
    fieldsToUpdate.sendedTo = req.body.sendedTo;
    /* console.log(fieldsToUpdate) */
    const updatedAd = await Ad.findByIdAndUpdate(_id, fieldsToUpdate);
    /* console.log(updatedAd) */
    return res.status(200).json(updatedAd);
  } catch (err) {
    return next(err);
  }
};

const adUpdateManyConsultantByConsultantId = async (req, res, next) => {
  try {
    const { currentConsultant } = req.params;
    /* console.log(req.body) */
    /* console.log(currentConsultant) */

    const updatedAds = await Ad.updateMany(
      { consultant: currentConsultant },
      { consultant: req.body[0].consultant }
    );
    /* console.log('resultado',updatedAds) */
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
    /* console.log(req.params) */
    const { id } = req.params;
    let response = "";
    /* console.log(id) */

    const deleted = await Ad.findByIdAndDelete(id);
    if (deleted) response = "Anuncio borrado de la base de datos";
    else
      response =
        "No se ha podido encontrar este anuncio. ¿Estás seguro de que existe?";

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
        message: "Datos inválidos. Se requiere 'from' y un array 'urls'.",
      });
    }

    // 3. Preparamos el campo que vamos a actualizar en la BD
    let fieldToUpdate;
    if (from === "others") {
      fieldToUpdate = "images.others";
    } else if (from === "blueprint") {
      fieldToUpdate = "images.blueprint";
    } else {
      console.log(from);
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
      { new: true }
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
};
