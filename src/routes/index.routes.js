const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
    res.json('Bienvenido al servidor de GVRE');
});

module.exports = router
