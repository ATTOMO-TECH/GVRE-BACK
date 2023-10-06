const express = require('express');
const { isAuth, isAdmin } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/file.middleware');
const { consultantGetAll, consultantGetOne, consultantDelete, consultantUpdate } = require('../controllers/consultant.controller');
const { registerPost } = require('../controllers/auth.controller');

const router = express.Router();

router.get('/', consultantGetAll);
router.get('/:id', consultantGetOne);

router.post('/create', upload.fields([{ name: 'avatar' }, { name: 'companyUnitLogo' }]), registerPost);
router.put('/edit', upload.fields([{ name: 'avatar' }, { name: 'companyUnitLogo' }]), consultantUpdate);

router.delete('/delete/:id', consultantDelete);

module.exports = router;
