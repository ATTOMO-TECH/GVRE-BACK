const authValidator = (req, res, next) => {
  req.isAdmin = false;

  if (!req.isAuthenticated()) {
    return next();
  } else {
    req.isUser = true;
    // console.log('El usuario está autenticado')
  }

  if (req.user && req.user.role === "Admin") {
    req.isAdmin = true;
    // console.log('El usuario es admin')
  }

  return next();
};

module.exports = { authValidator };
