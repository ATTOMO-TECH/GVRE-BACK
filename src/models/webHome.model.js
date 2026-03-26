const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const webHomeSchema = new Schema(
  {
    mainTitle: { type: String },
    mainSubtitle: { type: String },
    portraidImage: { type: String },
    videoSection: {
      title: { type: String },
      subtitle: { type: [String] },
      videos: [
        {
          adId: { type: mongoose.Types.ObjectId, ref: "ads" },
          videoUrl: { type: String },
          title: { type: String },
          slug: { type: String },
          adReference: { type: String },
          price: {
            sale: { type: Number },
            rent: { type: Number },
            label: { type: String },
          },
        },
      ],
    },
    categoriesImages: {
      residential: { type: String },
      patrimonial: { type: String },
      art: { type: String },
      catalog: { type: String },
    },
    categoriesSection: {
      residential: {
        title: { type: String, default: "Residencial" },
        subtitle: { type: String },
        image: { type: String },
      },
      patrimonial: {
        title: { type: String, default: "Patrimonial" },
        subtitle: { type: String },
        image: { type: String },
      },
      others: {
        title: { type: String, default: "Otros" },
        subtitle: { type: String },
        image: { type: String },
      },
      location1: {
        title: { type: String, default: "Madrid" },
        subtitle: { type: String },
        image: { type: String },
      },
      location2: {
        title: { type: String, default: "Marbella" },
        subtitle: { type: String },
        image: { type: String },
      },
      location3: {
        title: { type: String, default: "Sotogrande" },
        subtitle: { type: String },
        image: { type: String },
      },
      location4: {
        title: { type: String, default: "Puerto de Santa María" },
        subtitle: { type: String },
        image: { type: String },
      },
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
      residenciales: {
        title: { type: String },
        subtitle: { type: String },
        image: { type: String },
        cards: [
          {
            text: { type: String },
          },
        ],
      },
      patrimoniales: {
        title: { type: String },
        subtitle: { type: String },
        image: { type: String },
        cards: [
          {
            text: { type: String },
          },
        ],
      },
      transversales: {
        title: { type: String },
        subtitle: { type: String },
        image: { type: String },
        cards: [
          {
            text: { type: String },
          },
        ],
      },
    },
  },
  {
    timestamps: true,
  },
);

const WebHome = mongoose.model("webHome", webHomeSchema);

module.exports = WebHome;
