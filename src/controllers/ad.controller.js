const Ad = require("./../models/ad.model");
const Request = require("./../models/request.model");
const { deleteImage } = require("../middlewares/file.middleware");
const mongoose = require("mongoose");
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
    /* console.log('req.params.query',req.params) */

    const paramString = req.params.query.replace("&", "");
    /* console.log(paramString) */
    const params = JSON.parse(paramString);
    // console.log('parametros iniciales', params)
    /* console.log('parametros iniciales',typeof params) */
    /* console.log('params.adStatus', params.adStatus) */
    //console.log('parseados', JSON.parse(req.params.query))

    let zoneParam = [];
    if (!!params.zone) {
      zoneParam = params.zone.map((zone) => mongoose.Types.ObjectId(zone._id));
    }
    let adStatus = !!params.adStatus ? params.adStatus : true;
    let gvOperationClose = !!params.gvOperationClose
      ? params.gvOperationClose
      : "";
    let adType = !!params.adType ? params.adType : ["Alquiler", "Venta"];
    let adBuildingType = !!params.adBuildingType
      ? params.adBuildingType
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
    let department = !!params.department ? params.department : "todos";
    let saleValueOrder = !!params.saleOrder ? params.saleOrder : "Defecto";
    let rentValueOrder = !!params.rentOrder ? params.rentOrder : "Defecto";

    /* console.log('adStatus',adStatus) */
    /* console.log('gvOperationClose',gvOperationClose) */
    /* console.log('adType',adType) */
    /* console.log('adBuildingType',adBuildingType) */
    /* console.log('zones',zoneParam) */
    // console.log('department', department)

    const query = Ad.find()
      .populate({ path: "zone", select: "zone name" })
      .populate({ path: "owner", select: "fullName" })
      .populate({ path: "consultant", select: "fullName" });

    if (params.department.toLowerCase() !== "todos") {
      query.and({ department: { $in: department } });
    }
    if (!!params.adStatus) {
      query.and({ adStatus: { $in: adStatus } });
    }
    if (!!params.gvOperationClose) {
      query.and({ gvOperationClose: { $in: gvOperationClose } });
    }
    if (!!params.adBuildingType) {
      query.and({ adBuildingType: { $in: adBuildingType } });
    }
    if (!!params.adType) {
      query.and({ adType: { $in: adType } });
    }
    if (!!params.zone) {
      query.and({ zone: { $in: zoneParam } });
    }

    let ads = await query.exec();
    let sortedAds = [];
    // ads.map((ad) => console.log("sin ordenar:", ad.sale.saleValue));
    // ads.map((ad) => console.log("sin ordenar:", ad.rent.rentValue));
    let orderFunction = () => {};

    if (saleValueOrder !== "Defecto") {
      // console.log("ordeno por venta");

      if (saleValueOrder === "Ascendente")
        orderFunction = orderAdsAscendentBySalePrice;
      else if (saleValueOrder === "Descendente")
        orderFunction = orderAdsDescendentBySalePrice;
      sortedAds = ads.sort(orderFunction);
      // sortedAds.map((ad) => console.log("ordenado", ad.sale.saleValue));
    }
    if (rentValueOrder !== "") {
      // console.log("ordeno por alquiler");

      if (rentValueOrder === "Ascendente")
        orderFunction = orderAdsAscendentByRentPrice;
      else if (rentValueOrder === "Descendente")
        orderFunction = orderAdsDescendentByRentPrice;
      sortedAds = ads.sort(orderFunction);
      // sortedAds.map((ad) => console.log("ordenado:", ad.rent.rentValue));
    }
    if (rentValueOrder === "Defecto" && saleValueOrder === "Defecto") {
      // console.log("ordeno por fecha");
      sortedAds = ads.sort(function (a, b) {
        var keyA = new Date(a.updatedAt),
          keyB = new Date(b.updatedAt);
        // Compare the 2 dates
        if (keyA < keyB) return 1;
        if (keyA > keyB) return -1;
        return 0;
      });
    }
    if (ads.length > 0)
      /* console.log(ads) */
      /* console.log(ads.length) */
      return res.status(200).json(sortedAds);
    if (ads.length === 0) return res.status(200).json([]);
  } catch (err) {
    return next(err);
  }
};

const adGetMatchedRequests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById({ _id: id });

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
    if (ad.adStatus === "Activo") {
      const requests = await query.exec();
      return res.status(200).json(requests);
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

    const images = {
      main: "",
      blueprint: [],
      others: [],
      media: "",
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

    deleteImage(req.body.toDelete);

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    fieldsToUpdate.images.blueprint = fieldsToUpdate.images.blueprint.filter(
      (location) => {
        return req.body.toDelete !== location;
      }
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

    deleteImage(req.body.toDelete);

    const ad = await Ad.findById(id);
    const fieldsToUpdate = ad;

    fieldsToUpdate.images.others = fieldsToUpdate.images.others.filter(
      (location) => {
        return req.body.toDelete !== location;
      }
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
};
