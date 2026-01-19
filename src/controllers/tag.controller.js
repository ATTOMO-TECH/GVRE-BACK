const Tag = require("../models/tag.model");

const createTag = async (req, res) => {
  const { name } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const normalizedName = name.trim().toLowerCase();

    const existingTag = await Tag.findOne({ name: normalizedName });

    if (existingTag) {
      return res.status(409).json({ message: "Tag already exists" });
    }

    const newTag = new Tag({
      name: normalizedName,
      active: true,
    });

    await newTag.save();

    res.status(201).json({
      message: "Tag created successfully",
      tag: newTag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Tag ID is required." });
    }

    const deletedTag = await Tag.findByIdAndDelete(id);

    if (!deletedTag) {
      return res.status(404).json({ message: "Tag not found." });
    }

    res.status(200).json({
      message: "Tag deleted successfully.",
      tag: deletedTag,
    });
  } catch (error) {
    console.error("Error deleting tag:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid Tag ID format." });
    }

    res.status(500).json({ message: "Internal server error." });
  }
};

const getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find({});
    if (!tags || tags.length === 0) {
      return res.status(204).json({ message: "No se encontraron etiquetas." });
    }
    res.status(200).json({
      message: "Etiquetas recuperadas exitosamente.",
      tags: tags,
    });
  } catch (error) {
    console.error("Error al obtener todas las etiquetas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

module.exports = { createTag, deleteTag, getAllTags };
