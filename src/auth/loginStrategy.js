const LocalStrategy = require('passport-local').Strategy;
const Consultant = require('../models/consultant.model');
const bcrypt = require('bcrypt');

/**************************************
 * Login Strategy
 *************************************/

const loginStrategy = new LocalStrategy(
    {
        usernameField: 'identity',
        passwordField: 'password',
        passReqToCallback: true,
    },
    async (req, identity, password, done) => {
        try {

            // User can login with consultantEmail or consultantMobileNumber
            let existingConsultant = await Consultant.findOne({ consultantEmail: identity });

            if (!existingConsultant) {
                const error = new Error("Este usuario no existe");
                error.status = 401;
                return done(error, null);
            }

            const isValidPassword = await bcrypt.compare(password, existingConsultant.consultantPassword);

            if (!isValidPassword) {
                const error = new Error("Contraseña incorrecta. Prueba de nuevo");
                return done(error, null);
            }

            existingConsultant.password = null;
            return done(null, existingConsultant);

        } catch (error) {
            return done(error, null);
        }
    },
);

module.exports = loginStrategy;