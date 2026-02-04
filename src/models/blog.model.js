const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater");

const Schema = mongoose.Schema;

const BlogSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
    },
    slug: {
      type: String,
      slug: "title",
      unique: true,
      slugPaddingSize: 4,
    },
    description: {
      type: String,
      required: [true, "La descripción corta es obligatoria"],
    },
    content: {
      type: String,
      required: [true, "El contenido no puede estar vacío"],
    },
    image: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    seoTitle: {
      type: String,
      trim: true,
      maxLength: 70,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxLength: 160,
    },
    author: {
      type: String,
      default: "Admin",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

BlogSchema.plugin(slug);

module.exports = mongoose.model("Blog", BlogSchema);
