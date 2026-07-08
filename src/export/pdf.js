// Export PDF del catálogo (§9). Enfoque primario: print-CSS + diálogo de
// impresión del navegador (nítido, texto seleccionable, buenos saltos de página).
// Lo que se imprime = la vista filtrada actual (categoría/búsqueda), así se elige
// qué incluir.
export function exportPDF() {
  window.print();
}
