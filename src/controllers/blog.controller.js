const Blog = require("../models/blog.model");
const { revalidateWeb } = require("../utils/revalidateWeb");
const { getCdnUrl, deleteImage } = require("../middlewares/file.middleware");
const {
  ENTITIES,
  isTranslationLang,
  getTranslatedLangs,
  getLocalizedValue,
  localizeDocument,
  withTranslationStatus,
  planTranslationWrites,
  toMongoUpdate,
  applyWritesToDocument,
} = require("../i18n");

const hasTranslationsInput = (input) =>
  Boolean(input?.incoming || input?.confirmed);

const BLOG_MAIN_PATHS = ["title", "content"];

const toPlain = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : doc);

// Campos SEO y el campo normal al que la web recurre cuando están vacíos
const SEO_FALLBACKS = { seoTitle: "title", seoDescription: "description" };

const hasTranslation = (blog, lang, path) =>
  Boolean(blog.translations?.[lang]?.[path]?.value);

// Si el título SEO no está traducido pero el título sí, el SEO en español no
// debe imponerse al título traducido: se devuelve vacío y la web usa el título.
const getUntranslatedSeoOverrides = (blog, lang) => {
  if (!isTranslationLang(lang)) return {};

  return Object.fromEntries(
    Object.entries(SEO_FALLBACKS)
      .filter(
        ([seoPath, mainPath]) =>
          !hasTranslation(blog, lang, seoPath) &&
          hasTranslation(blog, lang, mainPath),
      )
      .map(([seoPath]) => [seoPath, ""]),
  );
};

// Artículo tal y como lo consume la web pública en un idioma. `tags` se queda
// en español porque es la clave con la que se filtra y se buscan relacionados;
// el texto que se muestra va en `tagLabels`, alineado por posición.
const presentBlog = (blog, lang) => {
  const plain = toPlain(blog);

  return {
    ...localizeDocument(ENTITIES.BLOG, plain, lang),
    ...getUntranslatedSeoOverrides(plain, lang),
    tags: plain.tags,
    tagLabels: getLocalizedValue(ENTITIES.BLOG, plain, "tags", lang),
    // Idiomas en los que el artículo está traducido (título y cuerpo)
    translatedLangs: getTranslatedLangs(ENTITIES.BLOG, plain, BLOG_MAIN_PATHS),
  };
};

// Traducción de cada etiqueta, tomada de los artículos que la tienen
// traducida. Si varios la traducen distinto, manda el editado más reciente.
const getTagLabels = async (lang) => {
  const labels = new Map();
  if (!isTranslationLang(lang)) return labels;

  const blogs = await Blog.find({
    active: true,
    [`translations.${lang}.tags.value.0`]: { $exists: true },
  })
    .select(`tags translations.${lang}.tags`)
    .sort({ updatedAt: -1 })
    .lean();

  blogs.forEach((blog) => {
    const translated = getLocalizedValue(ENTITIES.BLOG, blog, "tags", lang);

    (blog.tags || []).forEach((tag, index) => {
      if (!labels.has(tag) && translated[index] !== tag) {
        labels.set(tag, translated[index]);
      }
    });
  });

  return labels;
};

// 1. Crear Post con Imagen
const createBlog = async (req, res) => {
  try {
    // A. VALIDACIÓN TEMPRANA: Si no hay archivo, cortamos la ejecución
    if (!req.file) {
      return res.status(400).send({
        msg: "La imagen de portada es obligatoria",
      });
    }

    const data = { ...req.body };

    // B. Procesar tags
    if (data.tags) {
      try {
        data.tags = JSON.parse(data.tags);
      } catch (e) {
        data.tags = data.tags.split(",").map((tag) => tag.trim());
      }
    }

    // C. Asignar la imagen a los datos ANTES de crear el modelo
    // (Nota: si getCdnUrl fuera asíncrona, recuerda ponerle 'await')
    data.image = getCdnUrl(req.file);

    // D. Instanciar y guardar
    const blog = new Blog(data);
    applyWritesToDocument(
      blog,
      planTranslationWrites(ENTITIES.BLOG, {
        source: blog.toObject(),
        ...req.translationsInput,
      }),
    );
    const blogStored = await blog.save();

    // 🚀 ACTUALIZADO: Fire & Forget con un array
    revalidateWeb(["get-blogs"]).catch((err) =>
      console.error("❌ Falló revalidación en background (createBlog):", err),
    );

    res.status(201).send({ msg: "Blog creado con éxito", blog: blogStored });
  } catch (error) {
    console.error("Error real en el backend (Create):", error);
    res
      .status(500)
      .send({ msg: "Error al guardar en BD", error: error.message });
  }
};

// 2. Actualizar Post (con cambio opcional de imagen)
const updateBlog = async (req, res) => {
  // A. MOVEMOS EL TRY AL PRINCIPIO para proteger todo el proceso
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // B. Procesar tags
    if (updates.tags) {
      try {
        updates.tags = JSON.parse(updates.tags);
      } catch (e) {
        updates.tags = updates.tags.split(",").map((tag) => tag.trim());
      }
    }

    // C. Si viene una imagen nueva, procesamos el reemplazo
    if (req.file) {
      try {
        const oldBlog = await Blog.findById(id);
        if (oldBlog && oldBlog.image) {
          await deleteImage(oldBlog.image);
        }
      } catch (e) {
        console.error("Aviso: No se pudo borrar la imagen anterior de S3", e);
      }

      updates.image = getCdnUrl(req.file);
    }

    // D. Traducciones: se comparan con lo guardado y con el español tal y
    // como queda tras esta edición
    let translationUpdate = {};
    if (hasTranslationsInput(req.translationsInput)) {
      const currentBlog = await Blog.findById(id).lean();

      if (currentBlog) {
        translationUpdate = toMongoUpdate(
          planTranslationWrites(ENTITIES.BLOG, {
            source: { ...currentBlog, ...updates },
            stored: currentBlog.translations,
            ...req.translationsInput,
          }),
        );
      }
    }

    // E. Actualizar en la base de datos
    const blogUpdated = await Blog.findByIdAndUpdate(
      id,
      {
        ...updates,
        ...translationUpdate.$set,
        ...(translationUpdate.$unset && { $unset: translationUpdate.$unset }),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!blogUpdated) {
      return res.status(404).send({ msg: "No se encontró el blog" });
    }

    revalidateWeb(["get-blogs", `blog-${blogUpdated.slug}`]).catch((err) =>
      console.error("❌ Falló revalidación en background (updateBlog):", err),
    );

    res.status(200).send({
      msg: "Actualizado correctamente",
      blog: withTranslationStatus(ENTITIES.BLOG, blogUpdated.toObject()),
    });
  } catch (error) {
    console.error("Error real en el backend (Update):", error);
    res.status(500).send({ msg: "Error al actualizar", error: error.message });
  }
};

// 3. Obtener Blogs
const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res
      .status(200)
      .send(
        blogs.map((blog) =>
          withTranslationStatus(ENTITIES.BLOG, blog.toObject()),
        ),
      );
  } catch (error) {
    res.status(500).send({ msg: "Error al obtener blogs" });
  }
};

// 4. Obtener Blogs Paginados
const getPaginatedBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 6, tag, sort = "newest" } = req.query;

    const query = { active: true };
    if (tag) query.tags = tag;

    // Mapeo de criterios de ordenación
    let sortOptions = {};
    switch (sort) {
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "alpha-asc":
        sortOptions = { title: 1 };
        break;
      case "alpha-desc":
        sortOptions = { title: -1 };
        break;
      case "newest":
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const blogs = await Blog.find(query)
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalBlogs = await Blog.countDocuments(query);
    const hasMore = Number(page) * Number(limit) < totalBlogs;

    res.status(200).json({
      blogs: req.lang ? blogs.map((blog) => presentBlog(blog, req.lang)) : blogs,
      hasMore,
      total: totalBlogs,
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener los artículos" });
  }
};

// 5. Eliminar Blog
const deleteBlog = async (req, res) => {
  const { id } = req.params;
  try {
    const blogToDelete = await Blog.findById(id);
    if (blogToDelete && blogToDelete.image) {
      try {
        await deleteImage(blogToDelete.image);
      } catch (e) {
        console.error("Aviso: No se pudo borrar la imagen de S3", e);
      }
    }

    const blogDeleted = await Blog.findByIdAndDelete(id);

    if (blogDeleted) {
      revalidateWeb(["get-blogs", `blog-${blogDeleted.slug}`]).catch((err) =>
        console.error("❌ Falló revalidación en background (deleteBlog):", err),
      );
    }

    res.status(200).send({ msg: "Blog eliminado" });
  } catch (error) {
    res.status(500).send({ msg: "Error al eliminar" });
  }
};

// 6. Obtener detalles del blog por Slug
const getBlogDetails = async (req, res) => {
  const { slug } = req.params;

  try {
    const blog = await Blog.findOne({ slug: slug }).lean();

    if (!blog) {
      return res.status(404).json({
        msg: "Lo sentimos, el artículo no existe.",
      });
    }

    res.status(200).json(req.lang ? presentBlog(blog, req.lang) : blog);
  } catch (error) {
    res.status(500).json({
      msg: "Error interno al obtener el detalle del artículo",
      error: error.message,
    });
  }
};

// 7. Obtener blogs similares al blog que se esta visualizando
const getRelatedBlogs = async (req, res) => {
  try {
    const { tags, excludeId } = req.query;

    const tagsArray = Array.isArray(tags) ? tags : tags ? tags.split(",") : [];

    const query = {
      active: true,
      tags: { $in: tagsArray },
      _id: { $ne: excludeId },
    };

    const blogs = await Blog.find(query).sort({ createdAt: -1 }).limit(10);

    res
      .status(200)
      .json(
        req.lang ? blogs.map((blog) => presentBlog(blog, req.lang)) : blogs,
      );
  } catch (error) {
    res.status(500).json({
      msg: "Error al obtener blogs relacionados",
      error: error.message,
    });
  }
};

// 8. Obtener tags únicos para categorias dinamicas
const getDistinctTags = async (req, res) => {
  try {
    const tags = (await Blog.distinct("tags", { active: true })).sort();

    // Sin idioma se mantiene la lista de cadenas de siempre. Con idioma cada
    // etiqueta lleva su clave en español (`value`) y el texto a mostrar.
    if (!req.lang) return res.status(200).json(tags);

    const labels = await getTagLabels(req.lang);

    return res
      .status(200)
      .json(tags.map((tag) => ({ value: tag, label: labels.get(tag) || tag })));
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener las categorías" });
  }
};

module.exports = {
  createBlog,
  updateBlog,
  getBlogs,
  getPaginatedBlogs,
  deleteBlog,
  getBlogDetails,
  getRelatedBlogs,
  getDistinctTags,
};
