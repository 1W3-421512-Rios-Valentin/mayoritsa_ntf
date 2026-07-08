// Documento `producto` (§6).
export default {
  name: 'producto',
  title: 'Producto',
  type: 'document',
  fields: [
    {
      name: 'sku',
      title: 'SKU',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'descripcion',
      title: 'Descripción',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'precio',
      title: 'Precio (ARS)',
      type: 'number',
      validation: (Rule) => Rule.required().min(0),
    },
    {
      name: 'composicion',
      title: 'Composición',
      type: 'text',
      rows: 2,
    },
    {
      name: 'detalles',
      title: 'Detalles',
      type: 'text',
      rows: 3,
    },
    {
      name: 'categoria',
      title: 'Categoría',
      type: 'string',
    },
    {
      name: 'tipoTalle',
      title: 'Tipo de talle',
      type: 'string',
      options: {
        list: [
          { title: 'Letra (XXXS…XXXL)', value: 'letra' },
          { title: 'Número (34…52)', value: 'numero' },
          { title: 'Único (TU)', value: 'unico' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'talles',
      title: 'Talles disponibles',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          '34', '36', '38', '40', '42', '44', '46', '48', '50', '52',
          'XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'TU',
        ],
      },
      description:
        'Subconjunto según el tipo de talle: número → 34…52 · letra → XXXS…XXXL · único → TU.',
    },
    {
      name: 'fotos',
      title: 'Fotos',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'activo',
      title: 'Activo',
      type: 'boolean',
      initialValue: true,
      description: 'Si está en falso, se oculta del catálogo.',
    },
    {
      name: 'orden',
      title: 'Orden',
      type: 'number',
      description: 'Orden de aparición dentro de la categoría.',
    },
  ],
  orderings: [
    {
      title: 'Categoría, orden',
      name: 'categoriaOrden',
      by: [
        { field: 'categoria', direction: 'asc' },
        { field: 'orden', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: { title: 'descripcion', subtitle: 'sku', media: 'fotos.0' },
  },
};
