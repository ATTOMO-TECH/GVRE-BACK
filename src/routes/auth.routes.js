const express = require('express');
const { isAuth } = require('../middlewares/auth.middleware');
const router = express.Router();

const { 
    registerGet,
    registerPost,
    loginGet,
    loginPost,
    logoutPost,
    checkSession,
} = require('../controllers/auth.controller');

router.get('/register', registerGet);
router.post('/register', registerPost);

router.get('/login', loginGet);
router.post('/login', loginPost);

router.post('/logout', isAuth, logoutPost);

router.get('/check-session', isAuth, checkSession);

module.exports = router;