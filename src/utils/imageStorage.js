// Gestión segura de archivos del bucket (DigitalOcean Spaces vía S3).
//
// Varias entidades pueden apuntar al mismo archivo: al copiar un anuncio se
// copiaban solo las URLs, así que original y copia compartían los archivos y
// al borrar las fotos de la copia desaparecían las del original. Aquí:
//   - deleteImages / deleteImage solo borran un archivo si ningún otro
//     documento lo referencia.
//   - copyImage / copyImages duplican el archivo con una clave nueva, para que
//     una copia de anuncio tenga sus propios archivos.
const { DeleteObjectCommand, CopyObjectCommand } = require("@aws-sdk/client-s3");

// Rutas de imagen en los anuncios (colección grande: se consulta por campo)
const AD_IMAGE_PATHS = [
  "images.main",
  "images.media",
  "images.blueprint",
  "images.others",
];

// Colecciones pequeñas con URLs del bucket en campos variados o anidados
// (firmas de consultores, secciones de la home, contenido de blogs...): se
// revisa el documento entero.
const OTHER_IMAGE_COLLECTIONS = [
  "blogs",
  "catalogpages",
  "catalogs",
  "consultants",
  "marketingcampaigns",
  "offices",
  "webhomes",
  "webs",
];

const COPY_CONCURRENCY = 5;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Clave del objeto a partir de su URL (CDN o path-style). null si la URL no es
// de Spaces (por ejemplo, imágenes antiguas de otros proveedores).
const keyFromUrl = (fileUrl, bucket) => {
  if (typeof fileUrl !== "string" || !fileUrl) return null;
  let parsed;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return null;
  }
  if (!parsed.hostname.endsWith("digitaloceanspaces.com")) return null;
  let key = parsed.pathname.substring(1);
  if (bucket && key.startsWith(`${bucket}/`)) key = key.slice(bucket.length + 1);
  if (!key) return null;
  try {
    return decodeURI(key);
  } catch {
    return key;
  }
};

// Variantes con las que la clave puede aparecer escrita en una URL guardada
const keyVariants = (key) => [...new Set([key, encodeURI(key)])];

// Expresión que detecta la clave al final de una URL ("/<clave>")
const keyAtEndRegex = (key) =>
  new RegExp(`/(?:${keyVariants(key).map(escapeRegex).join("|")})$`);

// Expresión que detecta la clave dentro de cualquier texto (JSON, HTML...)
const keyInTextRegex = (key) =>
  new RegExp(
    `/(?:${keyVariants(key).map(escapeRegex).join("|")})(?=$|["'?#\\s)<\\\\])`,
  );

const isIgnored = (doc, ignoreId) =>
  ignoreId != null && String(doc._id) === String(ignoreId);

const adImageUrls = (ad) => {
  const images = ad?.images || {};
  return [
    images.main,
    images.media,
    ...(Array.isArray(images.blueprint) ? images.blueprint : []),
    ...(Array.isArray(images.others) ? images.others : []),
  ].filter((url) => typeof url === "string" && url);
};

// Devuelve el conjunto de claves (de las pedidas) que algún documento, salvo
// el de ignoreId, sigue referenciando.
const findReferencedKeys = async ({ db, keys, bucket, ignoreId }) => {
  const referenced = new Set();
  const pending = new Set(keys);
  if (!pending.size) return referenced;

  const markFound = (key) => {
    referenced.add(key);
    pending.delete(key);
  };

  // 1. Anuncios: consulta por los campos de imagen
  const endRegexes = [...pending].map(keyAtEndRegex);
  const ads = await db
    .collection("ads")
    .find(
      { $or: AD_IMAGE_PATHS.map((p) => ({ [p]: { $in: endRegexes } })) },
      { projection: { images: 1 } },
    )
    .toArray();
  for (const ad of ads) {
    if (isIgnored(ad, ignoreId)) continue;
    for (const url of adImageUrls(ad)) {
      const key = keyFromUrl(url, bucket);
      if (key && pending.has(key)) markFound(key);
    }
  }

  // 2. Resto de colecciones con imágenes: búsqueda en el documento completo
  for (const name of OTHER_IMAGE_COLLECTIONS) {
    if (!pending.size) break;
    const textRegexes = new Map([...pending].map((k) => [k, keyInTextRegex(k)]));
    const cursor = db.collection(name).find({});
    for await (const doc of cursor) {
      if (isIgnored(doc, ignoreId)) continue;
      const text = JSON.stringify(doc);
      for (const [key, regex] of textRegexes) {
        if (pending.has(key) && regex.test(text)) markFound(key);
      }
      if (!pending.size) break;
    }
  }

  return referenced;
};

// Ejecuta fn sobre items con un máximo de `limit` tareas a la vez
const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const createImageStorage = ({
  s3,
  bucket,
  getDb,
  cdnBaseUrl,
  now = () => Date.now(),
  random = () => Math.random().toString(36).slice(2, 8),
  logger = console,
}) => {
  const baseUrl = cdnBaseUrl || `https://${bucket}.fra1.cdn.digitaloceanspaces.com`;

  // Borra del bucket las URLs que ningún otro documento use.
  // options.ignoreId: documento que se está modificando o borrando y que, por
  // tanto, no cuenta como referencia.
  const deleteImages = async (urls, { ignoreId } = {}) => {
    const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    const keys = [
      ...new Set(list.map((url) => keyFromUrl(url, bucket)).filter(Boolean)),
    ];
    const result = { deleted: [], kept: [] };
    if (!keys.length) return result;

    // Si la comprobación falla no se borra nada (se propaga el error)
    const referenced = await findReferencedKeys({
      db: getDb(),
      keys,
      bucket,
      ignoreId,
    });

    for (const key of keys) {
      if (referenced.has(key)) {
        result.kept.push(key);
        logger.info?.(
          `[imageStorage] No se borra "${key}": otro documento lo sigue usando.`,
        );
        continue;
      }
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      result.deleted.push(key);
    }
    return result;
  };

  const deleteImage = (url, options) => deleteImages([url], options);

  // Duplica el archivo con una clave nueva y devuelve su URL pública. Si la URL
  // no es del bucket o la copia falla, devuelve la original (el borrado ya
  // está protegido por la comprobación de referencias).
  const copyImage = async (url) => {
    const key = keyFromUrl(url, bucket);
    if (!key) return url;
    const baseName = key.split("/").pop().replace(/^\d{13}-/, "");
    const newKey = `${now()}-${random()}-${baseName}`;
    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
          Key: newKey,
          ACL: "public-read",
          MetadataDirective: "COPY",
        }),
      );
      return `${baseUrl}/${encodeURI(newKey)}`;
    } catch (err) {
      logger.error?.(
        `[imageStorage] No se pudo copiar "${key}"; se mantiene la URL original.`,
        err,
      );
      return url;
    }
  };

  const copyImages = (urls = []) =>
    mapLimit(urls.filter(Boolean), COPY_CONCURRENCY, (url) => copyImage(url));

  // Copia todas las imágenes de un anuncio (main, media, blueprint, others)
  const copyAdImages = async (images = {}) => {
    const [main, media, blueprint, others] = await Promise.all([
      images.main ? copyImage(images.main) : "",
      images.media ? copyImage(images.media) : "",
      copyImages(images.blueprint || []),
      copyImages(images.others || []),
    ]);
    return { main, media, blueprint, others };
  };

  return { deleteImages, deleteImage, copyImage, copyImages, copyAdImages };
};

module.exports = {
  AD_IMAGE_PATHS,
  OTHER_IMAGE_COLLECTIONS,
  keyFromUrl,
  adImageUrls,
  findReferencedKeys,
  createImageStorage,
};
