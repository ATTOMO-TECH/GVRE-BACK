const express = require("express");
const { upload } = require("../middlewares/file.middleware");
const {
  getAllOffices,
  createOffice,
  updateOffice,
  deleteOffice,
} = require("../controllers/web.controller");

const router = express.Router();

router.get("/getAll", getAllOffices);
router.post("/create", [upload.single("image")], createOffice);
router.patch("/update/:id", [upload.single("image")], updateOffice);
router.delete("/delete/:id", deleteOffice);

module.exports = router;
