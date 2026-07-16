import producto from './producto.js';
import cliente from './cliente.js';
import pedido from './pedido.js';
import devolucion from './devolucion.js';
import tela from './tela.js';
import proveedor from './proveedor.js';

// Workspace "Catálogo" (dataset production, público)
export const catalogoTypes = [producto];

// Workspace "Interno" (dataset interno, privado)
export const internoTypes = [cliente, pedido, devolucion, tela, proveedor];

// Compat: export previo
export const schemaTypes = catalogoTypes;
