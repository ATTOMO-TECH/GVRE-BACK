const express = require("express");
const {
  createTag,
  deleteTag,
  getAllTags,
} = require("../controllers/tag.controller");

const router = express.Router();
router.post("/create", createTag);
router.get("/getall", getAllTags);
router.delete("/delete/:id", deleteTag);
module.exports = router;
