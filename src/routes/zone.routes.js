const express = require("express");

const {
  zonesGetResidentials,
  zonesGetPatrimonials,
  zonesGetOthers,
  zoneCreate,
  zoneDelete,
  zonesGetTaxonomy,
  getAllZones,
} = require("../controllers/zone.controller");

const router = express.Router();
router.get("/allZones", getAllZones);
router.get("/residentials", zonesGetResidentials);
router.get("/patrimonials", zonesGetPatrimonials);
router.get("/others", zonesGetOthers);

router.get("/taxonomia", zonesGetTaxonomy);

router.post("/create", zoneCreate);

router.delete("/delete/:id", zoneDelete);

module.exports = router;
