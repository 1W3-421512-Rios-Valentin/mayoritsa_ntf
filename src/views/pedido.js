// Armar pedido (§7.2): cantidades por talle, totales en vivo, export Excel.
import { fetchCatalogo } from '../sanity/queries.js';
import { formatARS } from '../lib/format.js';
import { exportExcel } from '../export/excel.js';

export async function renderPedido(el) {
  el.innerHTML = '<p class="estado">Cargando…</p>';
  let productos;
  try {
    productos = await fetchCatalogo();
  } catch (err) {
    console.error(err);
    el.innerHTML = '<p class="estado error">No se pudo cargar el catálogo.</p>';
    return;
  }
  if (!productos.length) {
    el.innerHTML = '<p class="estado">No hay productos para armar el pedido.</p>';
    return;
  }

  const hoyISO = new Date().toISOString().slice(0, 10);

  const filas = productos
    .map((p) => {
      const inputs = (p.talles ?? [])
        .map(
          (t) => `
        <label class="qty">
          <span class="qty__t">${esc(t)}</span>
          <input class="qty__i" type="number" inputmode="numeric" min="0" step="1"
                 data-sku="${esc(p.sku)}" data-talle="${esc(t)}" placeholder="0" />
        </label>`
        )
        .join('');
      return `
        <div class="ped" data-sku="${esc(p.sku)}" data-precio="${p.precio}">
          <div class="ped__info">
            <strong class="ped__desc">${esc(p.descripcion)}</strong>
            <span class="ped__meta">${esc(p.sku)} · ${formatARS(p.precio)}</span>
          </div>
          <div class="ped__talles">${inputs}</div>
          <div class="ped__sub">
            <span class="ped__u">0 u.</span>
            <span class="ped__st">${formatARS(0)}</span>
          </div>
        </div>`;
    })
    .join('');

  el.innerHTML = `
    <div class="cabecera">
      <label class="campo">Cliente
        <input id="cliente" type="text" placeholder="Nombre del cliente" autocomplete="off" />
      </label>
      <label class="campo">Fecha
        <input id="fecha" type="date" value="${hoyISO}" />
      </label>
    </div>

    <div id="lista">${filas}</div>

    <div class="resumen">
      <div class="resumen__total">Total general: <strong id="totalGeneral">${formatARS(0)}</strong></div>
      <div class="resumen__acc">
        <button id="btnLimpiar" class="btn" type="button">Limpiar pedido</button>
        <button id="btnExcel" class="btn btn--pdf" type="button">Exportar Excel</button>
      </div>
    </div>`;

  const lista = el.querySelector('#lista');
  const totalGeneralEl = el.querySelector('#totalGeneral');

  const recalcFila = (row) => {
    const precio = Number(row.dataset.precio) || 0;
    let unidades = 0;
    row.querySelectorAll('.qty__i').forEach((i) => {
      unidades += Math.max(0, parseInt(i.value, 10) || 0);
    });
    row.querySelector('.ped__u').textContent = `${unidades} u.`;
    row.querySelector('.ped__st').textContent = formatARS(unidades * precio);
    return unidades * precio;
  };

  const recalcTotal = () => {
    let total = 0;
    lista.querySelectorAll('.ped').forEach((row) => {
      total += recalcFila(row);
    });
    totalGeneralEl.textContent = formatARS(total);
  };

  lista.addEventListener('input', (e) => {
    if (!e.target.classList.contains('qty__i')) return;
    // Evitar negativos.
    if (e.target.value && Number(e.target.value) < 0) e.target.value = '0';
    recalcFila(e.target.closest('.ped'));
    recalcTotal();
  });

  el.querySelector('#btnLimpiar').addEventListener('click', () => {
    lista.querySelectorAll('.qty__i').forEach((i) => (i.value = ''));
    recalcTotal();
  });

  el.querySelector('#btnExcel').addEventListener('click', async () => {
    const items = construirItems(lista);
    if (!items.length) {
      alert('Agregá al menos una cantidad antes de exportar.');
      return;
    }
    const cliente = el.querySelector('#cliente').value.trim();
    const fecha = formatearFecha(el.querySelector('#fecha').value);
    try {
      await exportExcel({ cliente, fecha, items });
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el Excel. Revisá la consola.');
    }
  });
}

// Solo entran los artículos con al menos una cantidad > 0 (§7.2).
function construirItems(lista) {
  const items = [];
  lista.querySelectorAll('.ped').forEach((row) => {
    const cantidades = {};
    let tiene = false;
    row.querySelectorAll('.qty__i').forEach((i) => {
      const q = Math.max(0, parseInt(i.value, 10) || 0);
      if (q > 0) {
        cantidades[i.dataset.talle] = q;
        tiene = true;
      }
    });
    if (tiene) {
      const meta = row.querySelector('.ped__meta').textContent;
      items.push({
        sku: row.dataset.sku,
        descripcion: row.querySelector('.ped__desc').textContent,
        precio: Number(row.dataset.precio) || 0,
        cantidades,
      });
    }
  });
  return items;
}

// yyyy-mm-dd → dd/mm/aaaa
function formatearFecha(iso) {
  if (!iso) return new Date().toLocaleDateString('es-AR');
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}
