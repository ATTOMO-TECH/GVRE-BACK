const puppeteer = require("puppeteer");
const { TimeoutError } = puppeteer;
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

// ---------------------------------------------------------------------------
// Navegador compartido
// ---------------------------------------------------------------------------
// Cada `puppeteer.launch` levanta ~9 procesos y más de 100 hilos de Chrome y
// deja además 1-2 procesos `chrome_crashpad_handler` huérfanos (Chrome los
// arranca con doble fork, su padre pasa a ser el PID 1). Si el contenedor no
// tiene un init que los recoja, quedan como zombis para siempre y cuentan para
// el límite de procesos. Lanzar un Chrome por descarga agotaba ese límite
// ("posix_spawn ... Resource temporarily unavailable"), así que se lanza UNA
// sola instancia para toda la vida del proceso (relanzándola solo si se cae) y
// se limita cuántas fichas se renderizan a la vez.

const LAUNCH_OPTIONS = {
  headless: true,
  // Con pipe, Chrome muere solo si el proceso de Node desaparece.
  pipe: true,
  // Ojo: no añadir "--disable-gpu", hace que networkidle0 nunca se resuelva.
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  protocolTimeout: 60_000,
  // Las señales se gestionan abajo para cerrar Chrome y terminar el proceso.
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false,
};
const MAX_CONCURRENT_RENDERS = 2;
const MAX_QUEUED_RENDERS = 20;
const RENDER_TIMEOUT_MS = 30_000;
const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
};

// Resumen de la tabla de procesos del contenedor (solo Linux, vía /proc) para
// que los logs digan si se están acumulando zombis o hilos.
const describeProcessTable = () => {
  try {
    const pids = fs.readdirSync("/proc").filter((name) => /^\d+$/.test(name));
    let threads = 0;
    let zombies = 0;
    for (const pid of pids) {
      try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
        // Campos tras el nombre del proceso: estado (1º) y nº de hilos (18º).
        const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        if (fields[0] === "Z") zombies++;
        threads += Number(fields[17]) || 0;
      } catch {
        // el proceso terminó entre el listado y la lectura
      }
    }
    return `procesos=${pids.length} hilos=${threads} zombis=${zombies}`;
  } catch {
    return "sin datos de /proc";
  }
};

if (process.pid === 1) {
  console.warn(
    "PDF: Node se ejecuta como PID 1; los procesos huérfanos de Chrome no se recogerán. Conviene arrancar el contenedor con dumb-init o tini.",
  );
}

let browserPromise = null;

const launchBrowser = () => {
  const launching = puppeteer.launch(LAUNCH_OPTIONS);
  browserPromise = launching;
  launching
    .then((browser) => {
      console.log(
        `PDF: Chrome lanzado (pid ${browser.process()?.pid}). Contenedor: ${describeProcessTable()}`,
      );
      browser.once("disconnected", () => {
        // closeBrowser() vacía browserPromise antes de cerrar: si todavía
        // apunta aquí, la desconexión no ha sido intencionada.
        if (browserPromise !== launching) return;
        browserPromise = null;
        console.warn(
          "PDF: Chrome se ha cerrado inesperadamente, se relanzará en la próxima petición",
        );
      });
    })
    .catch(() => {
      if (browserPromise === launching) browserPromise = null;
      console.error(
        `PDF: no se pudo lanzar Chrome. Contenedor: ${describeProcessTable()}`,
      );
    });
  return launching;
};

const getBrowser = async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = browserPromise || launchBrowser();
    const browser = await current; // propaga el error si el launch falla
    if (browser.connected) return browser;
    if (browserPromise === current) browserPromise = null;
  }
  throw new Error("No se pudo obtener un navegador conectado");
};

const isBrowserAlive = async () => {
  if (!browserPromise) return false;
  const browser = await browserPromise.catch(() => null);
  return Boolean(browser && browser.connected);
};

const closeBrowser = async () => {
  const current = browserPromise;
  browserPromise = null;
  if (!current) return;
  const browser = await current.catch(() => null);
  if (browser) await browser.close().catch(() => {});
};

// Semáforo sencillo: pocas pestañas a la vez y una cola acotada, para que una
// avalancha de descargas no tire el servicio.
let activeRenders = 0;
const waitingRenders = [];

const acquireRenderSlot = () =>
  new Promise((resolve, reject) => {
    if (activeRenders < MAX_CONCURRENT_RENDERS) {
      activeRenders++;
      resolve();
    } else if (waitingRenders.length >= MAX_QUEUED_RENDERS) {
      const error = new Error(
        "Demasiadas descargas de fichas en curso, inténtalo de nuevo en unos segundos",
      );
      error.statusCode = 503;
      reject(error);
    } else {
      waitingRenders.push(resolve);
    }
  });

const releaseRenderSlot = () => {
  const next = waitingRenders.shift();
  if (next) next(); // el hueco pasa directamente al siguiente en cola
  else activeRenders--;
};

const renderOnce = async (html) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    try {
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: RENDER_TIMEOUT_MS,
      });
    } catch (error) {
      if (!(error instanceof TimeoutError)) throw error;
      // Algún recurso externo (imagen, avatar, iconos) no respondió a tiempo:
      // se genera la ficha con lo que haya cargado en vez de devolver un error.
      console.warn(
        "PDF: tiempo de espera agotado cargando recursos externos, se genera igualmente",
      );
    }
    const pdf = await page.pdf(PDF_OPTIONS);
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
};

const renderPdf = async (html) => {
  await acquireRenderSlot();
  try {
    try {
      return await renderOnce(html);
    } catch (error) {
      // Si Chrome se cayó a mitad del renderizado, se relanza y se reintenta una vez.
      if (await isBrowserAlive()) throw error;
      console.warn("PDF: Chrome no está disponible, se relanza y se reintenta");
      return await renderOnce(html);
    }
  } finally {
    releaseRenderSlot();
  }
};

// Cerrar Chrome al parar el proceso para no dejar procesos huérfanos
// (reinicios de PM2, redeploys, nodemon en desarrollo).
const closeBrowserWithTimeout = () =>
  Promise.race([
    closeBrowser(),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

const shutdown = async (exitCode) => {
  await closeBrowserWithTimeout();
  process.exit(exitCode);
};
process.once("SIGINT", () => shutdown(130));
process.once("SIGTERM", () => shutdown(0));
process.once("SIGHUP", () => shutdown(0));
process.once("SIGUSR2", async () => {
  // nodemon reinicia con SIGUSR2 y espera a que el proceso se lo reenvíe.
  await closeBrowserWithTimeout();
  process.kill(process.pid, "SIGUSR2");
});

const generateResidencialPDF = async (ad) => {
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
    city:
      [ad.zone?.[0]?.name, ad.adDirection?.city].filter(Boolean).join(", ") ||
      "MADRID",
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

  return renderPdf(content);
};

const generatePatrimonioPDF = async (ad) => {
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
    meters: row.metersAvailables ? row.metersAvailables : "-",
    price: row.metersPrice ? row.metersPrice : "-",
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
    city:
      [ad.zone?.[0]?.name, ad.adDirection?.city].filter(Boolean).join(", ") ||
      "MADRID",
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

  return renderPdf(content);
};

module.exports = { generateResidencialPDF, generatePatrimonioPDF };
