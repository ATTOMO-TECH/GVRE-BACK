const puppeteer = require("puppeteer");
const hbs = require("handlebars");
const fs = require("fs-extra");
const path = require("path");
const QRCode = require("qrcode");
const { formattedNumber, getPropertyUrl } = require("../utils/utils");

const fontLightPath = path.join(
  process.cwd(),
  "src",
  "public",
  "fonts",
  "Teodor-Light.woff2",
);
const fontRegularPath = path.join(
  process.cwd(),
  "src",
  "public",
  "fonts",
  "Teodor-Regular.woff2",
);

const teodorLightBase64 = fs.readFileSync(fontLightPath, {
  encoding: "base64",
});
const teodorRegularBase64 = fs.readFileSync(fontRegularPath, {
  encoding: "base64",
});

const teodorLightURI = `data:font/woff2;charset=utf-8;base64,${teodorLightBase64}`;
const teodorRegularURI = `data:font/woff2;charset=utf-8;base64,${teodorRegularBase64}`;

const fullIconMapping = {
  airConditioning: {
    label: "Aire Acondicionado",
    icon: "Aire_Acondicionado.svg",
  },
  centralHeating: {
    label: "Calefacción Central",
    icon: "Calefaccion_Central.svg",
  },
  individualHeating: {
    label: "Calefacción Individual",
    icon: "Calefaccion_individual.svg",
  },
  subfloorHeating: { label: "Suelo Radiante", icon: "Suelo_radiante.svg" },
  lift: { label: "Ascensor", icon: "Ascensor.svg" },
  dumbwaiter: { label: "Montaplatos", icon: "Montaplatos.svg" },
  liftTruck: { label: "Montacargas", icon: "Montacargas.svg" },
  falseCeiling: { label: "Falso Techo", icon: "Falso_techo.svg" },
  raisedFloor: { label: "Suelo Técnico", icon: "Suelo_tecnico.svg" },
  freeHeight: { label: "Altura Libre > 2.5m", icon: "Altura_Libre.svg" },
  smokeOutlet: { label: "Salida de Humos", icon: "Salida_de_humos.svg" },
  // Seguridad
  concierge: {
    label: "Servicio de Portería",
    icon: "Servicio_de_porteria.svg",
  },
  fullHoursSecurity: { label: "Seguridad 24h", icon: "Seguridad_24h.svg" },
  indoorAlarm: { label: "Alarma Interior", icon: "Alarma_interior.svg" },
  outdoorAlarm: {
    label: "Alarma Perimetral",
    icon: "Alarma_Perimetral.svg",
  },
  accessControl: {
    label: "Control de Accesos",
    icon: "Control_de_accesos.svg",
  },
  strongBox: { label: "Caja Fuerte", icon: "Caja_fuerte.svg" },
  panicRoom: { label: "Panic Room", icon: "Panic_room.svg" },
  gunRack: { label: "Armero", icon: "Armero.svg" },
  // Exterior / Ocio
  swimmingPool: { label: "Piscina", icon: "Piscina.svg" },
  indoorPoolCheck: {
    label: "Piscina Interior",
    icon: "Piscina_Interior.svg",
  },
  outdoorPoolCheck: { label: "Piscina Exterior", icon: "Piscina.svg" },
  outdoorPoolClimatized: {
    label: "Piscina Climatizada",
    icon: "Piscina.svg",
  },
  padelCourt: { label: "Pista de Pádel", icon: "Pista_de_Padel.svg" },
  tennisCourt: { label: "Pista de Tenis", icon: "Pista_de_tenis.svg" },
  gym: { label: "Gimnasio", icon: "Gimnasio.svg" },
  spa: { label: "Spa", icon: "Spa.svg" },
  privateGarden: { label: "Jardín Privado", icon: "Jardin_privado.svg" },
  terrace: { label: "Terraza", icon: "Terraza.svg" },
  solarium: { label: "Solarium", icon: "Solarium.svg" },
  porch: { label: "Porche", icon: "Porche.svg" },
  fireplace: { label: "Chimenea", icon: "Fireplace.svg" },
  firePlace: { label: "Chimenea", icon: "Fireplace.svg" },
  // Interior / Estancias
  wineCellar: { label: "Bodega", icon: "Bodega.svg" },
  movieTheater: { label: "Sala de Cine", icon: "Sala_de_cine.svg" },
  laundry: { label: "Lavandería", icon: "Lavanderia.svg" },
  storage: { label: "Trastero", icon: "Trastero.svg" },
  garage: { label: "Garaje", icon: "Garaje.svg" },
  qualityBathrooms: { label: "Baños de Calidad", icon: "Banho.svg" },
  showKitchen: { label: "Show Kitchen", icon: "Showkitchen.svg" },
  dirtyKitchen: { label: "Dirty Kitchen", icon: "Dirty_kitchen.svg" },
  outdoorKitchen: { label: "Cocina Exterior", icon: "Cocina_exterior.svg" },
  // Otros / Estado
  implanted: { label: "Implantada", icon: "Implantada.svg" },
  furnished: { label: "Amueblada", icon: "Amueblada.svg" },
  separateEntrance: {
    label: "Entrada Indep.",
    icon: "Entrada_independiente.svg",
  },
  accessiblePMR: { label: "Accesible PMR", icon: "Accesible_PMR.svg" },
  goodConservation: {
    label: "Buena Conservación",
    icon: "Buena_conservacion.svg",
  },
  newConstruction: { label: "Obra Nueva", icon: "Obra_nueva.svg" },
  brandedDesign: { label: "Branded Design", icon: "Branded_Design.svg" },
  coworking: { label: "Coworking", icon: "Coworking.svg" },
  exclusiveOfficeBuilding: {
    label: "Edificio Exclusivo",
    icon: "Edificio_exclusivo_de_oficinas.svg",
  },
  mixedBuilding: { label: "Edificio Mixto", icon: "Edificio_mixto.svg" },
  classicBuilding: {
    label: "Edificio Clásico",
    icon: "Edificio_clasico.svg",
  },
  gatedCommunity: {
    label: "Urb. Cerrada",
    icon: "Urbanizacion_cerrada.svg",
  },
  // Rústico / Vistas
  agricultural: { label: "Agrícola", icon: "Agricola.svg" },
  hunting: { label: "Cinegética", icon: "Cinegetica.svg" },
  forestry: { label: "Forestal", icon: "Forestal.svg" },
  livestock: { label: "Ganadera", icon: "Ganadera.svg" },
  secondaryHousing: {
    label: "Vivienda Secundaria",
    icon: "Viviendas_secundaria.svg",
  },
  equestrianFacilities: {
    label: "Inst. Hípicas",
    icon: "Instalaciones_hipicas.svg",
  },
  seaViews: { label: "Vistas al Mar", icon: "Vistas_al_mar.svg" },
  golfCourseView: { label: "Vistas Golf", icon: "Campo_de_golf.svg" },
  mountainView: { label: "Vistas Montaña", icon: "Montanha.svg" },
  panoramicView: { label: "Vistas Panorámicas", icon: "Panoramica.svg" },
};

const generateResidencialPDF = async (ad) => {
  let browser;
  try {
    const frontendUrl = process.env.FRONTEND_URL;

    // Generación del QR
    const qrCodeData = await QRCode.toDataURL(
      `${process.env.FRONTEND_URL}${getPropertyUrl(ad)}`,
      {
        margin: 1,
        color: { dark: "#2b363d", light: "#f8f7f7" },
      },
    );

    const activeAttributes = [];

    // 1. Atributos de nivel superior en quality
    if (ad.quality?.reformed)
      activeAttributes.push({ label: "Reformado", icon: "Reformado.svg" });
    if (ad.quality?.toReform)
      activeAttributes.push({ label: "A reformar", icon: "A_reformar.svg" });

    // 2. Recorrer el objeto quality.others
    if (ad.quality?.others) {
      for (const [key, value] of Object.entries(ad.quality.others)) {
        if (value === true && fullIconMapping[key]) {
          activeAttributes.push({
            label: fullIconMapping[key].label,
            icon: fullIconMapping[key].icon,
          });
        }
      }
    }

    // Lógica de Precios
    const prices = [];
    if (
      ad.sale?.saleShowOnWeb &&
      ad.sale?.saleValue &&
      ad.adType?.includes("Venta")
    ) {
      prices.push({
        label: "VENTA",
        value: formattedNumber(ad.sale.saleValue, "", "currency"),
        value2:
          ad.sale?.saleRepercussionM2ShowOnWeb &&
          ad.sale?.saleRepercussionM2 &&
          ad.sale.saleRepercussionM2 !== "true"
            ? `${formattedNumber(ad.sale.saleRepercussionM2, "", "currency")}/m²`
            : null,
      });
    }
    if (
      ad.rent?.rentShowOnWeb &&
      ad.rent?.rentValue &&
      ad.adType?.includes("Alquiler")
    ) {
      prices.push({
        label: "ALQUILER",
        value: `${formattedNumber(ad.rent.rentValue, "", "currency")}/MES`,
      });
    }

    const dataForTemplate = {
      frontendUrl,
      teodorLight: teodorLightURI, // Pasamos la fuente en Base64
      teodorRegular: teodorRegularURI,
      title: ad.title,
      reference: ad.adReference,
      city: `${ad.zone[0].name}, ${ad.adDirection?.city}` || "MADRID",
      prices,
      buildSurface: ad.buildSurface
        ? formattedNumber(ad.buildSurface, "", "decimal")
        : "",
      plotSurface: ad?.plotSurface
        ? formattedNumber(ad.plotSurface, "", "decimal")
        : "",
      m2Terrace: ad?.m2Terrace
        ? formattedNumber(ad.m2Terrace, "", "decimal")
        : "",
      description: ad.description?.emailPDF || "Sin descripción disponible.",
      distribution:
        ad.description?.distribution || "Sin distribución disponible.",
      mainImage: ad.images?.main,
      rooms: ad.quality?.bedrooms,
      bathrooms: ad.quality?.bathrooms,
      parking: ad.quality?.parking,
      pool: (ad.quality?.indoorPool || 0) + (ad.quality?.outdoorPool || 0),
      attributes: activeAttributes.slice(0, 22),
      qrCode: qrCodeData,
      adUrl: `${process.env.FRONTEND_URL}${getPropertyUrl(ad)}`,
      agent: {
        name: ad.consultant?.fullName || "EQUIPO GV",
        email: ad.consultant?.consultantEmail,
        phone:
          ad.consultant?.consultantMobileNumber ||
          ad.consultant?.consultantPhoneNumber,
        photo: ad.consultant?.avatar || `${frontendUrl}/default-avatar.png`,
        office: ad.consultant?.office1,
      },
    };

    const templatePath = path.join(
      process.cwd(),
      "src",
      "pdf-templates",
      "residencial.hbs",
    );
    const html = await fs.readFile(templatePath, "utf-8");
    const content = hbs.compile(html)(dataForTemplate);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(content, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
};

const generatePatrimonioPDF = async (ad) => {
  let browser;
  try {
    const frontendUrl = process.env.FRONTEND_URL;

    // Generación del QR
    const qrCodeData = await QRCode.toDataURL(
      `${process.env.FRONTEND_URL}${getPropertyUrl(ad)}`,
      { margin: 1, color: { dark: "#2b363d", light: "#f8f7f7" } },
    );

    let activeAttributes = [];
    if (ad.quality?.reformed)
      activeAttributes.push({ label: "Reformado", icon: "Reformado.svg" });
    if (ad.quality?.toReform)
      activeAttributes.push({ label: "A reformar", icon: "A_reformar.svg" });

    if (ad.quality?.others) {
      for (const [key, value] of Object.entries(ad.quality.others)) {
        if (value === true && fullIconMapping[key]) {
          activeAttributes.push({
            label: fullIconMapping[key].label,
            icon: fullIconMapping[key].icon,
          });
        }
      }
    }
    activeAttributes = activeAttributes.slice(0, 26);

    // Lógica de Precios
    const prices = [];
    if (
      ad.sale?.saleShowOnWeb &&
      ad.sale?.saleValue &&
      ad.adType?.includes("Venta")
    ) {
      prices.push({
        label: "VENTA",
        value: formattedNumber(ad.sale.saleValue, "", "currency"),
        value2:
          ad.sale?.saleRepercussionM2ShowOnWeb &&
          ad.sale?.saleRepercussionM2 &&
          ad.sale.saleRepercussionM2 !== "true"
            ? `${formattedNumber(ad.sale.saleRepercussionM2, "", "currency")}/m²`
            : null,
      });
    }
    if (
      ad.rent?.rentShowOnWeb &&
      ad.rent?.rentValue &&
      ad.adType?.includes("Alquiler")
    ) {
      prices.push({
        label: "ALQUILER",
        value: `${formattedNumber(ad.rent.rentValue, "", "currency")}/MES`,
        value2: ad?.monthlyRent
          ? `${formattedNumber(ad?.monthlyRent, "", "currency")}/m²/MES`
          : null,
      });
    }

    if (ad?.expensesIncluded) {
      prices.push({
        label: "ALQUILER CON GASTOS INC.",
        value: `${formattedNumber(ad?.expensesIncluded, "", "currency")}/MES`,
        value2: ad?.expenses
          ? `${formattedNumber(ad?.expenses, "", "currency")}/m²/MES`
          : null,
      });
    }

    // --- LÓGICA ESPECÍFICA DE PATRIMONIO ---

    // Preparar Tabla de Superficies
    const surfacesList = (ad.surfacesBox || []).map((row) => ({
      floor: row.surfaceFloor || "-",
      use: row.surfaceUse || "-",
      meters: row.metersAvailables
        ? `${formattedNumber(row.metersAvailables, "", "decimal")} m²`
        : "-",
      price: row.metersPrice
        ? `${formattedNumber(row.metersPrice, "", "decimal")} €/m²/mes`
        : "-",
      disponibility: row.surfaceDisponibility || "-",
    }));

    // Rentabilidad (si la hay)
    const profitabilityLabel =
      ad.profitability && ad.profitabilityValue
        ? `${formattedNumber(ad.profitabilityValue, "", "decimal")}%`
        : null;

    const communityExpenses =
      ad.communityExpenses?.expensesShowOnWeb &&
      ad.communityExpenses?.expensesValue
        ? `${formattedNumber(ad.communityExpenses.expensesValue, "", "decimal")} €`
        : null;
    const ibi =
      ad.ibi?.ibiShowOnWeb && ad.ibi?.ibiValue
        ? `${formattedNumber(ad.ibi.ibiValue, "", "decimal")} €`
        : null;
    const trashFee =
      ad.trashFee?.trashFeeShowOnWeb && ad.trashFee?.trashFeeValue
        ? `${formattedNumber(ad.trashFee.trashFeeValue, "", "decimal")} €`
        : null;

    const dataForTemplate = {
      frontendUrl,
      teodorLight: teodorLightURI, // Pasamos la fuente en Base64
      teodorRegular: teodorRegularURI,
      title: ad.title,
      reference: ad.adReference,
      city: `${ad.zone[0].name}, ${ad.adDirection?.city}` || "MADRID",
      prices,
      profitabilityLabel,
      buildSurface: ad.buildSurface
        ? formattedNumber(ad.buildSurface, "", "decimal")
        : "",
      plotSurface: ad?.plotSurface
        ? formattedNumber(ad.plotSurface, "", "decimal")
        : "",
      m2Terrace: ad?.m2Terrace
        ? formattedNumber(ad.m2Terrace, "", "decimal")
        : "",
      description: ad.description?.emailPDF || ad.description?.web,
      surfaces: surfacesList,
      mainImage: ad.images?.main,

      // --- ICONOS DE DETALLES ---
      rooms: ad.quality?.bedrooms,
      bathrooms: ad.quality?.bathrooms,
      parking: ad.quality?.parking,
      jobPositions: ad.quality?.jobPositions,
      subway: ad.quality?.subway,
      bus: ad.quality?.bus,

      // --- LISTADO DE DETALLES TABULAR ---
      profitabilityValue:
        ad.profitability && ad.profitabilityValue
          ? `${formattedNumber(ad.profitabilityValue, "", "decimal")}%`
          : null,
      floor: ad.floor,
      disponibility: ad.disponibility,
      hasFloorOrDisp: !!(ad.floor || ad.disponibility),
      communityExpenses,
      ibi,
      trashFee,
      hasExpenses: !!(communityExpenses || ibi || trashFee),

      attributes: activeAttributes,
      qrCode: qrCodeData,
      adUrl: `${process.env.FRONTEND_URL}${getPropertyUrl(ad)}`,
      agent: {
        name: ad.consultant?.fullName || "EQUIPO GV",
        email: ad.consultant?.consultantEmail,
        phone:
          ad.consultant?.consultantMobileNumber ||
          ad.consultant?.consultantPhoneNumber,
        photo: ad.consultant?.avatar || `${frontendUrl}/default-avatar.png`,
        office: ad.consultant?.office1 || "LAGASCA 36 | MADRID",
      },
    };

    const templatePath = path.join(
      process.cwd(),
      "src",
      "pdf-templates",
      "patrimonio.hbs",
    );
    const html = await fs.readFile(templatePath, "utf-8");
    const content = hbs.compile(html)(dataForTemplate);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(content, { waitUntil: "networkidle0" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generateResidencialPDF, generatePatrimonioPDF };
