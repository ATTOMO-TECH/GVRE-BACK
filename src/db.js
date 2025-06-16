const mongoose = require("mongoose");

const DB_URL = process.env.MONGODB_URI;

const connect = async () => {
  try {
    const db = await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const { name, host } = db.connection;
    console.log(`Connected to the database ${name} in host ${host}`);
  } catch (err) {
    console.log("Ha ocurrido un error conectando a la base de datos.", err);
  }
};

module.exports = {
  DB_URL,
  connect,
};
