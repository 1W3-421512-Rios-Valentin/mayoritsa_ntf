// Catálogo read-only con buscador y filtro por categoría (§7.1, §7.2).
import { fetchCatalogo } from '../sanity/queries.js';
import { renderCard } from '../components/card.js';
import { renderBuscador } from '../components/buscador.js';
import { openLightbox } from '../components/lightbox.js';
import { exportPDF } from '../export/pdf.js';

export async function renderCatalogo(el) {
  el.innerHTML = '<p class="estado">Cargando catálogo…</p>';
  let productos;
  try {
    productos = await fetchCatalogo();
  } catch (err) {
    console.error(err);
    el.innerHTML = `<p class="estado error">No se pudo cargar el catálogo.<br>
      Revisá tu conexión e intentá de nuevo.</p>`;
    return;
  }

  if (!productos.length) {
    el.innerHTML = '<p class="estado">No hay productos activos en el catálogo.</p>';
    return;
  }

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort();

  const hoy = new Date().toLocaleDateString('es-AR');

  el.innerHTML = `
    <div class="print-header">
      <strong>Catálogo Mayorista NTF</strong>
      <span>${hoy}</span>
    </div>
    <div class="acciones">
      <button id="btnPdf" class="btn btn--pdf" type="button">⬇ Descargar catálogo (PDF)</button>
    </div>
    ${renderBuscador(categorias)}
    <div id="grid" class="grid"></div>`;

  const grid = el.querySelector('#grid');
  const inputQ = el.querySelector('#q');
  const selectCat = el.querySelector('#cat');
  el.querySelector('#btnPdf').addEventListener('click', exportPDF);

  const pintar = () => {
    const q = inputQ.value.trim().toLowerCase();
    const cat = selectCat.value;
    const filtrados = productos.filter((p) => {
      if (cat && p.categoria !== cat) return false;
      if (!q) return true;
      const texto = `${p.sku} ${p.descripcion} ${p.categoria ?? ''}`.toLowerCase();
      return texto.includes(q);
    });
    grid.innerHTML = filtrados.length
      ? filtrados.map(renderCard).join('')
      : '';
    grid.classList.toggle('grid--empty', filtrados.length === 0);
    if (!filtrados.length) {
      grid.innerHTML = '<p class="estado">Sin resultados para tu búsqueda.</p>';
    }
  };

  inputQ.addEventListener('input', pintar);
  selectCat.addEventListener('change', pintar);

  // Abrir lightbox al tocar la portada (delegación).
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sku]');
    if (!btn) return;
    const p = productos.find((x) => x.sku === btn.dataset.sku);
    if (p?.fotos?.length) openLightbox(p.fotos, 0);
  });

  pintar();
}
