// require("dotenv").config();
// const mongoose = require("mongoose");
// const Ad = require("../src/models/ad.model"); // Ajusta la ruta a tu modelo

// mongoose
//   .connect(process.env.MONGODB_URI_PREP)
//   .then(async () => {
//     console.log("🚀 Iniciando migración de Slugs...");

//     // 1. Buscamos TODOS los anuncios (o solo los que no tienen slug)
//     const ads = await Ad.find({});

//     console.log(`📋 Procesando ${ads.length} anuncios...`);

//     let count = 0;
//     for (const ad of ads) {
//       // Si ya tiene slug, lo saltamos (opcional, si quieres regenerar todos quita el if)
//       if (ad.slug) continue;

//       // --- EL TRUCO ESTÁ AQUÍ ---
//       // 1. Forzamos a null para asegurar
//       ad.slug = null;

//       // 2. IMPORTANTE: Marcamos el 'title' como modificado manualmente.
//       // Esto despierta al plugin: "Oye, el título ha 'cambiado', genera el slug".
//       ad.markModified("title");

//       try {
//         await ad.save();
//         console.log(`✅ [OK] Slug: ${ad.slug} | Título: ${ad.title}`);
//         count++;
//       } catch (error) {
//         // Si falla por duplicado (E11000), el plugin debería manejarlo,
//         // pero si tienes títulos idénticos y unique:true, a veces hay conflictos.
//         console.error(`❌ [ERROR] ID: ${ad._id} | ${error.message}`);
//       }
//     }

//     console.log(`✨ Migración terminada. ${count} slugs generados.`);
//     process.exit();
//   })
//   .catch((err) => {
//     console.error("Error de conexión:", err);
//     process.exit(1);
//   });
