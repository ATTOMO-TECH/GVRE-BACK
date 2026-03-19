require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const aws = require("aws-sdk");
const axios = require("axios");
const path = require("path");

// --- MODELS TO IMPORT ---
const Ad = require("./src/models/ad.model");
const Blog = require("./src/models/blog.model");
const Catalog = require("./src/models/catalog.model");
const MarketingCampaign = require("./src/models/marketingCampaing.model");
const WebHome = require("./src/models/webHome.model");
const Consultant = require("./src/models/consultant.model");
const CatalogsPage = require("./src/models/catalogPage.model");

// --- CLOUD CONFIGURATION ---
const OLD_BUCKET_IDENTIFIER = "gvre-images.fra1.digitaloceanspaces.com";

const spacesEndpoint = new aws.Endpoint(process.env.NEW_S3_ENDPOINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint.host,
  region: "eu-central-1",
  accessKeyId: process.env.NEW_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEW_AWS_SECRET_ACCESS_KEY,
});

const NEW_BUCKET_NAME = process.env.NEW_BUCKET_NAME;

// --- MIGRATION CONFIGURATION ARRAY ---
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

// --- ERROR TRACKING ---
const migrationErrors = [];

// --- HELPER FUNCTIONS ---
const getFilenameFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return path.basename(urlObj.pathname);
  } catch (e) {
    return `migrated-${Date.now()}`;
  }
};

const getNestedValue = (obj, pathStr) => {
  return pathStr.split(".").reduce((acc, part) => acc && acc[part], obj);
};

// Modificado para normalizar URLs sin provocar doble codificación
const transferFile = async (oldUrl, context) => {
  if (!oldUrl || !oldUrl.includes(OLD_BUCKET_IDENTIFIER)) return oldUrl;

  try {
    // 🚨 EL ARREGLO ESTÁ AQUÍ 🚨
    // Pasamos de un string a un objeto URL nativo. Esto normaliza la dirección
    // de forma segura: codifica los espacios que faltan pero NO doble-codifica los %20
    const safeUrl = new URL(oldUrl).toString();

    const response = await axios({
      method: "GET",
      url: safeUrl,
      responseType: "stream",
    });

    const filename = getFilenameFromUrl(oldUrl);
    const newKey = `migrated-${Date.now()}-${filename}`;

    const uploadParams = {
      Bucket: NEW_BUCKET_NAME,
      Key: newKey,
      Body: response.data,
      ContentType: response.headers["content-type"],
    };

    const s3Response = await s3.upload(uploadParams).promise();
    return s3Response.Location;
  } catch (error) {
    console.error(
      `    ❌ [ERROR ${error.response?.status || "Network"}] Failed to transfer: ${oldUrl}`,
    );
    // Guardamos el error en el array
    migrationErrors.push({
      collection: context.collection,
      documentId: context.id,
      field: context.field,
      failedUrl: oldUrl,
      reason: error.message,
      statusCode: error.response?.status,
    });
    return oldUrl; // Devolvemos la url antigua para no romper la base de datos
  }
};

const processTextContent = async (text, context) => {
  if (!text || typeof text !== "string") return text;

  const regex = new RegExp(`https://${OLD_BUCKET_IDENTIFIER}[^\\s"'>]+`, "g");
  const matches = [...new Set(text.match(regex) || [])];

  let newText = text;

  // Procesamiento PARALELO de las URLs dentro de un texto
  const transferPromises = matches.map(async (oldUrl) => {
    const newUrl = await transferFile(oldUrl, context);
    return { oldUrl, newUrl };
  });

  const results = await Promise.all(transferPromises);

  for (const { oldUrl, newUrl } of results) {
    newText = newText.split(oldUrl).join(newUrl);
  }
  return newText;
};

// --- MAIN MIGRATION LOGIC ---
const runMigration = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://doadmin:6jF85D37tnsh01G9@db-mongodb-fra1-08326-c8143b83.mongo.ondigitalocean.com/gvre-crm?tls=true&authSource=admin",
    );
    console.log("✅ Connected to MongoDB");

    for (const config of migrationConfig) {
      console.log(`\n======================================`);
      console.log(`🚀 STARTING COLLECTION: ${config.name}`);
      console.log(`======================================`);

      // 1. OPTIMIZACIÓN: Crear un query que SOLO traiga documentos que tengan la URL vieja
      // Esto evita que NodeJS procese miles de documentos que ya están limpios
      const regexFilter = { $regex: OLD_BUCKET_IDENTIFIER, $options: "i" };
      const queryConditions = config.fields.map((f) => ({
        [f.path]: regexFilter,
      }));
      const optimizeQuery = { $or: queryConditions };

      // 2. OPTIMIZACIÓN: .lean() para saltar validaciones y procesar x5 veces más rápido
      const cursor = config.model.find(optimizeQuery).lean().cursor();

      let bulkOperations = [];
      let processedCount = 0;

      for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
      ) {
        let updatePayload = {};
        let hasChanges = false;
        processedCount++;

        // Log reducido para no saturar la consola en procesos rápidos
        if (processedCount % 50 === 0)
          console.log(
            `🔄 Processing ${config.name}... (${processedCount} docs analyzed)`,
          );

        for (const field of config.fields) {
          const val = getNestedValue(doc, field.path);
          if (!val) continue;

          const context = {
            collection: config.name,
            id: doc._id,
            field: field.path,
          };

          // 1. Strings
          if (
            field.type === "string" &&
            typeof val === "string" &&
            val.includes(OLD_BUCKET_IDENTIFIER)
          ) {
            const newVal = await transferFile(val, context);
            if (newVal !== val) {
              updatePayload[field.path] = newVal;
              hasChanges = true;
            }
          }

          // 2. Arrays (Procesamiento PARALELO de todas las imágenes del array)
          else if (field.type === "array" && Array.isArray(val)) {
            const arrayPromises = val.map(async (item) => {
              if (
                typeof item === "string" &&
                item.includes(OLD_BUCKET_IDENTIFIER)
              ) {
                return await transferFile(item, context);
              }
              return item;
            });

            const newArray = await Promise.all(arrayPromises);

            // Si el array resultante es distinto al original, marcamos cambio
            if (JSON.stringify(newArray) !== JSON.stringify(val)) {
              updatePayload[field.path] = newArray;
              hasChanges = true;
            }
          }

          // 3. Text (HTML)
          else if (
            field.type === "text" &&
            typeof val === "string" &&
            val.includes(OLD_BUCKET_IDENTIFIER)
          ) {
            const newText = await processTextContent(val, context);
            if (newText !== val) {
              updatePayload[field.path] = newText;
              hasChanges = true;
            }
          }

          // 4. JSON
          else if (field.type === "json" && typeof val === "object") {
            const jsonString = JSON.stringify(val);
            if (jsonString.includes(OLD_BUCKET_IDENTIFIER)) {
              const newJsonString = await processTextContent(
                jsonString,
                context,
              );
              updatePayload[field.path] = JSON.parse(newJsonString);
              hasChanges = true;
            }
          }
        }

        // 3. OPTIMIZACIÓN: Guardar en memoria y escribir por bloques
        if (hasChanges) {
          bulkOperations.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: updatePayload },
            },
          });
        }

        // Ejecutar los cambios en MongoDB de 100 en 100
        if (bulkOperations.length >= 100) {
          await config.model.collection.bulkWrite(bulkOperations, {
            ordered: false,
          });
          console.log(`💾 Saved batch of 100 updates to MongoDB`);
          bulkOperations = [];
        }
      }

      // Guardar el resto de documentos sueltos
      if (bulkOperations.length > 0) {
        await config.model.collection.bulkWrite(bulkOperations, {
          ordered: false,
        });
        console.log(
          `💾 Saved final batch of ${bulkOperations.length} updates to MongoDB`,
        );
      }
    }

    console.log("\n🎉 ALL COLLECTIONS MIGRATED SUCCESSFULLY!");
  } catch (error) {
    console.error("\n❌ MIGRATION CRASHED:", error);
  } finally {
    // --- GENERACIÓN DEL REPORTE DE ERRORES ---
    if (migrationErrors.length > 0) {
      console.log(
        `\n⚠️ Se detectaron ${migrationErrors.length} errores durante la descarga/subida de imágenes.`,
      );
      const errorFilePath = path.join(
        __dirname,
        `migration_errors_${Date.now()}.json`,
      );
      fs.writeFileSync(errorFilePath, JSON.stringify(migrationErrors, null, 2));
      console.log(`📄 Reporte guardado en: ${errorFilePath}`);
    } else {
      console.log("\n✨ No hubo ningún error de descarga (0 errores 404).");
    }

    await mongoose.disconnect();
    process.exit(0);
  }
};

console.log("🔍 VARIABLES CARGADAS:");
console.log("- Bucket Destino:", NEW_BUCKET_NAME);
console.log("- Endpoint S3:", process.env.NEW_S3_ENDPOINT);

runMigration();
