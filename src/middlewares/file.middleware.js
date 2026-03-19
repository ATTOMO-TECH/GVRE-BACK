const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

const sanitizeFilename = (filename) => {
  const fileExtension = path.extname(filename);
  const baseName = path.basename(filename, fileExtension);

  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

  return sanitizedBaseName + fileExtension;
};

const { S3_ENDPOINT, BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } =
  process.env;

const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: "eu-central-1",
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const VALID_FILE_TYPES = ["image/png", "image/jpg", "image/jpeg", "video/mp4"];

const ImageFilter = (req, file, cb) => {
  if (!VALID_FILE_TYPES.includes(file.mimetype)) {
    // CORRECCIÓN: Mensaje actualizado para coincidir con los tipos válidos
    const error = new Error(
      "Tipo de archivo inválido. Solo se admiten imágenes (png, jpg, jpeg) y videos (mp4)",
    );
    cb(error);
  } else {
    cb(null, true);
  }
};

const FileFilter = (req, data, cb) => {
  try {
    cb(null, true);
  } catch (err) {
    console.log(err);
  }
};

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    acl: "public-read",
    metadata: (req, file, cb) => {
      cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
      const sanitizedName = sanitizeFilename(file.originalname);
      const finalKey = `${Date.now()}-${sanitizedName}`;
      cb(null, finalKey);
    },
  }),
  ImageFilter,
});

const uploadFiles = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    acl: "public-read",
    metadata: (req, data, cb) => {
      cb(null, { fieldname: data.fieldname });
    },
    key: (req, data, cb) => {
      // CORRECCIÓN MENOR: Aplico tu misma sanitización aquí para mantener consistencia,
      // en lugar de usar solo un .replace(" ", "-") básico.
      const sanitizedName = sanitizeFilename(data.originalname);
      cb(null, `${Date.now()}-${sanitizedName}`);
    },
  }),
  FileFilter,
});

// --- 2. ELIMINACIÓN DE ARCHIVOS CORREGIDA ---
const deleteImage = async (fileUrl) => {
  try {
    // CORRECCIÓN: Parseamos la URL de forma segura.
    // Extrae "/nombre-del-archivo.jpg" y le quita la primera barra ("/").
    const parsedUrl = new URL(fileUrl);
    let key = parsedUrl.pathname.substring(1);

    // Si tu proveedor S3 pone el nombre del bucket en la ruta (path-style), lo quitamos para quedarnos solo con el Key real
    if (key.startsWith(`${BUCKET_NAME}/`)) {
      key = key.replace(`${BUCKET_NAME}/`, "");
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: decodeURI(key),
    });

    const data = await s3.send(command);
    return data;
  } catch (err) {
    console.error("Error eliminando objeto de S3:", err);
    throw err; // CORRECCIÓN: Lanzamos el error para que tu controlador se entere de que falló
  }
};

module.exports = { upload, uploadFiles, s3, deleteImage };
