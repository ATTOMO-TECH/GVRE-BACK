const passport = require("passport");

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
  const done = (error, user) => {
    if (error) return next(error);

    const doneForSerialize = (error) => {
      if (error) return next(error);
      return res.json(user);
    };
    req.login(user, doneForSerialize);
  };
  passport.authenticate("login", done)(req);
};

const logoutPost = async (req, res, next) => {
  /* console.log('usuario:',req.user) */
  if (req.user) {
    /*console.log('sesion',req.session)*/
    // req.logout((err)=> {
    //         if (err) { return next(err); }
    //         }
    // );
    await req.session.destroy(
      () => {
        res.clearCookie("connect.sid");
        req.user = null;
        return res.json("Desconectado");
      },
      (error) => console.log("error:", error)
    );
    /* console.log('sesion::',req.session) */
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
