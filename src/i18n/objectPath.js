// Lectura y escritura por ruta ("description.web") sobre objetos planos.
// Funciona también con documentos de Mongoose al leer, porque sus subcampos
// se exponen como propiedades.

const getPath = (source, path) => {
  if (source === null || source === undefined) return undefined;

  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, source);
};

const isPlainContainer = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Devuelve una copia de `source` con `value` en `path`. Solo se copian los
// objetos que hay en el camino, así que el original nunca se modifica.
const setPath = (source, path, value) => {
  const [head, ...rest] = path.split(".");
  const base = isPlainContainer(source) ? source : {};

  if (rest.length === 0) return { ...base, [head]: value };

  return { ...base, [head]: setPath(base[head], rest.join("."), value) };
};

module.exports = { getPath, setPath };
