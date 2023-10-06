const isAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.json('Acceso restringido')
    }
}

const isAdmin = (req, res, next) => {
    if (req.isAuthenticated()) {
        if (req.user.role === "Admin") {
            return next();
        } else {
            return res.json('/');
        };
    } else {
        return res.json('/');
    };
};

module.exports = {
    isAuth,
    isAdmin,
};