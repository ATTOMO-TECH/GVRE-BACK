const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

const { S3_ENDPOINT, BUCKET_NAME } = process.env;

const spacesEndpoint = new aws.Endpoint(S3_ENDPOINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint.host,
  region: "eu-central-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const VALID_FILE_TYPES = ["image/png", "image/jpg", "image/jpeg", "video/mp4"];

const ImageFilter = (req, file, cb) => {
  if (!VALID_FILE_TYPES.includes(file.mimetype)) {
    const error = new Error("Tipo de archivo inválido. Solo png y jpg");
    cb(error);
  } else {
    cb(null, true);
  }
};

const FileFilter = (req, data, cb) => {
  try {
    // if (!VALID_FILE_TYPES.includes(data.mimetype)) {
    cb(null, true);
    // }
    // else {
    //   const error = new Error(
    //     "Tipo de archivo inválido. No se admiten imágenes"
    //   );
    //   cb(error);
    // }
  } catch (err) {
    console.log("holi", err);
  }
};

const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET_NAME,
    acl: "public-read",
    metadata: (req, file, cb) => {
      cb(null, {
        fieldname: file.fieldname,
      });
    },
    key: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  ImageFilter,
});

const uploadFiles = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET_NAME,
    acl: "public-read",
    metadata: (req, data, cb) => {
      cb(null, {
        fieldname: data.fieldname,
      });
    },
    key: (req, data, cb) => {
      cb(null, `${Date.now()}-${data.originalname.replace(" ", "-")}`);
    },
  }),
  FileFilter,
});

const deleteImage = (req, res) => {
  let key = req.substring(48);

  const params = {
    Bucket: BUCKET_NAME,
    Key: decodeURI(key),
  };

  s3.deleteObject(params, function (err, data) {
    if (err) {
      return err;
    }
  });
};

module.exports = { upload, uploadFiles, s3, deleteImage };
