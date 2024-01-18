const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const webHomeSchema = new Schema(
  {
    mainTitle: { type: String },
    mainSubtitle: { type: String },
    portraidImage: { type: String },
    categoriesImages: {
      residential: { type: String },
      patrimonial: { type: String },
      art: { type: String },
      catalog: { type: String },
    },
    otherCategoriesImages: {
      coast: { type: String },
      rustic: { type: String },
      singular: { type: String },
    },
    sections: {
      interiorims: {
        title: { type: String },
        image: { type: String },
        buttonText: { type: String },
        description: { type: String },
      },
      sell: {
        title: { type: String },
        image: { type: String },
        buttonText: { type: String },
        description: { type: String },
      },
      offices: {
        title: { type: String },
        image: { type: String },
        buttonText: { type: String },
        description: { type: String },
      },
    },
    talkWithUs: {
      titleHome: { type: String },
      titleContact: { type: String },
      descriptionContact: { type: String },
      directions: { type: [String] },
      phones: { type: [String] },
      email: { type: String },
      contactButton: { type: String },
      contactImage: { type: String },
    },
    services: {
      development: {
        title: { type: String },
        description: { type: String },
        image: { type: String },
      },
      interiorims: {
        title: { type: String },
        description: { type: String },
        image: { type: String },
      },
      investment: {
        title: { type: String },
        description: { type: String },
        investmentSections: { type: [String] },
      },
      assetManagement: {
        title: { type: String },
        description1: { type: String },
        description2: { type: String },
        description3: { type: String },
        description4: { type: String },
      },
      commercialization: {
        title: { type: String },
        description1: { type: String },
        description2: { type: String },
        commerSections: { type: [String] },
      },
    },
  },
  {
    timestamps: true,
  }
);

const WebHome = mongoose.model("webHome", webHomeSchema);

module.exports = WebHome;
