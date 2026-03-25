const mongoose = require("mongoose");

const DB_URL = process.env.MONGODB_URI;

const connect = async () => {
  try {
    const db = await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    const { name, host } = db.connection;
    console.log(`✅ Connected to the database ${name} in host ${host}`);

    return db;
  } catch (err) {
    console.error(
      "❌ Ha ocurrido un error conectándose a la base de datos:",
      err,
    );
    throw err;
  }
};

module.exports = {
  DB_URL,
  connect,
};
