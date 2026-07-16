// Documento `proveedor` (dataset interno): proveedores de tela/insumos.
export default {
  name: 'proveedor',
  title: 'Proveedor',
  type: 'document',
  fields: [
    { name: 'nombre', title: 'Nombre', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'contacto', title: 'Contacto', type: 'string', description: 'Persona de contacto.' },
    { name: 'telefono', title: 'Teléfono', type: 'string' },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'notas', title: 'Notas', type: 'text', rows: 3 },
    { name: 'activo', title: 'Activo', type: 'boolean', initialValue: true },
  ],
  orderings: [
    { title: 'Nombre', name: 'nombreAsc', by: [{ field: 'nombre', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'nombre', subtitle: 'contacto' },
  },
};
