const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const catalogPage = new Schema(
  {
    imgSection: { type: String },
  },
  {
    timestamps: true,
  }
);

const CatalogPage = mongoose.model("catalogPage", catalogPage);

module.exports = CatalogPage;
