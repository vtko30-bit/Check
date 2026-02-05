import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestor de Tareas Pro',
    short_name: 'TaskPro',
    description: 'Gestión de tareas moderna y eficiente',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#14b8a6',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: 'https://api.dicebear.com/7.x/shapes/png?seed=TaskPro&backgroundColor=14b8a6',
        sizes: '192x192',
        type: 'image/png',
      },
       {
        src: 'https://api.dicebear.com/7.x/shapes/png?seed=TaskPro&backgroundColor=14b8a6',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
