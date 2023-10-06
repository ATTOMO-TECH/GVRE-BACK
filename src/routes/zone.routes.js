const express = require('express');
const { isAuth, isAdmin } = require('../middlewares/auth.middleware');
const {
    zonesGetResidentials,
    zonesGetPatrimonials,
    zonesGetOthers,
    zoneCreate,
    zoneDelete
} = require('../controllers/zone.controller');

const router = express.Router();

router.get('/residentials', zonesGetResidentials);
router.get('/patrimonials', zonesGetPatrimonials);
router.get('/others', zonesGetOthers);

router.post('/create', zoneCreate);

router.delete('/delete/:id', zoneDelete);

module.exports = router;
