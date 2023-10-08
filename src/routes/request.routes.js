const express = require("express");
const { isAuth, isAdmin } = require("../middlewares/auth.middleware");
const {
  requestsGetAll,
  requestsGetByFilters,
  requestGetOne,
  allRequestGetByIdConsultant,
  requestLastReference,
  requestGetAdsMatched,
  requestGetNewMatched,
  requestGetByContact,
  requestCreate,
  requestUpdate,
  requyestsUpdateManyConsultantByConsultantId,
  requestDelete,
} = require("../controllers/request.controller");

const router = express.Router();

// router.get("/", isAuth, requestsGetAll);
// router.get("/filter/:query", requestsGetByFilters);
// router.get("/lastReference", isAuth, requestLastReference);
// router.get("/matching/:id", isAuth, requestGetAdsMatched);
// router.get("/contact/:id", isAuth, requestGetByContact);
// router.get("/:id", isAuth, requestGetOne);
// router.get("/consultant/:consultantId", isAuth, allRequestGetByIdConsultant);

// router.post("/create", isAuth, requestCreate);
// router.post("/matching/new", isAuth, requestGetNewMatched);
// router.put("/edit", isAuth, requestUpdate);
// router.put(
//   "/editmanyconsultant/:currentConsultant",
//   isAuth,
//   requyestsUpdateManyConsultantByConsultantId
// );

// router.delete("/delete/:id", isAuth, requestDelete);

router.get("/", requestsGetAll);
router.get("/filter/:query", requestsGetByFilters);
router.get("/lastReference", requestLastReference);
router.get("/matching/:id", requestGetAdsMatched);
router.get("/contact/:id", requestGetByContact);
router.get("/:id", requestGetOne);
router.get("/consultant/:consultantId", allRequestGetByIdConsultant);

router.post("/create", requestCreate);
router.post("/matching/new", requestGetNewMatched);
router.put("/edit", requestUpdate);
router.put(
  "/editmanyconsultant/:currentConsultant",
  requyestsUpdateManyConsultantByConsultantId
);

router.delete("/delete/:id", requestDelete);

module.exports = router;
