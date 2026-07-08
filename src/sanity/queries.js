import { client } from './client.js';

// GROQ del catálogo (§6).
export const CATALOGO_QUERY = `*[_type == "producto" && activo == true] | order(categoria asc, orden asc){
  sku, descripcion, precio, composicion, detalles, categoria,
  tipoTalle, talles, "fotos": fotos[]{ ..., asset-> }
}`;

export function fetchCatalogo() {
  return client.fetch(CATALOGO_QUERY);
}
