const express = require("express");
const { upload } = require("../middlewares/file.middleware");
const {
  createBlog,
  updateBlog,
  getBlogs,
  getPaginatedBlogs,
  deleteBlog,
  getBlogDetails,
  getRelatedBlogs,
  getDistinctTags,
} = require("../controllers/blog.controller");

const {
  extractTranslationsInput,
} = require("../middlewares/translations.middleware");

const router = express.Router();

router.post(
  "/create",
  [upload.single("image"), extractTranslationsInput],
  createBlog,
);
router.patch(
  "/update/:id",
  [upload.single("image"), extractTranslationsInput],
  updateBlog,
);
router.get("/getAll", getBlogs);
router.get("/getAllPaginated", getPaginatedBlogs);
router.delete("/delete/:id", deleteBlog);
router.get("/getDetails/:slug", getBlogDetails);
router.get("/getRelated", getRelatedBlogs);
router.get("/getTags", getDistinctTags);

module.exports = router;
