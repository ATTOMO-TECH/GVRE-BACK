const getDate = () => {
  let today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1;

  let yyyy = today.getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  today = dd + "/" + mm + "/" + yyyy;
  return today;
};

function orderAdsDescendentBySalePrice(a, b) {
  return b.sale.saleValue - a.sale.saleValue;
}

function orderAdsAscendentBySalePrice(a, b) {
  return a.sale.saleValue - b.sale.saleValue;
}

function orderAdsDescendentByRentPrice(a, b) {
  return b.rent.rentValue - a.rent.rentValue;
}

function orderAdsAscendentByRentPrice(a, b) {
  return a.rent.rentValue - b.rent.rentValue;
}

function getPasswordByEmail(email) {
  switch (email) {
    case "mateo@attomo.digital":
      return process.env.GVRE_PASS_MATEO_HERNANDEZ;
    case "ivan@attomo.digital":
      return process.env.GVRE_PASS_IVAN_SANCHEZ;
    case "info@gvre.es":
      return process.env.GVRE_PASS_INFO_GVRE;
    case "inigo@attomo.digital":
      return process.env.GVRE_PASS_INIGO_FOLDVARY;
    case "retail@gvre.es":
      return process.env.GVRE_PASS_RETAIL;
    case "d.salcedo@gvre.es":
      return process.env.GVRE_PASS_DAVID_SALCEDO;
    case "d.ortega@gvre.es":
      return process.env.GVRE_PASS_DAVID_ORTEGA;
    case "c.mahiques@gvre.es":
      return process.env.GVRE_PASS_CARI_MAHIQUES;
    case "n.salcedo@gvre.es":
      return process.env.GVRE_PASS_NURIA_SALCEDO;
    case "i.blasco@gvre.es":
      return process.env.GVRE_PASS_IRENE_BLASCO;
    case "t.rdelaprada@gvre.es":
      return process.env.GVRE_PASS_TERESA_RUIZ;
    case "m.gfaina@gvre.es":
      return process.env.GVRE_PASS_MARTA_GOMEZ_FAIÑA;
    case "b.msagasta@gvre.es":
      return process.env.GVRE_PASS_BEATRIZ_MATEO_SAGASTA;
    case "m.aragon@gvre.es":
      return process.env.GVRE_PASS_MONTSE_ARAGON;
    case "a.gesche@gvre.es":
      return process.env.GVRE_PASS_ALEJANDRA_GESCHE;
    case "a.gdelaserna@gvre.es":
      return process.env.GVRE_PASS_ANA_GOMEZ_DE_LA_SERNA;
    case "m.mdelaplata@gvre.es":
      return process.env.GVRE_PASS_MARIA_MARQUEZ_DE_LA_PLATA;
    case "a.esain@gvre.es":
      return process.env.GVRE_PASS_ALEJANDRO_ESAIN;
    case "a.bareno@gvre.es":
      return process.env.GVRE_PASS_ANA_MARIA_BARENO;
    case "l.szuloaga@gvre.es":
      return process.env.GVRE_PASS_LUCIA_SUAREZ_ZULOAGA;
    case "l.monreal@gvre.es":
      return process.env.GVRE_PASS_LETICIA_MONREAL;
    case "fotografia@gvre.es":
      return process.env.GVRE_PASS_VICTORIA_MIÑANA;
    case "t.urries@gvre.es":
      return process.env.GVRE_PASS_TULA_JORDAN_DE_URRIES;
    case "t.bareno@gvre.es":
      return process.env.GVRE_PASS_TERESA_BAREÑO;
    case "i.coca@gvre.es":
      return process.env.GVRE_PASS_INES_COCA;
    case "s.fierros@gvre.es":
      return process.env.GVRE_PASS_SOFIA_FIERROS;
    case "n.serra@gvre.es":
      return process.env.GVRE_PASS_NURIA_SERRA;
    case "o.paya@gvre.es":
      return process.env.GVRE_PASS_OLGA_PAYA;
    case "c.mora@gvre.es":
      return process.env.GVRE_PASS_CARLA_MORA;
    case "a.lopez@gvre.es":
      return process.env.GVRE_PASS_ALEJANDRA_LOPEZ;
    case "i.martin@gvre.es":
      return process.env.GVRE_PASS_INES_MARTIN;
  }
}

function normalizeAdHistory(ad) {
  const createdAt = ad && ad.createdAt ? new Date(ad.createdAt) : new Date();
  const rawHistory = Array.isArray(ad && ad.changesHistory)
    ? [...ad.changesHistory]
    : [];

  const normalized = rawHistory.map((h) => ({
    ...h,
    date: h && h.date ? new Date(h.date) : new Date(),
  }));

  const hasCreation = normalized.some((h) => h && h.type === "CREATION");

  if (!hasCreation) {
    let consultant = null;
    if (ad && ad.consultant) {
      if (typeof ad.consultant === "object") {
        consultant = {
          _id: ad.consultant._id,
          fullName: ad.consultant.fullName || null,
        };
      } else {
        consultant = { _id: ad.consultant, fullName: null };
      }
    }

    normalized.unshift({
      type: "CREATION",
      field: "createdAt",
      oldValue: null,
      newValue: createdAt,
      date: createdAt,
      consultant,
      note: "Synthetic creation entry from createdAt",
    });
  }

  normalized.sort((a, b) => new Date(a.date) - new Date(b.date));
  return normalized;
}

const getTaggedEmail = (email, tag) => {
  if (!email || !tag) return email;
  const [username, domain] = email.split("@");
  // Limpiamos el tag de espacios por si acaso
  const cleanTag = tag.replace(/\s+/g, "").toLowerCase();
  return `${username}+${cleanTag}@${domain}`;
};

const makeDiacriticRegex = (text) => {
  return text
    .normalize("NFD")
    .replace(/a/gi, "[aáàäâ]")
    .replace(/e/gi, "[eéèëê]")
    .replace(/i/gi, "[iíìïî]")
    .replace(/o/gi, "[oóòöô]")
    .replace(/u/gi, "[uúùüû]")
    .replace(/n/gi, "[nñ]");
};

const getPropertyUrl = (ad) => {
  const categoryMap = {
    Residencial: "residencial",
    Costa: "residencial",
    Patrimonio: "patrimonio",
    Otros: "otros-activos-y-zonas",
  };

  const categoryUrl = categoryMap[ad.department] || "residencial";

  const formatSlug = (text) =>
    text
      ? text
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
      : "";

  const citySlug = formatSlug(ad.adDirection?.city || "madrid");

  const zoneSlug = ad.zone && ad.zone.length > 0 ? ad.zone[0].slug : "";

  const zoneSegment = formatSlug(ad.adDirectionSelected || "");

  const op = ad.sale && ad.sale.saleValue > 0 ? "venta" : "alquiler";
  const slug = ad.slug || ad._id;

  let segments = [];

  if (categoryUrl === "otros-activos-y-zonas") {
    segments = [categoryUrl, "inmuebles", zoneSlug, op, slug];
  } else {
    segments = [
      categoryUrl,
      citySlug,
      "inmuebles",
      zoneSlug,
      zoneSegment,
      op,
      slug,
    ];
  }

  return `/${segments.filter(Boolean).join("/")}`;
};

const formattedNumber = (number, period, type) => {
  if (number === undefined || number === null) return "Consultar";

  const isCurrency = type === "currency";

  const options = {
    style: isCurrency ? "currency" : "decimal",
    maximumFractionDigits: 0,
    useGrouping: true,
    ...(isCurrency && { currency: "EUR" }),
  };

  const formatted = new Intl.NumberFormat("es-ES", options).format(number);
  return period && period.trim() !== ""
    ? `${formatted}/${period.toUpperCase()}`
    : formatted;
};

module.exports = {
  getDate,
  getPasswordByEmail,
  orderAdsAscendentBySalePrice,
  orderAdsDescendentBySalePrice,
  orderAdsAscendentByRentPrice,
  orderAdsDescendentByRentPrice,
  normalizeAdHistory,
  getTaggedEmail,
  makeDiacriticRegex,
  getPropertyUrl,
  formattedNumber,
};
