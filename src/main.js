import { renderCatalogo } from './views/catalogo.js';

// El front público es solo catálogo + export PDF. Armar pedido vive en el
// Sanity Studio (workspace Interno), donde el pedido se guarda y se exporta.
const app = document.querySelector('#app');
app.innerHTML = `
  <header class="topbar">
    <h1>Catálogo Mayorista NTF</h1>
  </header>
  <main id="vista"></main>`;

renderCatalogo(document.querySelector('#vista'));
