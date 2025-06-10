const passport = require("passport");

const isAuth = (req, res, next) => {
  // Usamos la estrategia 'jwt' que acabamos de configurar.
  // { session: false } es crucial porque estamos en un sistema sin sesiones.
  passport.authenticate("jwt", { session: false }, (error, user) => {
    if (error || !user) {
      // Si hay un error o el token es inválido/expirado, 'user' será false.
      // Devolvemos un 401 para que el interceptor del frontend pueda actuar.
      return res.status(401).json({ message: "No autorizado" });
    }
    // Si el token es válido, 'user' contendrá los datos del usuario.
    // Lo añadimos a la request para que esté disponible en el controlador.
    req.user = user;
    return next();
  })(req, res, next);
};

const isAdmin = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.role === "Admin") {
      return next();
    } else {
      return res.json("/");
    }
  } else {
    return res.json("/");
  }
};

module.exports = {
  isAuth,
  isAdmin,
};
