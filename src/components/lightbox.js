// Lightbox de fotos (§8). Singleton montado una vez.
// openLightbox(fotos, startIndex) — swipe táctil + teclado + lazy-load.
import { urlFor } from '../sanity/image.js';

let fotos = [];
let idx = 0;
let root = null;

function ensure() {
  if (root) return;
  root = document.createElement('div');
  root.className = 'lb';
  root.hidden = true;
  root.innerHTML = `
    <button class="lb__close" type="button" aria-label="Cerrar">&times;</button>
    <button class="lb__nav lb__prev" type="button" aria-label="Anterior">&#8249;</button>
    <img class="lb__img" alt="" />
    <button class="lb__nav lb__next" type="button" aria-label="Siguiente">&#8250;</button>
    <span class="lb__count"></span>`;
  document.body.appendChild(root);

  root.querySelector('.lb__close').addEventListener('click', close);
  root.querySelector('.lb__prev').addEventListener('click', () => go(-1));
  root.querySelector('.lb__next').addEventListener('click', () => go(1));
  // Click en el fondo (fuera de la imagen) cierra.
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  // Swipe táctil.
  let x0 = null;
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    x0 = null;
  });
}

function show() {
  const img = root.querySelector('.lb__img');
  img.src = urlFor(fotos[idx]).width(1200).fit('max').auto('format').url();
  img.alt = `Foto ${idx + 1} de ${fotos.length}`;
  root.querySelector('.lb__count').textContent = `${idx + 1} / ${fotos.length}`;
  const multi = fotos.length > 1;
  root.querySelector('.lb__prev').hidden = !multi;
  root.querySelector('.lb__next').hidden = !multi;
  root.querySelector('.lb__count').hidden = !multi;
}

function go(d) {
  idx = (idx + d + fotos.length) % fotos.length;
  show();
}

function onKey(e) {
  if (root.hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'ArrowLeft') go(-1);
}

export function openLightbox(f, start = 0) {
  ensure();
  fotos = f || [];
  if (!fotos.length) return;
  idx = start;
  root.hidden = false;
  document.body.style.overflow = 'hidden';
  show();
  document.addEventListener('keydown', onKey);
}

function close() {
  root.hidden = true;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
}
