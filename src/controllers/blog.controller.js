const Blog = require("../models/blog.model");
const { revalidateWeb } = require("../utils/revalidateWeb");

// 1. Crear Post con Imagen
const createBlog = async (req, res) => {
  const data = req.body;
  const blog = new Blog(data);

  // Procesar tags si vienen como string desde el FormData
  if (data.tags) {
    try {
      blog.tags = JSON.parse(data.tags);
    } catch (e) {
      blog.tags = data.tags.split(",").map((tag) => tag.trim());
    }
  }

  if (req.file) {
    // Construimos la URL como en tu ejemplo de Ads
    blog.image = `https://${req.file.bucket}.fra1.digitaloceanspaces.com/${req.file.key}`;
  }

  try {
    const blogStored = await blog.save();

    revalidateWeb("get-blogs");

    res.status(201).send({ msg: "Blog creado con éxito", blog: blogStored });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error al guardar en BD", error: error.message });
  }
};

// 2. Actualizar Post (con cambio opcional de imagen)
const updateBlog = async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  if (updates.tags) {
    try {
      updates.tags = JSON.parse(updates.tags);
    } catch (e) {
      updates.tags = updates.tags.split(",").map((tag) => tag.trim());
    }
  }

  if (req.file) {
    updates.image = `https://${req.file.bucket}.fra1.digitaloceanspaces.com/${req.file.key}`;
  }

  try {
    const blogUpdated = await Blog.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!blogUpdated)
      return res.status(404).send({ msg: "No se encontró el blog" });

    revalidateWeb("get-blogs");
    revalidateWeb(`blog-${blogUpdated.slug}`);

    res
      .status(200)
      .send({ msg: "Actualizado correctamente", blog: blogUpdated });
  } catch (error) {
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
    // 1. Extraemos parámetros de la query
    // page: número de página (empieza en 1)
    // limit: cuántos posts por carga (por defecto 6)
    // tag: etiqueta para filtrar
    const { page = 1, limit = 6, tag } = req.query;

    // 2. Construimos el filtro
    const query = { active: true }; // Solo blogs publicados
    if (tag) {
      query.tags = tag; // Mongoose busca automáticamente dentro del array
    }

    // 3. Ejecutamos la consulta con paginación
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 }) // Los más nuevos primero
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // 4. Contamos el total para que el front sepa si hay más
    const totalBlogs = await Blog.countDocuments(query);
    const hasMore = Number(page) * Number(limit) < totalBlogs;

    res.status(200).json({
      blogs,
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
    const blogDeleted = await Blog.findByIdAndDelete(id);

    if (blogDeleted) {
      revalidateWeb("get-blogs");
      revalidateWeb(`blog-${blogDeleted.slug}`);
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

module.exports = {
  createBlog,
  updateBlog,
  getBlogs,
  getPaginatedBlogs,
  deleteBlog,
  getBlogDetails,
  getRelatedBlogs,
};
