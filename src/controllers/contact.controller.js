const Contact = require("./../models/contact.model");
const Consultant = require("../models/consultant.model");
const Ad = require("../models/ad.model");
const Request = require("../models/request.model");

const contactGetAll = async (req, res, next) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .populate({ path: "consultant", select: "fullName" })
      .populate("tags");

    return res.status(200).json(contacts);
  } catch (err) {
    return next(err);
  }
};

const contactGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id)
      .populate({
        path: "receivedEmails",
        populate: {
          path: "ad",
          select: "createdAt title adDirection images.main",
        },
      })
      .populate({
        path: "marketingCampaings",
      });
    return res.status(200).json(contact);
  } catch (err) {
    return next(err);
  }
};

const contactFindByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const contact = await Contact.find({ email: email });
    return res.status(200).json(contact);
  } catch (err) {
    return next(err);
  }
};

const contactFindByContactMobileNumber = async (req, res, next) => {
  try {
    const { contactMobileNumber } = req.params;
    const contact = await Contact.find({
      contactMobileNumber: contactMobileNumber,
    });
    return res.status(200).json(contact);
  } catch (err) {
    return next(err);
  }
};

const contactFindByFullName = async (req, res, next) => {
  try {
    const { fullName } = req.params;
    const contact = await Contact.find({ fullName: fullName });
    return res.status(200).json(contact);
  } catch (err) {
    return next(err);
  }
};

const contactGetOwners = async (req, res, next) => {
  try {
    const owners = await Contact.find({ tag: "Propietario" });
    return res.status(200).json(owners);
  } catch (err) {
    return next(err);
  }
};

const contactGetAllByEmailNotificationsTrue = async (req, res, next) => {
  try {
    let {
      tags,
      contactTypes,
      typeOperator,
      tagsOperator,
      globalSearch,
      consultantIds,
      page = 1,
      limit = 10,
      adZones,
      reqZones,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { notReceiveCommunications: false };

    // 1. FILTRADO DIFERENCIADO POR ZONAS
    let zoneConditions = [];

    if (adZones) {
      const adZonesArray = adZones.split(",").filter((id) => id.trim() !== "");
      if (adZonesArray.length > 0) {
        const contactsWithAds = await Ad.find({
          zone: { $in: adZonesArray },
        }).distinct("owner");
        zoneConditions.push({ _id: { $in: contactsWithAds } });
      }
    }

    if (reqZones) {
      const reqZonesArray = reqZones
        .split(",")
        .filter((id) => id.trim() !== "");
      if (reqZonesArray.length > 0) {
        const contactsWithReqs = await Request.find({
          requestZone: { $in: reqZonesArray },
        }).distinct("requestContact");
        zoneConditions.push({ _id: { $in: contactsWithReqs } });
      }
    }

    if (zoneConditions.length > 0) {
      query.$and = query.$and
        ? [...query.$and, { $or: zoneConditions }]
        : [{ $or: zoneConditions }];
    }

    // 2. Filtros de Tags, Tipos y Consultores
    if (tags) {
      const tagsArray = tags.split(",").filter((id) => id.trim() !== "");
      if (tagsArray.length > 0) {
        query.tags =
          tagsOperator === "and" ? { $all: tagsArray } : { $in: tagsArray };
      }
    }

    if (contactTypes) {
      const typesArray = contactTypes.split(",");
      if (typesArray.length > 0) {
        query.tag =
          typeOperator === "and" ? { $all: typesArray } : { $in: typesArray };
      }
    }

    if (consultantIds) {
      const consultantsArray = consultantIds
        .split(",")
        .filter((id) => id.trim() !== "");
      if (consultantsArray.length > 0) {
        query.consultant = { $in: consultantsArray };
      }
    }

    // 3. Búsqueda Global
    if (globalSearch) {
      const matchingConsultants = await Consultant.find({
        $or: [
          { fullName: { $regex: globalSearch, $options: "i" } },
          { consultantEmail: { $regex: globalSearch, $options: "i" } },
        ],
      }).select("_id");

      const searchConsultantIds = matchingConsultants.map((c) => c._id);
      query.$or = [
        { fullName: { $regex: globalSearch, $options: "i" } },
        { email: { $regex: globalSearch, $options: "i" } },
        { company: { $regex: globalSearch, $options: "i" } },
        { consultant: { $in: searchConsultantIds } },
      ];
    }

    // 4. Ejecución de Query Principal
    const [contacts, totalRecords] = await Promise.all([
      Contact.find(query)
        .populate("tags")
        .populate("consultant", "fullName consultantEmail")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Contact.countDocuments(query),
    ]);

    // 5. INYECCIÓN DE ZONAS DIFERENCIADAS (Con mapeo de Labels)
    const contactIds = contacts.map((c) => c._id);
    const [allAds, allReqs] = await Promise.all([
      // IMPORTANTE: Añadimos "zone" al populate para traer el label técnico de la DB
      Ad.find({ owner: { $in: contactIds } }).populate("zone", "name zone"),
      Request.find({ requestContact: { $in: contactIds } }).populate(
        "requestZone",
        "name zone",
      ),
    ]);

    const contactsWithZones = contacts.map((contact) => {
      const contactObj = contact.toObject();

      const zonesFromAds = allAds
        .filter((ad) => ad.owner?.toString() === contact._id.toString())
        .flatMap((ad) => {
          if (!ad.zone) return [];
          // Si es un array de zonas lo normalizamos, si no, creamos el objeto con 'label'
          const zoneData = Array.isArray(ad.zone) ? ad.zone : [ad.zone];
          return zoneData.map((z) => ({
            _id: z._id,
            name: z.name,
            label: z.zone || "Others", // Mapeamos el campo 'zone' de la DB a 'label' para el front
          }));
        });

      const zonesFromReqs = allReqs
        .filter(
          (req) => req.requestContact?.toString() === contact._id.toString(),
        )
        .flatMap((req) => {
          if (!req.requestZone) return [];
          const zoneData = Array.isArray(req.requestZone)
            ? req.requestZone
            : [req.requestZone];
          return zoneData.map((z) => ({
            _id: z._id,
            name: z.name,
            label: z.zone || "Others",
          }));
        });

      // Eliminamos duplicados por ID de zona
      contactObj.adZones = Array.from(
        new Map(zonesFromAds.map((z) => [z._id.toString(), z])).values(),
      );

      contactObj.requestZones = Array.from(
        new Map(zonesFromReqs.map((z) => [z._id.toString(), z])).values(),
      );

      return contactObj;
    });

    return res.status(200).json({
      contacts: contactsWithZones,
      totalRecords,
      currentPage: pageNum,
      totalPages: Math.ceil(totalRecords / limitNum),
    });
  } catch (err) {
    return next(err);
  }
};

const contactGetIdsByFilters = async (req, res, next) => {
  try {
    let {
      tags,
      contactTypes,
      typeOperator,
      globalSearch,
      consultantIds,
      adZones, // Cambiado
      reqZones, // Nuevo
    } = req.query;

    let query = { notReceiveCommunications: false };

    // --- FILTRO DE ZONAS DIFERENCIADO (Búsqueda Inversa) ---
    let zoneConditions = [];

    if (adZones) {
      const adZonesArray = adZones.split(",").filter((id) => id.trim() !== "");
      if (adZonesArray.length > 0) {
        const contactsWithAds = await Ad.find({
          zone: { $in: adZonesArray },
        }).distinct("owner");
        zoneConditions.push({ _id: { $in: contactsWithAds } });
      }
    }

    if (reqZones) {
      const reqZonesArray = reqZones
        .split(",")
        .filter((id) => id.trim() !== "");
      if (reqZonesArray.length > 0) {
        const contactsWithReqs = await Request.find({
          requestZone: { $in: reqZonesArray },
        }).distinct("requestContact");
        zoneConditions.push({ _id: { $in: contactsWithReqs } });
      }
    }

    // Aplicar lógica inclusiva ($or) entre filtros de zona
    if (zoneConditions.length > 0) {
      query.$and = query.$and
        ? [...query.$and, { $or: zoneConditions }]
        : [{ $or: zoneConditions }];
    }

    // --- RESTO DE FILTROS (Mantenemos tu lógica) ---
    if (tags) {
      const tagsArray = tags.split(",").filter((id) => id.trim() !== "");
      if (tagsArray.length > 0) {
        query.tags = { $in: tagsArray };
      }
    }

    if (contactTypes) {
      const typesArray = contactTypes.split(",");
      if (typesArray.length > 0) {
        if (typeOperator === "and") {
          query.tag = { $all: typesArray };
        } else {
          query.tag = { $in: typesArray };
        }
      }
    }

    if (consultantIds) {
      const consultantsArray = consultantIds
        .split(",")
        .filter((id) => id.trim() !== "");
      if (consultantsArray.length > 0) {
        query.consultant = { $in: consultantsArray };
      }
    }

    if (globalSearch) {
      const matchingConsultants = await Consultant.find({
        $or: [
          { fullName: { $regex: globalSearch, $options: "i" } },
          { consultantEmail: { $regex: globalSearch, $options: "i" } },
        ],
      }).select("_id");

      const searchConsultantIds = matchingConsultants.map((c) => c._id);
      query.$or = [
        { fullName: { $regex: globalSearch, $options: "i" } },
        { email: { $regex: globalSearch, $options: "i" } },
        { company: { $regex: globalSearch, $options: "i" } },
        { consultant: { $in: searchConsultantIds } },
      ];
    }

    const contacts = await Contact.find(query).select("_id");
    return res.status(200).json(contacts);
  } catch (err) {
    return next(err);
  }
};

const contactCreate = async (req, res, next) => {
  try {
    const contactDirection = {
      address: {
        street: req.body.street ? req.body.street : "",
        directionNumber: req.body.directionNumber
          ? req.body.directionNumber
          : "",
        directionFloor: req.body.directionFloor ? req.body.directionFloor : "",
      },
      postalCode: req.body.postalCode,
      city: req.body.city,
      country: req.body.country,
    };

    const newContact = new Contact({
      fullName: req.body.fullName,
      tag: req.body.tag,
      email: req.body.email,
      contactMobileNumber: req.body.contactMobileNumber,
      contactPhoneNumber: req.body.contactPhoneNumber,
      company: req.body.company,
      contactDirection,
      contactComments: req.body.contactComments,
      notReceiveCommunications: req.body.notReceiveCommunications,
      consultant: req.body.consultant,
    });

    const contactCreated = await newContact.save();

    return res.status(200).json(contactCreated);
  } catch (err) {
    return next(err);
  }
};

const contactUpdate = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};

    fieldsToUpdate.fullName = req.body.fullName;
    fieldsToUpdate.tag = req.body.tag;
    fieldsToUpdate.email = req.body.email;
    fieldsToUpdate.contactMobileNumber = req.body.contactMobileNumber;
    fieldsToUpdate.contactPhoneNumber = req.body.contactPhoneNumber;
    fieldsToUpdate.contactComments = req.body.contactComments;
    fieldsToUpdate.company = req.body.company;
    fieldsToUpdate.notReceiveCommunications = req.body.notReceiveCommunications;
    fieldsToUpdate.contactDirection = {
      address: {
        street: req.body.street,
        directionNumber: req.body.directionNumber,
        directionFloor: req.body.directionFloor,
      },
      postalCode: req.body.postalCode,
      city: req.body.city,
      country: req.body.country,
    };
    fieldsToUpdate.tags = req.body.tags;

    const contactUpdated = await Contact.findByIdAndUpdate(
      req.body.id,
      fieldsToUpdate,
      { new: true },
    );

    return res.status(200).json(contactUpdated);
  } catch (err) {
    return next(err);
  }
};

const contactReceiveEmail = async (req, res, next) => {
  try {
    const newReceivedEmails = {
      $push: {
        receivedEmails: {
          sendDate: Date.now(),
          consultant: req.body.consultant._id,
          ad: req.body.ad._id,
        },
      },
    };
    const contactUpdated = await Contact.findByIdAndUpdate(
      req.body.contact._id,
      newReceivedEmails,
      { new: true },
    );

    return res.status(200).json({ message: "Registro actualizado" });
  } catch (err) {
    return next(err);
  }
};

const contactDelete = async (req, res, next) => {
  try {
    const { id } = req.params;
    let response = "";

    const deleted = await Contact.findByIdAndDelete(id);
    if (deleted) response = "Contacto borrado de la base de datos";
    else
      response =
        "No se ha podido encontrar este contact. ¿Estás seguro de que existe?";

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  contactGetAll,
  contactGetOne,
  contactFindByFullName,
  contactFindByContactMobileNumber,
  contactFindByEmail,
  contactGetOwners,
  contactGetAllByEmailNotificationsTrue,
  contactCreate,
  contactUpdate,
  contactReceiveEmail,
  contactDelete,
  contactGetIdsByFilters,
};
