require("dotenv").config();
const { MongoClient } = require("mongodb");

/* FUENTE PRODUCCIÓN*/
const SOURCE_URI =
  "mongodb+srv://doadmin:073GqSW625dF18CV@db-mongodb-gvre-crm-prod-7c95b7da.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=db-mongodb-gvre-crm-prod";

/* TARGET PRODUCCIÓN */
const TARGET_URI =
  "mongodb+srv://doadmin:6jF85D37tnsh01G9@db-mongodb-fra1-08326-c8143b83.mongo.ondigitalocean.com/gvre-crm?tls=true&authSource=admin";

async function cloneDatabase() {
  console.log("⏳ Conectando a los clusters...");
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log("⏳ Conectando al ORIGEN (Producción Antiguo)...");
    await sourceClient.connect();
    console.log("✅ Origen conectado.");

    console.log("⏳ Conectando al DESTINO (Producción Nuevo)...");
    await targetClient.connect();
    console.log("✅ Destino conectado.");

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db("gvre-crm");

    // 1. Obtener todas las colecciones del origen
    const collections = await sourceDb.listCollections().toArray();

    for (let collInfo of collections) {
      // Ignorar vistas o colecciones del sistema
      if (collInfo.type === "view" || collInfo.name.startsWith("system."))
        continue;

      const collName = collInfo.name;
      console.log(`🚀 Procesando colección: [${collName}]`);

      const sourceColl = sourceDb.collection(collName);
      const targetColl = targetDb.collection(collName);

      // 2. ¡ELIMINADO EL deleteMany({})! Ahora respetamos lo que ya existe.

      // 3. SINCRONIZACIÓN EN LOTES (BulkWrite para eficiencia)
      const cursor = sourceColl.find({});
      let bulkOperations = [];
      let newDocsCount = 0; // Contador solo para documentos NUEVOS

      for await (const doc of cursor) {
        // Preparamos la operación: "Si el _id no existe, inserta el doc. Si existe, ignóralo".
        bulkOperations.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $setOnInsert: doc },
            upsert: true,
          },
        });

        // Ejecutar en lotes de 500
        if (bulkOperations.length === 500) {
          const result = await targetColl.bulkWrite(bulkOperations, {
            ordered: false,
          });
          newDocsCount += result.upsertedCount; // Solo contamos los que se han insertado de cero
          bulkOperations = []; // Vaciar lote
        }
      }

      // Insertar el resto que no llegó a 500
      if (bulkOperations.length > 0) {
        const result = await targetColl.bulkWrite(bulkOperations, {
          ordered: false,
        });
        newDocsCount += result.upsertedCount;
      }

      console.log(
        `   └─ 📄 Añadidos ${newDocsCount} documentos nuevos (los ya existentes se han omitido).`,
      );

      // 4. CLONAR ÍNDICES (createIndexes es inteligente, si ya existen no da error)
      const indexes = await sourceColl.listIndexes().toArray();
      const indexesToCreate = indexes
        .filter((idx) => idx.name !== "_id_")
        .map((idx) => {
          const { ns, v, ...indexSpec } = idx;
          return indexSpec;
        });

      if (indexesToCreate.length > 0) {
        await targetColl.createIndexes(indexesToCreate);
        console.log(
          `   └─ ⚡ Verificados/Recreados ${indexesToCreate.length} índices secundarios.`,
        );
      }

      console.log(`✅ Colección [${collName}] completada.\n`);
    }

    console.log("🎉 ¡SINCRONIZACIÓN INCREMENTAL COMPLETA Y SEGURA!");
  } catch (error) {
    console.error("❌ Error catastrófico durante la sincronización:", error);
  } finally {
    await sourceClient.close();
    await targetClient.close();
    process.exit(0);
  }
}

cloneDatabase();
