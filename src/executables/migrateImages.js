require("dotenv").config();
const mongoose = require("mongoose");
const aws = require("aws-sdk");
const axios = require("axios");
const path = require("path");
const ad = require("../models/ad.model");
const blog = require("../models/blog.model");
const catalog = require("../models/catalog.model");
const catalogPage = require("../models/catalogPage.model");
const consultant = require("../models/consultant.model");
const contact = require("../models/contact.model");
const marketingCampaing = require("../models/marketingCampaing.model");
const request = require("../models/request.model");
const schedule = require("../models/schedule.model");
const send = require("../models/send.model");
const tag = require("../models/tag.model");
const webHome = require("../models/webHome.model");
const zone = require("../models/zone.model");

// --- MODELS TO IMPORT ---
// Update these paths to match your actual project structure
const Ad = require("../models/ad.model");
const Blog = require("../models/blog.model");
const Catalog = require("../models/catalog.model");
const MarketingCampaign = require("../models/marketingCampaing.model");
const WebHome = require("../models/webHome.model");
const Consultant = require("../models/consultant.model");
const CatalogsPage = require("../models/catalogPage.model");

// --- CLOUD CONFIGURATION ---
const OLD_BUCKET_IDENTIFIER = "gvre-images.fra1.digitaloceanspaces.com"; // Change if needed

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
      { path: "content", type: "text" }, // HTML string
    ],
  },
  {
    model: Catalog,
    name: "Catalogs",
    fields: [
      { path: "imgSection", type: "string" },
      { path: "portraidImage", type: "string" },
      { path: "catalog", type: "string" }, // Works for PDFs too
    ],
  },
  {
    model: CatalogsPage,
    name: "CatalogsPage",
    fields: [
      { path: "imgSection", type: "string" }, // El banner de la página
    ],
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
      { path: "design", type: "json" }, // Deep dynamic object
    ],
  },
];

// --- HELPER FUNCTIONS ---
const getFilenameFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return path.basename(urlObj.pathname);
  } catch (e) {
    return `migrated-${Date.now()}`;
  }
};

const transferFile = async (oldUrl) => {
  if (!oldUrl || !oldUrl.includes(OLD_BUCKET_IDENTIFIER)) return oldUrl;

  try {
    console.log(`    ⬇️ Downloading: ${oldUrl}`);
    const response = await axios({
      method: "GET",
      url: oldUrl,
      responseType: "stream",
    });
    const filename = getFilenameFromUrl(oldUrl);
    const newKey = `migrated-${Date.now()}-${filename}`;

    const uploadParams = {
      Bucket: NEW_BUCKET_NAME,
      Key: newKey,
      Body: response.data,
      ACL: "public-read",
      ContentType: response.headers["content-type"],
    };

    const s3Response = await s3.upload(uploadParams).promise();
    console.log(`    ✅ Uploaded: ${s3Response.Location}`);
    return s3Response.Location;
  } catch (error) {
    console.error(`    ❌ Failed to transfer ${oldUrl}:`, error.message);
    return oldUrl; // Return old URL so we don't break the DB if upload fails
  }
};

// Extracts URLs from text (HTML/JSON), migrates them, and replaces them in the text
const processTextContent = async (text) => {
  if (!text || typeof text !== "string") return text;

  // Find all URLs matching the old bucket
  const regex = new RegExp(`https://${OLD_BUCKET_IDENTIFIER}[^\\s"'>]+`, "g");
  const matches = [...new Set(text.match(regex) || [])]; // Unique URLs

  let newText = text;
  for (const oldUrl of matches) {
    const newUrl = await transferFile(oldUrl);
    // Replace all instances of this specific URL in the text
    newText = newText.split(oldUrl).join(newUrl);
  }
  return newText;
};

// --- MAIN MIGRATION LOGIC ---
const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const config of migrationConfig) {
      console.log(`\n======================================`);
      console.log(`🚀 STARTING COLLECTION: ${config.name}`);
      console.log(`======================================`);

      const cursor = config.model.find({}).cursor();

      for (
        let doc = await cursor.next();
        doc != null;
        doc = await cursor.next()
      ) {
        let hasChanges = false;
        console.log(`\n🔄 Processing ${config.name} ID: ${doc._id}`);

        for (const field of config.fields) {
          const val = doc.get(field.path);
          if (!val) continue;

          // 1. Strings
          if (
            field.type === "string" &&
            typeof val === "string" &&
            val.includes(OLD_BUCKET_IDENTIFIER)
          ) {
            const newVal = await transferFile(val);
            if (newVal !== val) {
              doc.set(field.path, newVal);
              hasChanges = true;
            }
          }

          // 2. Arrays
          else if (field.type === "array" && Array.isArray(val)) {
            const newArray = [];
            for (const item of val) {
              if (
                typeof item === "string" &&
                item.includes(OLD_BUCKET_IDENTIFIER)
              ) {
                const newItem = await transferFile(item);
                newArray.push(newItem);
                if (newItem !== item) hasChanges = true;
              } else {
                newArray.push(item);
              }
            }
            doc.set(field.path, newArray);
          }

          // 3. Text (HTML bodies, Blog content)
          else if (
            field.type === "text" &&
            typeof val === "string" &&
            val.includes(OLD_BUCKET_IDENTIFIER)
          ) {
            const newText = await processTextContent(val);
            if (newText !== val) {
              doc.set(field.path, newText);
              hasChanges = true;
            }
          }

          // 4. JSON Objects (Marketing Design)
          else if (field.type === "json" && typeof val === "object") {
            const jsonString = JSON.stringify(val);
            if (jsonString.includes(OLD_BUCKET_IDENTIFIER)) {
              const newJsonString = await processTextContent(jsonString);
              doc.set(field.path, JSON.parse(newJsonString));
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          // Use markModified for deep objects and mixed types to ensure Mongoose saves them
          for (const field of config.fields) {
            doc.markModified(field.path.split(".")[0]);
          }
          await doc.save();
          console.log(`💾 Saved ${config.name} ID: ${doc._id}`);
        } else {
          console.log(`⏭️ No changes needed for ID: ${doc._id}`);
        }
      }
    }

    console.log("\n🎉 ALL COLLECTIONS MIGRATED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("Migration completely failed:", error);
    process.exit(1);
  }
};

runMigration();
