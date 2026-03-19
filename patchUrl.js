require("dotenv").config();
const mongoose = require("mongoose");

// --- IMPORTA TUS MODELOS ---
const Ad = require("./src/models/ad.model");
const Blog = require("./src/models/blog.model");
const Catalog = require("./src/models/catalog.model");
const CatalogsPage = require("./src/models/catalogPage.model");
const Consultant = require("./src/models/consultant.model");
const MarketingCampaign = require("./src/models/marketingCampaing.model");
const WebHome = require("./src/models/webHome.model");

// --- LA MISMA CONFIGURACIÓN ---
const migrationConfig = [
  {
    model: Ad,
    name: "Ads",
    fields: [
      { path: "images.main", type: "string" },
      { path: "images.blueprint", type: "array" },
      { path: "images.others", type: "array" },
    ],
  },
  {
    model: Blog,
    name: "Blogs",
    fields: [
      { path: "image", type: "string" },
      { path: "content", type: "text" },
    ],
  },
  {
    model: Catalog,
    name: "Catalogs",
    fields: [
      { path: "imgSection", type: "string" },
      { path: "portraidImage", type: "string" },
      { path: "catalog", type: "string" },
    ],
  },
  {
    model: CatalogsPage,
    name: "CatalogsPage",
    fields: [{ path: "imgSection", type: "string" }],
  },
  {
    model: WebHome,
    name: "WebHome",
    fields: [
      { path: "portraidImage", type: "string" },
      { path: "talkWithUs.contactImage", type: "string" },
      { path: "categoriesImages.residential", type: "string" },
      { path: "categoriesImages.patrimonial", type: "string" },
      { path: "categoriesImages.art", type: "string" },
      { path: "categoriesImages.catalog", type: "string" },
      { path: "otherCategoriesImages.coast", type: "string" },
      { path: "otherCategoriesImages.rustic", type: "string" },
      { path: "otherCategoriesImages.singular", type: "string" },
      { path: "sections.interiorims.image", type: "string" },
      { path: "sections.sell.image", type: "string" },
      { path: "sections.offices.image", type: "string" },
      { path: "services.development.image", type: "string" },
      { path: "services.interiorims.image", type: "string" },
    ],
  },
  {
    model: Consultant,
    name: "Consultants",
    fields: [
      { path: "avatar", type: "string" },
      { path: "companyUnitLogo", type: "string" },
      { path: "consultantEmailSignZones.high.zone1.image", type: "string" },
      { path: "consultantEmailSignZones.high.zone2.image", type: "string" },
      { path: "consultantEmailSignZones.high.zone3.image", type: "string" },
      { path: "consultantEmailSignZones.medium.zone4.image", type: "string" },
      { path: "consultantEmailSignZones.medium.zone5.image", type: "string" },
      { path: "consultantEmailSignZones.medium.zone6.image", type: "string" },
      { path: "consultantEmailSignZones.low.zone7.image", type: "string" },
      { path: "consultantEmailSignZones.low.zone8.image", type: "string" },
      { path: "consultantEmailSignZones.low.zone9.image", type: "string" },
    ],
  },
  {
    model: MarketingCampaign,
    name: "Marketing Campaigns",
    fields: [
      { path: "htmlBody", type: "text" },
      { path: "design", type: "json" },
    ],
  },
];

// --- FUNCIONES PARCHEADORAS ---

// Arregla Strings sueltos
const fixUrl = (val) => {
  if (
    typeof val === "string" &&
    (val.startsWith("fra1.") || val.startsWith("gvre-new-bucket"))
  ) {
    return `https://${val}`;
  }
  return val;
};

// Arregla textos largos (HTML/JSON) usando Regex (Negative Lookbehind)
const fixTextContent = (text) => {
  if (typeof text !== "string") return text;
  // Busca cualquier "fra1.digitaloceanspaces..." o "gvre-new-bucket..." que NO tenga https:// delante y se lo pone
  let newText = text.replace(
    /(?<!https:\/\/)(fra1\.digitaloceanspaces\.com|gvre-new-bucket\.fra1\.digitaloceanspaces\.com)/g,
    "https://$1",
  );
  return newText;
};

// --- LÓGICA PRINCIPAL ---
const runPatch = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    for (const config of migrationConfig) {
      console.log(`\n======================================`);
      console.log(`🛠️ PARCHEANDO COLECCIÓN: ${config.name}`);
      console.log(`======================================`);

      const cursor = config.model.find({}).cursor();

      for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
      ) {
        let hasChanges = false;

        for (const field of config.fields) {
          const val = doc.get(field.path);
          if (!val) continue;

          // 1. Strings
          if (field.type === "string" && typeof val === "string") {
            const newVal = fixUrl(val);
            if (newVal !== val) {
              doc.set(field.path, newVal);
              hasChanges = true;
            }
          }

          // 2. Arrays
          else if (field.type === "array" && Array.isArray(val)) {
            const newArray = val.map((item) => fixUrl(item));
            if (JSON.stringify(newArray) !== JSON.stringify(val)) {
              doc.set(field.path, newArray);
              hasChanges = true;
            }
          }

          // 3. Textos (HTML)
          else if (field.type === "text" && typeof val === "string") {
            const newText = fixTextContent(val);
            if (newText !== val) {
              doc.set(field.path, newText);
              hasChanges = true;
            }
          }

          // 4. JSON
          else if (field.type === "json" && typeof val === "object") {
            const jsonString = JSON.stringify(val);
            const newJsonString = fixTextContent(jsonString);
            if (newJsonString !== jsonString) {
              doc.set(field.path, JSON.parse(newJsonString));
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          for (const field of config.fields) {
            doc.markModified(field.path.split(".")[0]);
          }
          await doc.save();
          console.log(`💾 Parcheado ID: ${doc._id}`);
        }
      }
    }

    console.log("\n🎉 ¡TODAS LAS URLS HAN SIDO ARREGLADAS CON HTTPS://!");
    process.exit(0);
  } catch (error) {
    console.error("Fallo al parchear:", error);
    process.exit(1);
  }
};

runPatch();
