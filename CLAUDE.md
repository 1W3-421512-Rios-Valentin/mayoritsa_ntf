# CLAUDE.md — Catálogo Mayorista NTF

Guía de proyecto para Claude Code. Leer completo antes de escribir código.
Trabajar **por fases**, con aprobación explícita al cerrar cada una (ver §16).

---

## 1. Objetivo

App web estática para una tienda de ropa mayorista. Dos usos:

1. **Enviar catálogo** a clientes nuevos (export PDF con fotos y precios).
2. **Pasar pedidos** de clientes (armar el pedido en la app y exportar la
   planilla Excel mayorista rellena).

Debe ser fácil de usar, clara, y verse bien en **móvil y PC**.

## 2. Fuera de alcance

- No hay backend propio ni lógica pesada: eso ya lo resuelve otro sistema
  interno. Esta app es liviana y solo lee catálogo y genera exports.
- No persiste pedidos (el pedido se exporta, no se guarda).
- No maneja stock, facturación ni cuentas de cliente.

## 3. Stack y restricciones

- **Hosting:** GitHub Pages (100% estático, sin servidor).
- **Front:** Vite (template *vanilla*) + JavaScript. HTML/CSS/JS modular.
  Sin frameworks pesados. TypeScript opcional si simplifica.
- **CMS / "base de datos":** **Sanity** (headless, plan free). CRUD real vía
  Sanity Studio. El front hace **solo lectura** por GROQ contra la API CDN.
- **Export Excel:** **ExcelJS** (carga la plantilla real y la rellena
  preservando combinaciones, fórmulas y estilos).
- **Export PDF:** print-CSS dedicada (primario) + opción `html2pdf.js`.
- **Imágenes:** assets de Sanity (`@sanity/image-url`), formato/recorte auto.

Regla dura: **ningún token ni secreto en el front**. Solo se leen datos de un
dataset público de Sanity vía CDN.

## 4. Arquitectura y flujo de datos

```
Sanity Studio (CRUD, auth)  ──►  Dataset "production" (público, read)
                                        │  GROQ (apicdn.sanity.io)
                                        ▼
        GitHub Pages (Vite build)  ──►  Catálogo + Armar pedido
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                                ▼
                Export PDF (fotos+precio)     Export Excel (plantilla llena)
```

- Lectura sin token (`useCdn: true`, dataset con lectura pública).
- El "admin/CRUD" **es el Sanity Studio**, no se construye una pantalla propia.

## 5. Sistema de talles

Dos escalas que comparten las mismas 10 columnas físicas del Excel (D–M).
Cada artículo usa **una** escala según `tipoTalle`.

| Col Excel | Pantalón (`numero`) | Letra (`letra`) |
|-----------|---------------------|-----------------|
| D | 34 | XXXS |
| E | 36 | XXS |
| F | 38 | XS |
| G | 40 | S |
| H | 42 | M |
| I | 44 | L |
| J | 46 | XL |
| K | 48 | XXL |
| L | 50 | XXXL |
| M | 52 | TU |

- `tipoTalle: "letra"` → escala XXXS…XXXL (D–L). `TU` cae en M.
- `tipoTalle: "numero"` → escala 34…52 (D–M).
- `tipoTalle: "unico"` → solo `TU` (columna M).

Constante única en el código para el mapeo talle → columna
(`SIZE_TO_COL`), usada tanto en la UI de pedido como en el export Excel.

## 6. Modelo de datos (schema Sanity)

Documento `producto`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `sku` | string | requerido, único (validación) |
| `descripcion` | string | requerido |
| `precio` | number | ARS, requerido |
| `composicion` | text | composición de telas |
| `detalles` | text | libre |
| `categoria` | string | p. ej. Remeras, Pantalones (o reference) |
| `tipoTalle` | string | lista: `letra` \| `numero` \| `unico` |
| `talles` | array<string> | subconjunto válido según `tipoTalle` |
| `fotos` | array<image> | con `hotspot: true` |
| `activo` | boolean | default `true` (oculta del catálogo si false) |
| `orden` | number | orden de aparición |

GROQ de catálogo:

```groq
*[_type == "producto" && activo == true] | order(categoria asc, orden asc){
  sku, descripcion, precio, composicion, detalles, categoria,
  tipoTalle, talles, "fotos": fotos[]{ ..., asset-> }
}
```

## 7. Vistas

### 7.1 Catálogo (público)
- Grilla de cards responsive (mobile-first).
- Cada card: carrusel colapsado (§8), descripción, composición, precio,
  talles disponibles, categoría.
- Buscador por SKU / descripción / categoría + filtro por categoría.
- Estados: cargando, vacío, error de red.

### 7.2 Armar pedido
- Campos de cabecera: **Cliente** (texto) y **Fecha** (default hoy).
- Listado de artículos con inputs de cantidad por talle disponible.
- Totales en vivo: unidades por artículo, subtotal ($) por artículo y total
  general.
- Botones: **Exportar Excel** (§10) y limpiar pedido.
- Solo entran a la exportación los artículos con al menos una cantidad > 0.

### 7.3 Admin / CRUD
- Es **Sanity Studio** (proyecto aparte, `sanity deploy` → `*.sanity.studio`).
- No se construye UI de edición en el front.

## 8. Carrusel de fotos (colapsable)

- En la card se muestra **una** miniatura (portada) para no ocupar lugar.
- Al tocar/click, se despliega un visor (lightbox) con swipe entre fotos y
  navegación por teclado en desktop.
- Lazy-load de imágenes. URLs de Sanity con `?w=...&auto=format` para servir
  tamaños adecuados (miniatura vs lightbox).
- Implementación liviana (custom o librería mínima); nada que pese de más.

## 9. Export PDF (catálogo con fotos y precio)

- Genera un catálogo listo para enviar a cliente: foto de portada,
  descripción, composición, **precio visible**, talles.
- Primario: hoja de estilos `@media print` dedicada + acción "Descargar PDF"
  que dispara el diálogo de impresión (nítido, texto seleccionable, buen
  manejo de saltos de página).
- Opcional: botón alternativo con `html2pdf.js` para archivo de un click.
- Permitir elegir qué categorías/artículos incluir (mínimo: todo el catálogo
  activo).

## 10. Export Excel (plantilla mayorista rellena)

- Base: `assets/Plantilla_Pedidos_mayoristas_ntf.xlsx` (versionada en el repo).
- Librería: **ExcelJS**. Cargar la plantilla, escribir y descargar.
- Layout de la plantilla (no modificar encabezados):
  - Fila 1: `Cliente:` (A1:C1) · números 34–52 (D1:M1) · `Fecha:` (N1:O1).
  - Fila 2: `codigo | descripcion | precio` (A–C) · letras XXXS–TU (D–M) ·
    `Total` (N) · `Sub-Total` (O).
  - Datos desde fila 3.
- Al exportar, por cada artículo del pedido (una fila desde la 3):
  - `A=sku`, `B=descripcion`, `C=precio`.
  - Cantidades en D–M según `SIZE_TO_COL`.
  - `N{r} = =SUM(D{r}:M{r})`  ·  `O{r} = =N{r}*C{r}`.
- Cabecera: setear `A1 = "Cliente: {nombre}"` y `N1 = "Fecha: {dd/mm/aaaa}"`
  (respetando las celdas combinadas). *(Verificar celda destino del valor de
  Cliente/Fecha contra la plantilla real; ver §16 F0.)*
- Fila final **TOTAL**: `=SUM(O3:O{ultimaFila})`.
- Descarga como `Pedido_{cliente}_{fecha}.xlsx`.

## 11. Imágenes (Drive → Sanity)

- Las fotos hoy están en Google Drive. Fuente de verdad final: **Sanity assets**.
- Paso de contenido (una vez, o cuando se agreguen productos): subir a Sanity
  (drag & drop en Studio, o migración batch Drive→Sanity).
- No hotlinkear Drive desde el front.

## 12. Responsive / mobile

- Mobile-first. Grilla fluida (1 col en móvil, 2–4 en desktop).
- Targets táctiles cómodos; inputs de cantidad usables con el pulgar.
- Probar en viewport ~360px y en desktop ancho.

## 13. Deploy (GitHub Pages)

- `vite.config` con `base: '/<nombre-repo>/'`.
- GitHub Action: build (`vite build`) y publicar `dist/` (Pages via Actions
  o rama `gh-pages`).
- Variables (públicas, no secretas): `VITE_SANITY_PROJECT_ID`,
  `VITE_SANITY_DATASET` (= `production`).
- Sanity: dataset con **lectura pública** y agregar el origen
  `https://<usuario>.github.io` a los **CORS origins** (sin credenciales).

## 14. Seguridad

- Front **solo lectura**; sin tokens de Sanity en el bundle.
- Escrituras (alta/edición de productos) exclusivamente por Studio autenticado.
- No exponer datos sensibles del negocio más allá del catálogo mayorista.

## 15. Estructura del repo (sugerida)

```
/
├─ index.html
├─ vite.config.js
├─ src/
│  ├─ main.js
│  ├─ sanity/         # cliente lectura + queries GROQ + urls de imagen
│  ├─ views/          # catalogo, pedido
│  ├─ components/     # card, carrusel/lightbox, buscador
│  ├─ export/         # excel.js (ExcelJS), pdf.js
│  └─ lib/            # SIZE_TO_COL, formato $, helpers
├─ assets/
│  └─ Plantilla_Pedidos_mayoristas_ntf.xlsx
├─ styles/
│  ├─ main.css
│  └─ print.css
├─ studio/            # Sanity Studio (schema producto)
└─ .github/workflows/ # deploy a Pages
```

## 16. Plan por fases (con criterios de aceptación)

**F0 — Definiciones y scaffold**
- Crear proyecto/dataset Sanity + schema `producto` + Studio corriendo.
- Scaffold Vite + estructura §15 + plantilla en `assets/`.
- Cargar 3–5 productos de prueba (con fotos) en Sanity.
- Confirmar celda destino del valor Cliente/Fecha en la plantilla.
- ✅ Studio edita productos; el front levanta y consulta Sanity.

**F1 — Catálogo read-only**
- Grilla responsive leyendo de Sanity; card con portada, datos y talles.
- ✅ Se ve bien en móvil y desktop; maneja carga/vacío/error.

**F2 — Buscador y filtros**
- Búsqueda por SKU/descripción y filtro por categoría.
- ✅ Filtra en vivo sin recargar.

**F3 — Carrusel/lightbox**
- Portada colapsada → lightbox con swipe y teclado; lazy-load.
- ✅ No infla el layout de la card; fluido en móvil.

**F4 — Export PDF**
- Print-CSS + descarga; fotos y precio visibles; saltos de página correctos.
- ✅ PDF presentable para enviar a cliente.

**F5 — Armar pedido + Export Excel**
- UI de cantidades por talle, totales en vivo, cabecera Cliente/Fecha.
- ExcelJS rellena la plantilla con fórmulas N/O y fila TOTAL.
- ✅ El `.xlsx` abre en Excel sin errores de fórmula y respeta el formato.

**F6 — Deploy y pulido**
- Action de Pages + CORS Sanity + revisión móvil final.
- ✅ URL pública funcionando end-to-end.

## 17. Convenciones

- Una sola fuente para el mapeo de talles (`SIZE_TO_COL`).
- Formato de precio ARS consistente (miles con punto).
- Sin dependencias innecesarias; preferir estándar/plataforma antes que libs.
- Commits chicos y por fase.
