const passport = require("passport");
const Consultant = require("../models/consultant.model"); // Necesitamos el modelo aquí también
const registerStrategy = require("./registerStrategy");
const loginStrategy = require("./loginStrategy");

// --- NUEVAS IMPORTACIONES PARA JWT ---
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

/*
 * NOTA: serializeUser y deserializeUser son para SESIONES.
 * En un sistema basado en JWT con { session: false }, estas funciones
 * no se ejecutarán en las rutas protegidas por el token.
 */
passport.serializeUser((user, done) => {
  return done(null, user._id);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const existingUser = await Consultant.findById(userId);
    return done(null, existingUser);
  } catch (error) {
    return done(error, null);
  }
});

// --- TUS ESTRATEGIAS EXISTENTES (se mantienen igual) ---
passport.use("register", registerStrategy);
passport.use("login", loginStrategy);

// --- NUEVA ESTRATEGIA JWT (la "cerradura" para tus rutas protegidas) ---
// Esta estrategia se usará en el middleware 'isAuth' que creamos.
passport.use(
  "jwt", // Le damos un nombre, 'jwt', para poder llamarla luego.
  new JwtStrategy(
    {
      // Le indicamos que extraiga el token de la cabecera 'Authorization'
      // en el formato "Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Le pasamos la misma clave secreta para que pueda verificar si el token es legítimo.
      secretOrKey: process.env.JWT_SECRET,
    },
    // Esta función se ejecuta CADA VEZ que se llama a una ruta protegida con 'isAuth'.
    async (payload, done) => {
      try {
        // 'payload' es el contenido que guardamos en el token: { id, email, role }
        // Buscamos al usuario en la base de datos usando el id del payload.
        const user = await Consultant.findById(payload.id);

        if (user) {
          // Si encontramos al usuario, lo devolvemos. Passport lo pondrá en req.user.
          return done(null, user);
        } else {
          // Si el usuario del token ya no existe en la BBDD (ej: fue borrado).
          return done(null, false);
        }
      } catch (error) {
        return done(error, false);
      }
    }
  )
);
