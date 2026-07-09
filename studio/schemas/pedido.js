// Documento `pedido` (dataset interno). Los items son SNAPSHOT al momento del
// pedido (precio/categoría congelados) para que las métricas históricas no
// cambien si se edita el catálogo.

export default {
  name: 'pedido',
  title: 'Pedido',
  type: 'document',
  fields: [
    {
      name: 'cliente',
      title: 'Cliente',
      type: 'reference',
      to: [{ type: 'cliente' }],
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'fecha',
      title: 'Fecha',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'items',
      title: 'Artículos',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'item',
          title: 'Artículo',
          fields: [
            { name: 'sku', title: 'SKU', type: 'string' },
            { name: 'descripcion', title: 'Descripción', type: 'string' },
            { name: 'categoria', title: 'Categoría', type: 'string' },
            { name: 'precio', title: 'Precio unitario', type: 'number' },
            {
              name: 'cantidades',
              title: 'Cantidades por talle',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'cantidadTalle',
                  fields: [
                    { name: 'talle', title: 'Talle', type: 'string' },
                    { name: 'cantidad', title: 'Cantidad', type: 'number' },
                  ],
                  preview: {
                    select: { talle: 'talle', cantidad: 'cantidad' },
                    prepare: ({ talle, cantidad }) => ({ title: `${talle} × ${cantidad}` }),
                  },
                },
              ],
            },
            { name: 'unidades', title: 'Unidades', type: 'number' },
            { name: 'subtotal', title: 'Subtotal ($)', type: 'number' },
          ],
          preview: {
            select: { sku: 'sku', descripcion: 'descripcion', unidades: 'unidades', subtotal: 'subtotal' },
            prepare: ({ sku, descripcion, unidades, subtotal }) => ({
              title: `${sku} — ${descripcion || ''}`,
              subtitle: `${unidades ?? 0} u. · $ ${(subtotal ?? 0).toLocaleString('es-AR')}`,
            }),
          },
        },
      ],
    },
    { name: 'totalUnidades', title: 'Total unidades', type: 'number' },
    { name: 'totalMonto', title: 'Total ($)', type: 'number' },
    {
      name: 'archivo',
      title: 'Archivo Excel',
      type: 'file',
      description: 'El .xlsx del pedido (generado o importado del historial).',
    },
    {
      name: 'hojaOrigen',
      title: 'Hoja de origen',
      type: 'string',
      description: 'Solo para pedidos importados del historial (libro/hoja de donde salió).',
    },
    { name: 'notas', title: 'Notas', type: 'text', rows: 2 },
  ],
  orderings: [
    {
      title: 'Fecha (recientes primero)',
      name: 'fechaDesc',
      by: [{ field: 'fecha', direction: 'desc' }],
    },
  ],
  preview: {
    select: { nombre: 'cliente.nombre', fecha: 'fecha', total: 'totalMonto', unidades: 'totalUnidades' },
    prepare({ nombre, fecha, total, unidades }) {
      const f = fecha ? fecha.split('-').reverse().join('/') : 'sin fecha';
      return {
        title: `${nombre || 'Sin cliente'} — ${f}`,
        subtitle: `${unidades ?? 0} u. · $ ${(total ?? 0).toLocaleString('es-AR')}`,
      };
    },
  },
};
