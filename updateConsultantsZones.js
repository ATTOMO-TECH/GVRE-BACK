require("dotenv").config(); // 1. Carga las variables de entorno (.env)
const mongoose = require("mongoose");
const Consultant = require("./src/models/consultant.model");
const Zone = require("./src/models/zone.model");

// Tu configuración de conexión
const DB_URL = process.env.MONGODB_URI;

const connect = async () => {
  try {
    const db = await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    const { name, host } = db.connection;
    console.log(`✅ Connected to the database ${name} in host ${host}`);
  } catch (err) {
    console.error("❌ Error conectándose a la base de datos:", err);
    process.exit(1); // Cerramos el script si no hay conexión
  }
};

const migrateConsultantZones = async () => {
  try {
    const consultants = await Consultant.find({});
    const priorities = ["high", "medium", "low"];
    let totalUpdated = 0;

    for (const consultant of consultants) {
      let hasChanges = false;
      if (!consultant.consultantEmailSignZones) continue;

      for (const priority of priorities) {
        const zonesObj = consultant.consultantEmailSignZones[priority];
        if (!zonesObj) continue;

        for (const zoneKey in zonesObj) {
          const storedZone = zonesObj[zoneKey];

          if (storedZone && storedZone.zoneId) {
            const masterZone = await Zone.findById(storedZone.zoneId).lean();

            if (masterZone) {
              // Comprobamos si los datos difieren para evitar guardados innecesarios
              if (
                storedZone.slug !== masterZone.slug ||
                storedZone.subzone !== (masterZone.subzone || "") ||
                storedZone.zone !== masterZone.zone
              ) {
                storedZone.slug = masterZone.slug; // Sincroniza el slug
                storedZone.subzone = masterZone.subzone || ""; // Sincroniza la subzone (ej: Sotogrande)
                storedZone.zone = masterZone.zone; // Sincroniza la categoría

                hasChanges = true;
              }
            }
          }
        }
      }

      if (hasChanges) {
        consultant.markModified("consultantEmailSignZones");
        await consultant.save();
        totalUpdated++;
        console.log(`✅ Datos sincronizados para: ${consultant.fullName}`);
      }
    }

    console.log(
      `\n🎉 Migración completada. ${totalUpdated} consultores actualizados.`,
    );
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  }
};

// --- EJECUCIÓN DEL SCRIPT ---
const run = async () => {
  await connect(); // Primero conectamos
  await migrateConsultantZones(); // Luego migramos
  await mongoose.disconnect(); // Finalmente desconectamos para que el script termine
  console.log("👋 Conexión a la base de datos cerrada.");
};

run();
