// Textos del anuncio que lleva la ficha PDF, en el idioma pedido.
//
// Módulo aparte de `pdfGenerator` a propósito: no depende de Puppeteer ni de
// las plantillas, así que se puede probar de forma aislada.

const {
  ENTITIES,
  isTranslationLang,
  localizeDocument,
} = require("../i18n");

const toPlain = (ad) => (typeof ad?.toObject === "function" ? ad.toObject() : ad);

const normalize = (text) =>
  typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

const isSameText = (a, b) => normalize(a) !== "" && normalize(a) === normalize(b);

// Descripción principal del PDF (campo «Descripción email / PDF» del CRM).
//
// En muchos anuncios ese texto es una copia de la «Descripción web». Para no
// obligar a traducir dos veces lo mismo, si la descripción del PDF no tiene
// traducción propia y en español coincide con la de la web, se usa la
// traducción de la web.
const resolvePdfDescription = (source, localized, lang) => {
  const spanish = source.description?.emailPDF;
  if (!isTranslationLang(lang)) return spanish;

  const translated = localized.description?.emailPDF;
  if (translated !== spanish) return translated;

  return isSameText(spanish, source.description?.web)
    ? localized.description?.web
    : spanish;
};

const getAdPdfTexts = (ad, lang) => {
  const source = toPlain(ad);
  const localized = localizeDocument(ENTITIES.AD, source, lang);

  return {
    title: localized.title,
    pdfDescription: resolvePdfDescription(source, localized, lang),
    webDescription: localized.description?.web,
    distribution: localized.description?.distribution,
    floor: localized.floor,
    disponibility: localized.disponibility,
    surfacesBox: localized.surfacesBox || [],
    // Prefijo de la web en ese idioma, para el enlace y el QR de la ficha
    urlPrefix: isTranslationLang(lang) ? `/${lang}` : "",
  };
};

module.exports = { getAdPdfTexts };
