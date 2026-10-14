const mongoose = require("mongoose");
const ListingFaq = require("../models/listingFaq.model");
const Zone = require("../models/zone.model");
const { revalidateWeb } = require("../utils/revalidateWeb");
const {
  ListingFaqInputError,
  parsePageKey,
  parseFaqContent,
  toPageFilter,
} = require("../listingFaqs/pageKey");

// Etiqueta de caché de la web para las FAQs de los listados
const WEB_CACHE_TAG = "listing-faqs";

const SORT = { order: 1, createdAt: 1 };
const PUBLIC_FIELDS = "department city zone operation question answer order";

const sendInputError = (res, err) => res.status(400).json({ message: err.message });

// El barrio tiene que existir como zona (su `slug` es el de la URL)
const assertZoneExists = async (zone) => {
  if (zone && !(await Zone.exists({ slug: zone }))) {
    throw new ListingFaqInputError(`No existe ninguna zona con el slug "${zone}"`);
  }
};

const findFaqOr404 = async (id, res) => {
  const faq = mongoose.isValidObjectId(id) ? await ListingFaq.findById(id) : null;
  if (!faq) res.status(404).json({ message: "FAQ no encontrada" });
  return faq;
};

// Vuelve a numerar las FAQs de una página (0, 1, 2...) en el orden actual
const compactOrder = async (pageFilter) => {
  const faqs = await ListingFaq.find(pageFilter).sort(SORT).select("_id");
  if (faqs.length === 0) return;

  await ListingFaq.bulkWrite(
    faqs.map(({ _id }, order) => ({
      updateOne: { filter: { _id }, update: { $set: { order } } },
    })),
  );
};

// GET /listing-faqs?department=&city=&zone=&operation=
// FAQs de una página, en orden. Lo usan la web y el CRM.
const getPageFaqs = async (req, res, next) => {
  try {
    const page = parsePageKey(req.query);
    const faqs = await ListingFaq.find(toPageFilter(page))
      .sort(SORT)
      .select(PUBLIC_FIELDS)
      .lean();

    return res.status(200).json({ faqs });
  } catch (err) {
    if (err instanceof ListingFaqInputError) return sendInputError(res, err);
    return next(err);
  }
};

// GET /listing-faqs/pages
// Páginas que ya tienen FAQs, con cuántas tiene cada una (resumen del CRM)
const getPagesWithFaqs = async (req, res, next) => {
  try {
    const pages = await ListingFaq.aggregate([
      {
        $group: {
          _id: {
            department: "$department",
            city: "$city",
            zone: "$zone",
            operation: "$operation",
          },
          count: { $sum: 1 },
          updatedAt: { $max: "$updatedAt" },
        },
      },
      {
        $sort: {
          "_id.department": 1,
          "_id.city": 1,
          "_id.zone": 1,
          "_id.operation": 1,
        },
      },
    ]);

    return res.status(200).json({
      pages: pages.map(({ _id, count, updatedAt }) => ({
        ..._id,
        count,
        updatedAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

// POST /listing-faqs  { department, city, zone, operation, question, answer }
// Añade la FAQ al final de su página
const createFaq = async (req, res, next) => {
  try {
    const page = parsePageKey(req.body);
    const content = parseFaqContent(req.body);
    await assertZoneExists(page.zone);

    const last = await ListingFaq.findOne(toPageFilter(page))
      .sort({ order: -1 })
      .select("order")
      .lean();

    const faq = await ListingFaq.create({
      ...page,
      ...content,
      order: last ? last.order + 1 : 0,
    });

    await revalidateWeb([WEB_CACHE_TAG]);
    return res.status(201).json({ faq });
  } catch (err) {
    if (err instanceof ListingFaqInputError) return sendInputError(res, err);
    return next(err);
  }
};

// PUT /listing-faqs/:id  { question, answer }
// La página de una FAQ no cambia: para moverla se borra y se crea en la otra
const updateFaq = async (req, res, next) => {
  try {
    const content = parseFaqContent(req.body);
    const faq = await findFaqOr404(req.params.id, res);
    if (!faq) return undefined;

    faq.set(content);
    await faq.save();

    await revalidateWeb([WEB_CACHE_TAG]);
    return res.status(200).json({ faq });
  } catch (err) {
    if (err instanceof ListingFaqInputError) return sendInputError(res, err);
    return next(err);
  }
};

// DELETE /listing-faqs/:id
const deleteFaq = async (req, res, next) => {
  try {
    const faq = await findFaqOr404(req.params.id, res);
    if (!faq) return undefined;

    await faq.deleteOne();
    await compactOrder(toPageFilter(faq));

    await revalidateWeb([WEB_CACHE_TAG]);
    return res.status(200).json({ deleted: faq._id });
  } catch (err) {
    return next(err);
  }
};

// PUT /listing-faqs/reorder  { department, city, zone, operation, ids: [...] }
// `ids` son todas las FAQs de la página en el orden nuevo
const reorderFaqs = async (req, res, next) => {
  try {
    const page = parsePageKey(req.body);
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : null;
    if (!ids) throw new ListingFaqInputError("Falta la lista de FAQs (ids)");

    const current = await ListingFaq.find(toPageFilter(page)).select("_id").lean();
    const currentIds = new Set(current.map(({ _id }) => String(_id)));
    const sameSet =
      ids.length === currentIds.size &&
      new Set(ids).size === ids.length &&
      ids.every((id) => currentIds.has(id));

    if (!sameSet) {
      throw new ListingFaqInputError(
        "La lista tiene que incluir todas las FAQs de la página, una sola vez",
      );
    }

    await ListingFaq.bulkWrite(
      ids.map((id, order) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order } } },
      })),
    );

    await revalidateWeb([WEB_CACHE_TAG]);
    const faqs = await ListingFaq.find(toPageFilter(page)).sort(SORT).lean();
    return res.status(200).json({ faqs });
  } catch (err) {
    if (err instanceof ListingFaqInputError) return sendInputError(res, err);
    return next(err);
  }
};

module.exports = {
  getPageFaqs,
  getPagesWithFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  reorderFaqs,
};
