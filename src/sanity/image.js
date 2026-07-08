import imageUrlBuilder from '@sanity/image-url';
import { client } from './client.js';

const builder = imageUrlBuilder(client);

// Helper para URLs de imágenes de Sanity (§8, §11).
// Uso: urlFor(foto).width(400).auto('format').url()
export function urlFor(source) {
  return builder.image(source);
}
