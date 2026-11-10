// Forma en la que se guarda la traducción de un campo:
//
//   translations.<idioma>.<ruta del campo> = {
//     value,        // el texto traducido (o la lista, alineada con el español)
//     status,       // quién la escribió: una persona o el traductor automático
//     sourceHash,   // huella del español en el momento de traducir
//     updatedAt,
//   }

const TRANSLATION_STATUS = Object.freeze({
  // Escrita o revisada por una persona. La traducción automática no la pisa.
  MANUAL: "manual",
  // Generada por el proveedor de traducción automática.
  AUTO: "auto",
});

const TRANSLATIONS_KEY = "translations";

const buildTranslationPath = (lang, fieldPath) =>
  `${TRANSLATIONS_KEY}.${lang}.${fieldPath}`;

const buildTranslationEntry = ({ value, status, sourceHash, updatedAt }) => ({
  value,
  status,
  sourceHash,
  updatedAt,
});

module.exports = {
  TRANSLATION_STATUS,
  TRANSLATIONS_KEY,
  buildTranslationPath,
  buildTranslationEntry,
};
