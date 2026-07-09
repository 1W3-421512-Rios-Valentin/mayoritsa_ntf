// Matcheo de archivos de imagen → producto por SKU (lógica pura, testeable).

const IMG_EXT = /\.(jpe?g|png|webp)$/i;

export function isImage(name) {
  return IMG_EXT.test(name || '');
}

// Nombre de archivo → SKU base (sin extensión).
export function baseName(name) {
  return (name || '').replace(/\.[^.]+$/, '').trim();
}

// Saca un sufijo de orden del final: "_2", "-3", " 4" o "(1)".
function stripSuffix(base) {
  return base
    .replace(/\s*\(\d+\)$/, '')
    .replace(/[ _-]\d+$/, '')
    .trim();
}

// files: [{ name, file }]. skus: lista de SKUs reales de los productos.
// Devuelve { matched: Map<skuReal, files[] ordenados>, sinMatch: files[] }.
export function matchFiles(files, skus) {
  const lookup = new Map();
  for (const s of skus) lookup.set(String(s).trim().toLowerCase(), s);

  const matched = new Map();
  const sinMatch = [];

  for (const f of files) {
    if (!isImage(f.name)) continue;
    const base = baseName(f.name);
    let real = lookup.get(base.toLowerCase());
    if (!real) {
      const stripped = stripSuffix(base);
      if (stripped && stripped !== base) real = lookup.get(stripped.toLowerCase());
    }
    if (real) {
      if (!matched.has(real)) matched.set(real, []);
      matched.get(real).push(f);
    } else {
      sinMatch.push(f);
    }
  }

  // Orden: el archivo con el SKU "pelado" (sin sufijo) va primero → portada;
  // el resto por orden natural del nombre.
  for (const [sku, arr] of matched) {
    const skuLc = String(sku).toLowerCase();
    arr.sort((a, b) => {
      const ae = baseName(a.name).toLowerCase() === skuLc ? 0 : 1;
      const be = baseName(b.name).toLowerCase() === skuLc ? 0 : 1;
      if (ae !== be) return ae - be;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  return { matched, sinMatch };
}
