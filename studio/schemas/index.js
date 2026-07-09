import producto from './producto.js';
import cliente from './cliente.js';
import pedido from './pedido.js';

// Workspace "Catálogo" (dataset production, público)
export const catalogoTypes = [producto];

// Workspace "Interno" (dataset interno, privado)
export const internoTypes = [cliente, pedido];

// Compat: export previo
export const schemaTypes = catalogoTypes;
