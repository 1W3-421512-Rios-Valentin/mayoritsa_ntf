// Controles de búsqueda y filtro por categoría (§7.2).
export function renderBuscador(categorias) {
  const opciones = categorias
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join('');
  return `
    <div class="buscador">
      <input id="q" class="buscador__input" type="search"
             placeholder="Buscar por SKU, descripción o categoría…"
             autocomplete="off" />
      <select id="cat" class="buscador__select">
        <option value="">Todas las categorías</option>
        ${opciones}
      </select>
    </div>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}
