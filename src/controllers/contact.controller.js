const Contact = require("./../models/contact.model");

const contactGetAll = async (req, res, next) => {
  try {
    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .populate({ path: "consultant", select: "fullName" });

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
    const contact = await Contact.find({ notReceiveCommunications: false });
    return res.status(200).json(contact);
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

    const contactUpdated = await Contact.findByIdAndUpdate(
      req.body.id,
      fieldsToUpdate,
      { new: true }
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
      { new: true }
    );

    return res.status(200);
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
};
