const { ObjectId } = require("mongodb");
const { deleteImage } = require("../middlewares/file.middleware");
const MarketingCampaign = require("../models/marketingCampaing.model");
const Contact = require("../models/contact.model");

const marketingCampaignsGetAll = async (req, res, next) => {
  try {
    const marketingCampaings = await MarketingCampaign.find()
      .sort({ createdAt: -1 })
      .populate({ path: "consultant", select: "fullName" })
      .populate({
        path: "contactList",
        select:
          "fullName email contactMobileNumber contactPhoneNumber contactDirection",
      });
    return res.status(200).json(marketingCampaings);
  } catch (err) {
    return next(err);
  }
};
const marketingCampaignsFilterByTags = async (req, res, next) => {
  try {
    // Obtener los tags seleccionados desde la consulta (query params)
    const { tags } = req.query; // Suponiendo que 'tags' es un array de IDs de tags

    // Si no se proporcionan tags, devolver todas las campañas
    if (!tags || tags.length === 0) {
      const marketingCampaigns = await MarketingCampaign.find()
        .sort({ createdAt: -1 })
        .populate({ path: "consultant", select: "fullName" })
        .populate({
          path: "contactList",
          select:
            "fullName email contactMobileNumber contactPhoneNumber contactDirection",
        });
      return res.status(200).json(marketingCampaigns);
    }

    // Filtrar las campañas por los tags proporcionados
    const marketingCampaigns = await MarketingCampaign.find({
      tags: { $in: tags }, // Filtrar las campañas cuyo array 'tags' contenga al menos uno de los tags proporcionados
    })
      .sort({ createdAt: -1 })
      .populate({ path: "consultant", select: "fullName" })
      .populate({
        path: "contactList",
        select:
          "fullName email contactMobileNumber contactPhoneNumber contactDirection",
      });

    return res.status(200).json(marketingCampaigns);
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignGetOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const marketingCampaing = await MarketingCampaign.findById(id)
      .populate({ path: "consultant", select: "fullName" })
      .populate({
        path: "contactList",
        select:
          "fullName email contactMobileNumber contactPhoneNumber contactDirection",
      });
    return res.status(200).json(marketingCampaing);
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignGetAllByContact = async (req, res, next) => {
  try {
    const { idContact } = req.params;
    const marketingCampaings = await MarketingCampaign.find({
      contactList: { $in: idContact },
    })
      .populate({ path: "consultant", select: "fullName" })
      .populate({
        path: "contactList",
        select:
          "fullName email contactMobileNumber contactPhoneNumber contactDirection",
      });
    return res.status(200).json(marketingCampaings);
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignCreate = async (req, res, next) => {
  try {
    const { title, description, consultant } = req.body;

    if (req.file) {
      const newMarketingCampaign = new MarketingCampaign({
        title,
        image: req.file.location,
        description,
        contactList: [],
        consultant,
      });

      const marketingCampaignCreated = await newMarketingCampaign.save();

      return res.status(200).json(marketingCampaignCreated);
    } else {
      return res.status(400).json({ status: 400, message: "Missing file" });
    }
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignUpdate = async (req, res, next) => {
  try {
    const { title, description, consultant } = req.body;
    const { idCampaign } = req.params;
    const marketingCampaing = await MarketingCampaign.findById(idCampaign);
    const fieldsToUpdate = marketingCampaing;
    if (marketingCampaing !== null) {
      if (req.file) {
        deleteImage(fieldsToUpdate?.image);
        fieldsToUpdate.image = req.file.location;
      }
      fieldsToUpdate.title = title;
      fieldsToUpdate.description = description;
      fieldsToUpdate.consultant = consultant;

      const contactUpdated = await MarketingCampaign.findByIdAndUpdate(
        idCampaign,
        fieldsToUpdate,
        { new: true }
      );

      return res.status(200).json(contactUpdated);
    } else {
      return res
        .status(404)
        .json({ status: 404, message: "Campaign not found" });
    }
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignSendEmail = async (req, res, next) => {
  try {
    const { sendMail } = req;
    // console.log("envio de email:", sendMail);
    if (sendMail === "ok") {
      const { campaign, contacts } = req.body;
      let editCampaign = {};
      let editContact = {};
      // 1. Buscar en la campaña y escribir los contactos
      const marketingCampaign = await MarketingCampaign.findById(campaign._id);
      if (marketingCampaign !== null) {
        const updateMarketingCampaign = marketingCampaign;
        let filterContact = [];

        if (marketingCampaign.contactList.length === 0) {
          filterContact = contacts.map((contact) => contact._id);
        } else {
          const contactsId = contacts.map((c) => c._id);
          //   console.log("contactID", contactsId);
          const listString = marketingCampaign.contactList.map((objId) =>
            objId.toString()
          );
          filterContact = contactsId.filter(
            (value) => !listString.includes(value)
          );
        }
        // console.log("contactos filtrados", filterContact);
        const newContactList =
          updateMarketingCampaign.contactList.concat(filterContact);
        updateMarketingCampaign.contactList = newContactList;
        // console.log("actualizado2:", updateMarketingCampaign);
        const campaignUpdated = await MarketingCampaign.findByIdAndUpdate(
          campaign._id,
          updateMarketingCampaign,
          { new: true }
        );
        editCampaign = campaignUpdated;

        // 2. Buscar en cada contacto e inscribir la campaña
        contacts.map(async (contact) => {
          const contactDB = await Contact.findById(contact._id);
          if (contactDB !== null) {
            const updateContact = contactDB;
            let filterCampaigns = [];
            const { marketingCampaings } = updateContact;
            if (marketingCampaings === undefined) {
              updateContact.marketingCampaings = [];
            } else {
              updateContact.marketingCampaings = marketingCampaings;
            }
            const contactsCampaignsString =
              updateContact.marketingCampaings.map((objId) => objId.toString());
            filterCampaigns = [campaign._id].filter(
              (value) => !contactsCampaignsString.includes(value)
            );
            // console.log("filterCampaigns:", filterCampaigns);
            // console.log("current campaigns:", updateContact.marketingCampaings);
            const newCampaignList =
              updateContact.marketingCampaings.concat(filterCampaigns);
            updateContact.marketingCampaings = newCampaignList;
            // console.log("actualizado2:", updateMarketingCampaign);
            const contactUpdated = await Contact.findByIdAndUpdate(
              contact._id,
              updateContact,
              { new: true }
            );
            editContact = contactUpdated;
          }
        });
        return res.status(200).json({ editCampaign, editContact });
      } else {
        return res
          .status(500)
          .json({ status: 500, message: "Fail to send emails" });
      }
    }

    // introducir en el modelo de la campaña los contactos a los que se les ha enviado
    // hacer lo mismo en el modelo de los contactos
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
    const contactUpdated = await MarketingCampaign.findByIdAndUpdate(
      req.body.contact._id,
      newReceivedEmails,
      { new: true }
    );

    return res.status(200);
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignDelete = async (req, res, next) => {
  try {
    const { idCampaign, imageCampaign } = req.params;
    const { toDelete } = req.body;

    deleteImage(toDelete);

    const deleted = await MarketingCampaign.findByIdAndDelete(idCampaign);
    if (deleted)
      return res
        .status(200)
        .json({ status: 200, message: "Campaña borrada de la base de datos." });
    else
      return res.status(404).json({
        status: 404,
        message:
          "No se ha podido encontrar esta campaña. ¿Estás seguro de que existe?",
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  marketingCampaignsGetAll,
  marketingCampaignGetOne,
  marketingCampaignGetAllByContact,
  marketingCampaignCreate,
  marketingCampaignUpdate,
  marketingCampaignSendEmail,
  marketingCampaignDelete,
};
