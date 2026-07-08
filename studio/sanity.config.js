import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { UploadIcon } from '@sanity/icons';
import { schemaTypes } from './schemas/index.js';
import BulkImport from './tools/BulkImport.jsx';

export default defineConfig({
  name: 'default',
  title: 'Catálogo Mayorista NTF',

  projectId: '1uuj4tpg',
  dataset: 'production',

  plugins: [structureTool()],

  tools: (prev) => [
    ...prev,
    {
      name: 'carga-masiva',
      title: 'Carga masiva',
      icon: UploadIcon,
      component: BulkImport,
    },
  ],

  schema: {
    types: schemaTypes,
  },
});
