const express = require("express");

const {
  zonesGetResidentials,
  zonesGetPatrimonials,
  zonesGetOthers,
  zoneCreate,
  zoneDelete,
  getAllZones,
  zonesGetCosta,
  zonesGetRusticAndSingunlar,
} = require("../controllers/zone.controller");

const router = express.Router();
router.get("/allZones", getAllZones);
router.get("/residentials", zonesGetResidentials);
router.get("/patrimonials", zonesGetPatrimonials);
router.get("/others", zonesGetOthers);
router.get("/costa", zonesGetCosta);
router.get("/rustic-and-singular", zonesGetRusticAndSingunlar);

router.post("/create", zoneCreate);

router.delete("/delete/:id", zoneDelete);

module.exports = router;
