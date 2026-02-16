const Zone = require("../models/zone.model");

const getAllZones = async (req, res, next) => {
  try {
    const zones = await Zone.find().sort({ name: 1 });
    return res.status(200).json({ zones });
  } catch (err) {
    return next(err);
  }
};

const zonesGetResidentials = async (req, res, next) => {
  try {
    const zones = await Zone.find({
      zone: { $nin: ["Patrimonial", "Others"] },
    });
    return res.status(200).json(zones);
  } catch (err) {
    return next(err);
  }
};

const zonesGetPatrimonials = async (req, res, next) => {
  try {
    const zones = await Zone.find({ zone: "Patrimonial" });
    return res.status(200).json(zones);
  } catch (err) {
    return next(err);
  }
};

const zonesGetOthers = async (req, res, next) => {
  try {
    const zones = await Zone.find({ zone: "Others" });
    /* console.log(zones) */
    return res.status(200).json(zones);
  } catch (err) {
    return next(err);
  }
};

const zoneGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const zone = await Zone.findById(id);
    return res.status(200).json(zone);
  } catch (err) {
    return next(err);
  }
};

const zoneCreate = async (req, res, next) => {
  try {
    const newZone = new Zone({
      zone: req.body.zone,
      name: req.body.name,
      id: req.body.id,
    });

    const zoneCreated = await newZone.save();

    return res.status(200).json(zoneCreated);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const zoneDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let response = "";

    const deleted = await Zone.findByIdAndDelete(id);
    if (deleted) response = "Zona borrada de la base de datos";
    else
      response =
        "No se ha podido encontrar esta zona. ¿Estás seguro de que existe?";

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  zonesGetResidentials,
  zonesGetPatrimonials,
  zonesGetOthers,
  zoneGetOne,
  zoneCreate,
  zoneDelete,
  zonesGetTaxonomy,
  getAllZones,
};
