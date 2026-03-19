require("dotenv").config();
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");

// --- 1. IMPORTA TUS MODELOS ---
const Ad = require("./src/models/ad.model");
const Blog = require("./src/models/blog.model");
const Catalog = require("./src/models/catalog.model");
const CatalogsPage = require("./src/models/catalogPage.model");
const Consultant = require("./src/models/consultant.model");
const MarketingCampaign = require("./src/models/marketingCampaing.model");
const WebHome = require("./src/models/webHome.model");

// --- 2. CONFIGURACIÓN DE URIs ---
const SOURCE_URI =
  "mongodb+srv://doadmin:073GqSW625dF18CV@db-mongodb-gvre-crm-prod-7c95b7da.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=db-mongodb-gvre-crm-prod";
const TARGET_URI =
  "mongodb+srv://doadmin:6jF85D37tnsh01G9@db-mongodb-fra1-08326-c8143b83.mongo.ondigitalocean.com/gvre-crm?tls=true&authSource=admin";

// --- 3. CONFIGURACIÓN DEL PARCHEADOR ---
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

// --- FUNCIONES AYUDANTES ---
const fixUrl = (val) => {
  if (
    typeof val === "string" &&
    (val.startsWith("fra1.") || val.startsWith("gvre-new-bucket"))
  ) {
    return `https://${val}`;
  }
  return val;
};

const fixTextContent = (text) => {
  if (typeof text !== "string") return text;
  return text.replace(
    /(?<!https:\/\/)(fra1\.digitaloceanspaces\.com|gvre-new-bucket\.fra1\.digitaloceanspaces\.com)/g,
    "https://$1",
  );
};

// Helper para leer propiedades anidadas de forma segura
const getNestedValue = (obj, path) => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

// --- LÓGICA PRINCIPAL UNIFICADA Y OPTIMIZADA ---
async function syncAndPatchDatabase() {
  console.log("⏳ Conectando a los clusters...");

  const sourceClient = new MongoClient(SOURCE_URI);
  await sourceClient.connect();
  console.log("✅ Origen conectado (Nativo).");

  await mongoose.connect(TARGET_URI);
  console.log("✅ Destino conectado (Mongoose).");

  const sourceDb = sourceClient.db();
  const targetDb = mongoose.connection.db;

  try {
    // ==============================================================
    // FASE 1: SINCRONIZACIÓN INCREMENTAL OPTIMIZADA
    // ==============================================================
    console.log("\n==================================================");
    console.log("🚀 FASE 1: INICIANDO SINCRONIZACIÓN INCREMENTAL");
    console.log("==================================================");

    const collections = await sourceDb.listCollections().toArray();

    for (let collInfo of collections) {
      if (collInfo.type === "view" || collInfo.name.startsWith("system."))
        continue;

      const collName = collInfo.name;
      const sourceColl = sourceDb.collection(collName);
      const targetColl = targetDb.collection(collName);

      // OPTIMIZACIÓN 1: Obtener solo los IDs que ya existen en destino
      const existingIds = await targetColl.distinct("_id");

      // Consultar el origen pidiendo SOLO los documentos que NO estén en la lista de destino
      const cursor = sourceColl.find({ _id: { $nin: existingIds } });

      let batch = [];
      let newDocsCount = 0;

      for await (const doc of cursor) {
        batch.push(doc);
        if (batch.length === 500) {
          await targetColl.insertMany(batch, { ordered: false });
          newDocsCount += batch.length;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await targetColl.insertMany(batch, { ordered: false });
        newDocsCount += batch.length;
      }

      console.log(
        `📥 [${collName}]: Añadidos ${newDocsCount} documentos nuevos.`,
      );

      // Clonar Índices
      const indexes = await sourceColl.listIndexes().toArray();
      const indexesToCreate = indexes
        .filter((idx) => idx.name !== "_id_")
        .map((idx) => {
          const { ns, v, ...indexSpec } = idx;
          return indexSpec;
        });

      if (indexesToCreate.length > 0) {
        await targetColl.createIndexes(indexesToCreate);
      }
    }
    console.log("✅ FASE 1 COMPLETADA.");

    // ==============================================================
    // FASE 2: PARCHEO DE URLs (LEAN + BULKWRITE)
    // ==============================================================
    console.log("\n==================================================");
    console.log("🛠️ FASE 2: INICIANDO PARCHEO DE URLs (Añadiendo https://)");
    console.log("==================================================");

    for (const config of migrationConfig) {
      console.log(`🔍 Revisando colección: ${config.name}`);

      // OPTIMIZACIÓN 2: Usamos .lean() para saltar la validación y ganar velocidad
      const cursor = config.model.find({}).lean().cursor();

      let bulkOperations = [];
      let patchedCount = 0;

      for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
      ) {
        let updatePayload = {};
        let hasChanges = false;

        for (const field of config.fields) {
          const val = getNestedValue(doc, field.path);
          if (!val) continue;

          // 1. Strings
          if (field.type === "string" && typeof val === "string") {
            const newVal = fixUrl(val);
            if (newVal !== val) {
              updatePayload[field.path] = newVal;
              hasChanges = true;
            }
          }
          // 2. Arrays
          else if (field.type === "array" && Array.isArray(val)) {
            const newArray = val.map((item) => fixUrl(item));
            if (JSON.stringify(newArray) !== JSON.stringify(val)) {
              updatePayload[field.path] = newArray;
              hasChanges = true;
            }
          }
          // 3. Textos (HTML)
          else if (field.type === "text" && typeof val === "string") {
            const newText = fixTextContent(val);
            if (newText !== val) {
              updatePayload[field.path] = newText;
              hasChanges = true;
            }
          }
          // 4. JSON
          else if (field.type === "json" && typeof val === "object") {
            const jsonString = JSON.stringify(val);
            const newJsonString = fixTextContent(jsonString);
            if (newJsonString !== jsonString) {
              updatePayload[field.path] = JSON.parse(newJsonString);
              hasChanges = true;
            }
          }
        }

        // OPTIMIZACIÓN 3: Agrupar operaciones en memoria en vez de usar doc.save()
        if (hasChanges) {
          bulkOperations.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: updatePayload },
            },
          });
        }

        // Ejecutar parche en lotes de 500
        if (bulkOperations.length === 500) {
          await config.model.collection.bulkWrite(bulkOperations, {
            ordered: false,
          });
          patchedCount += bulkOperations.length;
          bulkOperations = [];
        }
      }

      // Ejecutar lote restante
      if (bulkOperations.length > 0) {
        await config.model.collection.bulkWrite(bulkOperations, {
          ordered: false,
        });
        patchedCount += bulkOperations.length;
      }

      if (patchedCount > 0) {
        console.log(
          `   └─ 💾 Se corrigieron URLs en ${patchedCount} documentos.`,
        );
      } else {
        console.log(`   └─ ✅ Todo correcto, no se requirieron cambios.`);
      }
    }
    console.log("✅ FASE 2 COMPLETADA.");

    console.log("\n🎉 ¡PROCESO UNIFICADO FINALIZADO CON ÉXITO!");
  } catch (error) {
    console.error("\n❌ Error durante el proceso unificado:", error);
  } finally {
    await sourceClient.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

syncAndPatchDatabase();
