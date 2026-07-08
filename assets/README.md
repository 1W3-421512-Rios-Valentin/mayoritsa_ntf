# assets/

Colocar acá la plantilla mayorista real:

**`Plantilla_Pedidos_mayoristas_ntf.xlsx`**

Es un binario que debe versionarse en el repo (§10). El export Excel (F5)
la carga con ExcelJS, la rellena preservando combinaciones/fórmulas/estilos y
la descarga.

Layout esperado (no modificar encabezados):
- Fila 1: `Cliente:` (A1:C1) · números 34–52 (D1:M1) · `Fecha:` (N1:O1).
- Fila 2: `codigo | descripcion | precio` (A–C) · letras XXXS–TU (D–M) ·
  `Total` (N) · `Sub-Total` (O).
- Datos desde fila 3.

Pendiente F0: confirmar la celda destino exacta del valor de Cliente y Fecha
contra la plantilla real (§16).
