const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const zoneSchema = new Schema(
  {
    zone: { type: String },
    subzone: { type: String, default: null },
    name: { type: String },
    id: { type: String },
    status: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

//campo rustico:     _id:   "6368f6f92bf0bfd02dec4ea5" // 636a961ce64d2932b53366f4
//activos singulares _id:   "6368f7ec2bf0bfd02dec4ea7" // 636a965fe64d2932b5336711
//costa              _id:   "6368f82f2bf0bfd02dec4ea9" // 636a969ee64d2932b533674b

const Zone = mongoose.model("zones", zoneSchema);

module.exports = Zone;
