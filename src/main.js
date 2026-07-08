import { renderCatalogo } from './views/catalogo.js';
import { renderPedido } from './views/pedido.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="topbar">
    <h1>Catálogo Mayorista NTF</h1>
    <nav class="nav">
      <button class="nav__btn is-active" data-view="catalogo" type="button">Catálogo</button>
      <button class="nav__btn" data-view="pedido" type="button">Armar pedido</button>
    </nav>
  </header>
  <main id="vista"></main>`;

const vista = document.querySelector('#vista');
const botones = [...document.querySelectorAll('.nav__btn')];

function show(view) {
  botones.forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  if (view === 'pedido') renderPedido(vista);
  else renderCatalogo(vista);
}

botones.forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));

show('catalogo');
