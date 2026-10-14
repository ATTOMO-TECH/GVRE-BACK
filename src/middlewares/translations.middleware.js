const {
  TranslationInputError,
  parseTranslationsInput,
  parseConfirmedInput,
} = require("../i18n");

// Saca del cuerpo las traducciones que envía el CRM, las valida y las deja en
// `req.translationsInput`. Va detrás de multer en las rutas multipart, donde
// llegan como texto JSON.
//
// Los campos se quitan de `req.body` a propósito: varios controladores vuelcan
// el cuerpo entero en el modelo y las traducciones solo deben guardarse a
// través de `planTranslationWrites`, nunca tal cual llegan.
const extractTranslationsInput = (req, res, next) => {
  const body = req.body || {};

  try {
    req.translationsInput = {
      incoming: parseTranslationsInput(body.translations),
      confirmed: parseConfirmedInput(body.translationsConfirmed),
    };
  } catch (error) {
    if (error instanceof TranslationInputError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }

  delete body.translations;
  delete body.translationsConfirmed;

  return next();
};

module.exports = { extractTranslationsInput };
