import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import libraryApiPlugin from './vite-library-api.js'
import poisApiPlugin from './vite-pois-api.js'
import authApiPlugin from './vite-auth-api.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), authApiPlugin(), libraryApiPlugin(), poisApiPlugin()],
    server: {
      proxy: {
        '/api/notion': {
          target: 'https://api.notion.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/notion/, ''),
          headers: {
            'Authorization': `Bearer ${env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
          },
        },
      },
    },
  }
})
