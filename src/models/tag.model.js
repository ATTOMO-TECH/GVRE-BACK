const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const tagSchema = new Schema(
  {
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);
const Tag = mongoose.model("tags", tagSchema);

module.exports = Tag;
