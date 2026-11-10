const mongoose = require("mongoose");
const { ENTITIES, buildTranslationsDefinition } = require("../i18n");

const Schema = mongoose.Schema;

const OfficeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la oficina es obligatorio"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "La dirección es obligatoria"],
      trim: true,
    },
    schedule: {
      type: String,
      required: [true, "El horario es obligatorio"],
    },
    phone: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    // Textos en otros idiomas; el español sigue en los campos de siempre
    translations: buildTranslationsDefinition(ENTITIES.OFFICE),
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Office", OfficeSchema);
