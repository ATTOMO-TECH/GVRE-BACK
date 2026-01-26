const { deleteImage } = require("../middlewares/file.middleware");
const Catalog = require("../models/catalog.model");
const CatalogPage = require("../models/catalogPage.model");

const catalogGetAll = async (req, res, next) => {
  try {
    const catalogs = await Catalog.find();
    return res.status(200).json(catalogs);
  } catch (err) {
    return next(err);
  }
};

const catalogGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const catalog = await Catalog.findById(id);
    return res.status(200).json(catalog);
  } catch (err) {
    return next(err);
  }
};

const catalogCreate = async (req, res, next) => {
  try {
    const newCatalog = new Catalog({
      year: req.body.year,
      portraidImage: req.files[0].location,
      catalog: `https://gvre-images.fra1.digitaloceanspaces.com/${req.files[1].key}`,
    });

    const catalogCreated = await newCatalog.save();

    return res.status(200).json(catalogCreated);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const catalogEdit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const catalog = await Catalog.findById(id);
    const catalogToUpdate = catalog;
    catalogToUpdate.year = req.body.year;
    if (req.files.length === 2) {
      deleteImage(catalogToUpdate.portraidImage);
      deleteImage(catalogToUpdate.catalog);
      catalogToUpdate.portraidImage = req.files[0].location;
      catalogToUpdate.catalog = `https://gvre-images.fra1.digitaloceanspaces.com/${req.files[1].key}`;
    } else if (req.files.length === 1) {
      if (req.files[0].mimetype.includes("pdf")) {
        deleteImage(catalogToUpdate.catalog);
        catalogToUpdate.catalog = `https://gvre-images.fra1.digitaloceanspaces.com/${req.files[0].key}`;
      } else {
        deleteImage(catalogToUpdate.portraidImage);
        catalogToUpdate.portraidImage = req.files[0].location;
      }
    }

    const updatedCatalog = await Catalog.findByIdAndUpdate(
      id,
      catalogToUpdate,
      { new: true },
    );
    return res.status(200).json(updatedCatalog);
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

const catalogDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let response = "";
    const catalog = await Catalog.findById(id);
    if (catalog !== null) {
      deleteImage(catalog.catalog);
      deleteImage(catalog.portraidImage);
    }

    const deleted = await Catalog.findByIdAndDelete(id);
    if (deleted) response = "Catálogo borrado de la base de datos";
    else
      response =
        "No se ha podido encontrar este catálogo. ¿Estás seguro de que existe?";

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const uploadMainImageCatalogSection = async (req, res, next) => {
  try {
    const newCatalogPage = new CatalogPage({
      imgSection: req.file.location,
    });
    await newCatalogPage.save();
    res
      .status(201)
      .send({ message: "Image uploaded successfully", data: newCatalogPage });
  } catch (error) {
    return next(error);
  }
};

const getMainImageCatalogSection = async (req, res, next) => {
  try {
    const mainImageCatalog = await CatalogPage.find();
    res.status(200).send(mainImageCatalog);
  } catch (error) {
    return next(error);
  }
};

const deleteImageCatalogSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mainImageCatalog = await CatalogPage.findById(id);

    if (mainImageCatalog !== null) {
      deleteImage(mainImageCatalog.imgSection);
    }

    const deleted = await CatalogPage.findByIdAndDelete(id);

    deleted && res.status(200).json({ message: "Deleted Susscesfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  catalogGetAll,
  catalogCreate,
  catalogEdit,
  catalogDelete,
  uploadMainImageCatalogSection,
  getMainImageCatalogSection,
  deleteImageCatalogSection,
};
