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

const router = express.Router();

router.post("/create", [upload.single("image")], createBlog);
router.patch("/update/:id", [upload.single("image")], updateBlog);
router.get("/getAll", getBlogs);
router.get("/getAllPaginated", getPaginatedBlogs);
router.delete("/delete/:id", deleteBlog);
router.get("/getDetails/:slug", getBlogDetails);
router.get("/getRelated", getRelatedBlogs);
router.get("/getTags", getDistinctTags);

module.exports = router;
