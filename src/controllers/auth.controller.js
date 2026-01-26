const passport = require("passport");
const jwt = require("jsonwebtoken");

const registerGet = (req, res, next) => {
  return res.status(200).json(res);
};

const registerPost = (req, res, next) => {
  const {
    consultantEmail,
    consultantPassword,
    fullName,
    consultantMobileNumber,
    consultantToken,
  } = req.body;

  if (
    !consultantEmail ||
    !consultantPassword ||
    !fullName ||
    !consultantMobileNumber ||
    !consultantToken
  ) {
    const error = new Error("Completa los campos obligatorios");
    return res.json(error);
  }

  const done = (error, user) => {
    if (error) {
      return next(error);
    }

    req.login(user, (error) => {
      if (error) {
        return next(error);
      }
      return res.json(user);
    });
  };

  passport.authenticate("register", done)(req);
};

const loginGet = (req, res, next) => {
  return res.status(200).json(res);
};

const loginPost = (req, res, next) => {
  // El callback 'done' se ejecuta cuando la estrategia 'login' de Passport termina.
  const done = (error, user) => {
    // Si hubo un error en la autenticación (ej: contraseña incorrecta), lo pasamos al siguiente middleware.
    if (error) {
      return next(error);
    }

    // --- AQUÍ OCURRE EL CAMBIO ---
    // En lugar de usar req.login() para sesiones, generamos un token JWT.

    // 1. Prepara el "payload": la información que quieres guardar dentro del token.
    //    ¡Nunca incluyas datos sensibles como la contraseña!
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    // 2. Firma el token.
    //    Usa una clave secreta guardada en tus variables de entorno (NUNCA en el código).
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    user.consultantPassword = "";

    // 3. Envía la respuesta al frontend.
    //    Es buena práctica devolver tanto el token como la información básica del usuario.
    return res.status(200).json({
      token: token,
      user: user,
    });
  };

  // Esta parte no cambia. Le dices a Passport que use tu estrategia "login".
  // Añadimos { session: false } para indicarle a Passport que no cree una sesión.
  passport.authenticate("login", { session: false }, done)(req, res, next);
};

const logoutPost = async (req, res, next) => {
  if (req.user) {
    await req.session.destroy(
      () => {
        res.clearCookie("connect.sid");
        req.user = null;
        return res.json("Desconectado");
      },
      (error) => console.log("error:", error),
    );
  } else {
    return res.status(200).json("No hay usuario conectado");
  }
};

const checkSession = async (req, res, next) => {
  if (req.user) {
    let user = req.user;
    user.password = null;

    return res.status(200).json(user);
  } else {
    return res.status(401).json({ message: "Usuario no encontrado" });
  }
};
module.exports = {
  registerGet,
  registerPost,
  loginGet,
  loginPost,
  logoutPost,
  checkSession,
};
