// Documento `tela` (dataset interno): ficha de producción de una tela.
// Una tela la comparten muchos productos → `productos[]` lista los SKUs que la
// usan (vínculo por SKU: no hay referencias entre datasets, los productos viven
// en `production`). El `consumo` por producto pisa al `rendimiento` general.
export default {
  name: 'tela',
  title: 'Tela',
  type: 'document',
  groups: [
    { name: 'ficha', title: 'Ficha técnica', default: true },
    { name: 'compra', title: 'Rollo y proveedor' },
    { name: 'productos', title: 'Productos' },
  ],
  fields: [
    {
      name: 'codigoTela',
      title: 'Código de tela',
      type: 'string',
      group: 'ficha',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      group: 'ficha',
      description: 'Nombre descriptivo (ej. "Rústico 20/1").',
    },
    { name: 'composicion', title: 'Composición', type: 'text', rows: 2, group: 'ficha' },
    {
      name: 'estructura',
      title: 'Estructura y tipo de tejido',
      type: 'string',
      group: 'ficha',
      description: 'Ej. jersey, rib, gabardina, french terry…',
    },
    {
      name: 'gramaje',
      title: 'Peso / gramaje (g/m²)',
      type: 'number',
      group: 'ficha',
      validation: (Rule) => Rule.min(0),
    },
    {
      name: 'rendimiento',
      title: 'Rendimiento (metros por prenda)',
      type: 'number',
      group: 'ficha',
      description: 'Metros de tela que consume una prenda. Se puede pisar por producto en la pestaña Productos.',
      validation: (Rule) => Rule.min(0),
    },
    {
      name: 'propiedades',
      title: 'Propiedades físicas y funcionales',
      type: 'text',
      rows: 3,
      group: 'ficha',
    },

    {
      name: 'anchoRollo',
      title: 'Ancho del rollo (cm)',
      type: 'number',
      group: 'compra',
      validation: (Rule) => Rule.min(0),
    },
    {
      name: 'largoRollo',
      title: 'Largo del rollo (metros)',
      type: 'number',
      group: 'compra',
      validation: (Rule) => Rule.min(0),
    },
    {
      name: 'proveedor',
      title: 'Proveedor',
      type: 'reference',
      to: [{ type: 'proveedor' }],
      group: 'compra',
    },
    {
      name: 'precioRollo',
      title: 'Precio del rollo ($)',
      type: 'number',
      group: 'compra',
      validation: (Rule) => Rule.min(0),
    },

    {
      name: 'productos',
      title: 'Productos que usan esta tela',
      type: 'array',
      group: 'productos',
      description: 'Se cargan desde la herramienta "Asignar telas". El consumo pisa al rendimiento general.',
      of: [
        {
          type: 'object',
          name: 'productoTela',
          fields: [
            { name: 'sku', title: 'SKU', type: 'string' },
            { name: 'descripcion', title: 'Descripción', type: 'string', readOnly: true },
            {
              name: 'consumo',
              title: 'Consumo (m/prenda)',
              type: 'number',
              description: 'Opcional: si este producto consume distinto al rendimiento general.',
              validation: (Rule) => Rule.min(0),
            },
          ],
          preview: {
            select: { sku: 'sku', descripcion: 'descripcion', consumo: 'consumo' },
            prepare: ({ sku, descripcion, consumo }) => ({
              title: `${sku} — ${descripcion || ''}`,
              subtitle: consumo ? `${consumo} m/prenda` : undefined,
            }),
          },
        },
      ],
    },

    { name: 'notas', title: 'Notas', type: 'text', rows: 2, group: 'ficha' },
    { name: 'activo', title: 'Activa', type: 'boolean', initialValue: true, group: 'ficha' },
  ],
  orderings: [
    { title: 'Código', name: 'codigoAsc', by: [{ field: 'codigoTela', direction: 'asc' }] },
  ],
  preview: {
    select: { codigo: 'codigoTela', nombre: 'nombre', productos: 'productos', proveedor: 'proveedor.nombre' },
    prepare({ codigo, nombre, productos, proveedor }) {
      const n = (productos || []).length;
      return {
        title: [codigo, nombre].filter(Boolean).join(' — '),
        subtitle: `${n} producto(s)${proveedor ? ` · ${proveedor}` : ''}`,
      };
    },
  },
};
