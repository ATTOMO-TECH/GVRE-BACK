const { deleteImage } = require("../middlewares/file.middleware");
const MarketingCampaign = require("../models/marketingCampaing.model");
const Contact = require("../models/contact.model");
const CampaignSend = require("../models/campaignSend.model");

const marketingCampaignsGetAll = async (req, res, next) => {
  try {
    // contactList no se devuelve: el CRM no lo usa en los listados y puede
    // contener miles de contactos por campaña
    const marketingCampaings = await MarketingCampaign.find()
      .select("-contactList")
      .sort({ createdAt: -1 })
      .populate({ path: "consultant", select: "fullName" });
    return res.status(200).json(marketingCampaings);
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignsFilterByTags = async (req, res, next) => {
  try {
    const { tags } = req.query;

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

    const marketingCampaigns = await MarketingCampaign.find({
      tags: { $in: tags },
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
    const { title, htmlBody, design, consultant } = req.body;

    if (htmlBody) {
      const newMarketingCampaign = new MarketingCampaign({
        title,
        htmlBody,
        design,
        contactList: [],
        consultant,
      });

      const marketingCampaignCreated = await newMarketingCampaign.save();
      return res.status(200).json(marketingCampaignCreated);
    } else {
      return res
        .status(400)
        .json({ status: 400, message: "El diseño de la campaña está vacío" });
    }
  } catch (err) {
    console.error("Error al guardar plantilla:", err);
    return next(err);
  }
};

const marketingCampaignUpdate = async (req, res, next) => {
  try {
    const { title, htmlBody, design } = req.body;
    const { idCampaign } = req.params;

    const fieldsToUpdate = { title, htmlBody, design };

    const campaignUpdated = await MarketingCampaign.findByIdAndUpdate(
      idCampaign,
      fieldsToUpdate,
      { new: true },
    );

    if (campaignUpdated) {
      return res.status(200).json(campaignUpdated);
    } else {
      return res
        .status(404)
        .json({ status: 404, message: "Campaign not found" });
    }
  } catch (err) {
    console.error("Error al actualizar la campaña:", err);
    return next(err);
  }
};

const marketingCampaignSendStatus = async (req, res, next) => {
  try {
    const { idSend } = req.params;
    const campaignSend =
      await CampaignSend.findById(idSend).select("-sentContacts");

    if (campaignSend === null) {
      return res.status(404).json({ status: 404, message: "Send not found" });
    }

    return res.status(200).json({ send: campaignSend.toSummary() });
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

    // CORRECCIÓN: Cambiado de MarketingCampaign a Contact
    const contactUpdated = await Contact.findByIdAndUpdate(
      req.body.contact._id,
      newReceivedEmails,
      { new: true },
    );

    return res.status(200).json(contactUpdated);
  } catch (err) {
    return next(err);
  }
};

const marketingCampaignDelete = async (req, res, next) => {
  try {
    const { idCampaign } = req.params;
    const { toDelete } = req.body;

    if (toDelete) {
      // CORRECCIÓN: Blindamos el borrado por si S3 falla
      try {
        await deleteImage(toDelete);
      } catch (e) {
        console.error(
          "Aviso: Falló el borrado de la imagen asociada a la campaña en S3",
          e,
        );
      }
    }

    const deleted = await MarketingCampaign.findByIdAndDelete(idCampaign);

    if (deleted) {
      return res
        .status(200)
        .json({ status: 200, message: "Campaña borrada de la base de datos." });
    } else {
      return res.status(404).json({
        status: 404,
        message:
          "No se ha podido encontrar esta campaña. ¿Estás seguro de que existe?",
      });
    }
  } catch (error) {
    console.error("Error al borrar la campaña:", error);
    next(error);
  }
};

module.exports = {
  marketingCampaignsGetAll,
  marketingCampaignsFilterByTags, // Faltaba exportar
  marketingCampaignGetOne,
  marketingCampaignGetAllByContact,
  marketingCampaignCreate,
  marketingCampaignUpdate,
  marketingCampaignSendStatus,
  contactReceiveEmail, // Faltaba exportar
  marketingCampaignDelete,
};
