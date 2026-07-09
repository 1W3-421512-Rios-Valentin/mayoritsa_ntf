import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { UploadIcon, ImagesIcon } from '@sanity/icons';
import { schemaTypes } from './schemas/index.js';
import BulkImport from './tools/BulkImport.jsx';
import BulkPhotos from './tools/BulkPhotos.jsx';

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
    {
      name: 'fotos-masivas',
      title: 'Fotos masivas',
      icon: ImagesIcon,
      component: BulkPhotos,
    },
  ],

  schema: {
    types: schemaTypes,
  },
});
