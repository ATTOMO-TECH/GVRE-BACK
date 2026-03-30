const Blog = require("../models/blog.model");
const { revalidateWeb } = require("../utils/revalidateWeb");
const { getCdnUrl, deleteImage } = require("../middlewares/file.middleware");

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
    const blogStored = await blog.save();

    await revalidateWeb("get-blogs");

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

    // D. Actualizar en la base de datos
    const blogUpdated = await Blog.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!blogUpdated) {
      return res.status(404).send({ msg: "No se encontró el blog" });
    }

    await revalidateWeb("get-blogs");
    await revalidateWeb(`blog-${blogUpdated.slug}`);

    res
      .status(200)
      .send({ msg: "Actualizado correctamente", blog: blogUpdated });
  } catch (error) {
    console.error("Error real en el backend (Update):", error);
    res.status(500).send({ msg: "Error al actualizar", error: error.message });
  }
};

// 3. Obtener Blogs
const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).send(blogs);
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

    res.status(200).json({ blogs, hasMore, total: totalBlogs });
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
      await revalidateWeb("get-blogs");
      await revalidateWeb(`blog-${blogDeleted.slug}`);
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

    res.status(200).json(blog);
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

    res.status(200).json(blogs);
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
    const tags = await Blog.distinct("tags", { active: true });
    res.status(200).json(tags.sort());
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
