// Documento `devolucion` (dataset interno): notas de crédito (NCA) importadas
// del sistema. Cantidades en POSITIVO (unidades devueltas). Alimenta la stat
// "artículos más devueltos" y el neto de ventas.
export default {
  name: 'devolucion',
  title: 'Devolución',
  type: 'document',
  fields: [
    {
      name: 'cliente',
      title: 'Cliente',
      type: 'reference',
      to: [{ type: 'cliente' }],
      validation: (Rule) => Rule.required(),
    },
    { name: 'fecha', title: 'Fecha', type: 'date', validation: (Rule) => Rule.required() },
    { name: 'nroComprobante', title: 'Nº comprobante', type: 'string' },
    {
      name: 'items',
      title: 'Artículos devueltos',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'item',
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
            select: { sku: 'sku', descripcion: 'descripcion', unidades: 'unidades' },
            prepare: ({ sku, descripcion, unidades }) => ({
              title: `${sku} — ${descripcion || ''}`,
              subtitle: `${unidades ?? 0} u. devueltas`,
            }),
          },
        },
      ],
    },
    { name: 'totalUnidades', title: 'Total unidades', type: 'number' },
    { name: 'totalMonto', title: 'Total ($)', type: 'number' },
  ],
  orderings: [
    { title: 'Fecha (recientes primero)', name: 'fechaDesc', by: [{ field: 'fecha', direction: 'desc' }] },
  ],
  preview: {
    select: { nombre: 'cliente.nombre', fecha: 'fecha', total: 'totalMonto', unidades: 'totalUnidades' },
    prepare({ nombre, fecha, total, unidades }) {
      const f = fecha ? fecha.split('-').reverse().join('/') : 'sin fecha';
      return {
        title: `↩ ${nombre || 'Sin cliente'} — ${f}`,
        subtitle: `${unidades ?? 0} u. · $ ${(total ?? 0).toLocaleString('es-AR')}`,
      };
    },
  },
};
