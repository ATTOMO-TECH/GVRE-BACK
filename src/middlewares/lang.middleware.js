const { DEFAULT_LANG, isSupportedLang } = require("../i18n");

// Lee el idioma pedido (`?lang=` o `lang` en el cuerpo) y lo deja en `req.lang`.
//
//   - Sin parámetro → `req.lang` queda sin definir. Es el modo del CRM y de las
//     llamadas anteriores a las traducciones: se devuelve el documento tal cual.
//   - Con parámetro → modo web pública: los textos salen en ese idioma, con el
//     español como reserva. Un idioma no soportado equivale a pedir español.
const resolveRequestLang = (req, res, next) => {
  const raw = req.query?.lang ?? req.body?.lang;

  if (typeof raw === "string" && raw.trim() !== "") {
    const requested = raw.trim().toLowerCase();
    req.lang = isSupportedLang(requested) ? requested : DEFAULT_LANG;
  }

  return next();
};

module.exports = { resolveRequestLang };
