const { deleteImage, getCdnUrl } = require("../middlewares/file.middleware");
const Catalog = require("../models/catalog.model");
const CatalogPage = require("../models/catalogPage.model");
const { revalidateWeb } = require("../utils/revalidateWeb");

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
      portraidImage: getCdnUrl(req.files[0]),
      catalog: getCdnUrl(req.files[1]),
    });

    const catalogCreated = await newCatalog.save();

    revalidateWeb(["catalogs-data"]).catch((err) =>
      console.error(
        "❌ Falló revalidación en background (catalogCreate):",
        err,
      ),
    );

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
      try {
        await Promise.all([
          deleteImage(catalogToUpdate.portraidImage),
          deleteImage(catalogToUpdate.catalog),
        ]);
      } catch (e) {
        console.error(
          "Aviso: Error borrando imágenes antiguas de S3 en edición de catálogo",
          e,
        );
      }

      catalogToUpdate.portraidImage = getCdnUrl(req.files[0]);
      catalogToUpdate.catalog = getCdnUrl(req.files[1]);
    } else if (req.files.length === 1) {
      if (req.files[0].mimetype.includes("pdf")) {
        try {
          await deleteImage(catalogToUpdate.catalog);
        } catch (e) {}
        catalogToUpdate.catalog = getCdnUrl(req.files[0]);
      } else {
        try {
          await deleteImage(catalogToUpdate.portraidImage);
        } catch (e) {}
        catalogToUpdate.portraidImage = getCdnUrl(req.files[0]);
      }
    }

    const updatedCatalog = await Catalog.findByIdAndUpdate(
      id,
      catalogToUpdate,
      { new: true },
    );

    revalidateWeb(["catalogs-data"]).catch((err) =>
      console.error("❌ Falló revalidación en background (catalogEdit):", err),
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
      // CORRECCIÓN: Borramos en paralelo y evitamos que un fallo en S3 cancele el borrado en BD
      try {
        const deletePromises = [];
        if (catalog.catalog) deletePromises.push(deleteImage(catalog.catalog));
        if (catalog.portraidImage)
          deletePromises.push(deleteImage(catalog.portraidImage));

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } catch (e) {
        console.error(
          "Aviso: No se pudo borrar el archivo de S3, pero se borrará de BD.",
          e,
        );
      }
    }

    const deleted = await Catalog.findByIdAndDelete(id);

    if (deleted) {
      response = "Catálogo borrado de la base de datos";
      revalidateWeb(["catalogs-data"]).catch((err) =>
        console.error(
          "❌ Falló revalidación en background (catalogDelete):",
          err,
        ),
      );
    } else {
      response =
        "No se ha podido encontrar este catálogo. ¿Estás seguro de que existe?";
    }

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const uploadMainImageCatalogSection = async (req, res, next) => {
  try {
    const newCatalogPage = new CatalogPage({
      imgSection: getCdnUrl(req.file),
    });
    await newCatalogPage.save();

    revalidateWeb(["catalogs-data"]).catch((err) =>
      console.error(
        "❌ Falló revalidación en background (uploadMainImageCatalogSection):",
        err,
      ),
    );

    return res
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
      // CORRECCIÓN: Manejo de errores en S3 independiente de la BD
      try {
        await deleteImage(mainImageCatalog.imgSection);
      } catch (e) {
        console.error(
          "Aviso: No se pudo borrar la imagen de sección de S3.",
          e,
        );
      }
    }

    const deleted = await CatalogPage.findByIdAndDelete(id);

    if (deleted) {
      revalidateWeb(["catalogs-data"]).catch((err) =>
        console.error(
          "❌ Falló revalidación en background (deleteImageCatalogSection):",
          err,
        ),
      );
      res.status(200).json({ message: "Deleted Successfully" });
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  catalogGetAll,
  catalogGetOne,
  catalogCreate,
  catalogEdit,
  catalogDelete,
  uploadMainImageCatalogSection,
  getMainImageCatalogSection,
  deleteImageCatalogSection,
};
