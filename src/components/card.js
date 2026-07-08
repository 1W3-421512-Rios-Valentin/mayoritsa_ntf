import { urlFor } from '../sanity/image.js';
import { formatARS } from '../lib/format.js';

// Card de producto para la grilla del catálogo (§7.1).
// La portada abre el lightbox (§8) cuando el producto tiene fotos.
export function renderCard(p) {
  const fotos = p.fotos ?? [];
  const foto = fotos[0];
  const cat = p.categoria
    ? `<span class="card__cat">${esc(p.categoria)}</span>`
    : '';

  let cover;
  if (foto) {
    const img = `<img class="card__img" loading="lazy" alt="${esc(p.descripcion)}"
      src="${urlFor(foto).width(500).height(500).fit('crop').auto('format').url()}">`;
    const badge = fotos.length > 1
      ? `<span class="card__count" aria-hidden="true">▦ ${fotos.length}</span>`
      : '';
    cover = `<button class="card__cover card__cover--btn" type="button"
        data-sku="${esc(p.sku)}" aria-label="Ver fotos de ${esc(p.descripcion)}">
        ${img}${cat}${badge}
      </button>`;
  } else {
    cover = `<div class="card__cover">
        <div class="card__img card__img--placeholder" aria-hidden="true">sin foto</div>${cat}
      </div>`;
  }

  const talles = (p.talles ?? [])
    .map((t) => `<span class="talle">${esc(t)}</span>`)
    .join('');

  return `
    <article class="card">
      ${cover}
      <div class="card__body">
        <h2 class="card__title">${esc(p.descripcion)}</h2>
        <p class="card__sku">${esc(p.sku)}</p>
        ${p.composicion ? `<p class="card__comp">${esc(p.composicion)}</p>` : ''}
        <p class="card__precio">${formatARS(p.precio)}</p>
        ${talles ? `<div class="card__talles">${talles}</div>` : ''}
      </div>
    </article>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}
