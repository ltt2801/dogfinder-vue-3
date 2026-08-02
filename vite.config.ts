import { fileURLToPath, URL } from 'node:url'

import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(),
    tailwindcss(),
    Components({
      resolvers: [
        PrimeVueResolver({
          components: {
            prefix: 'P',
          },
          directives: {
            prefix: 'P',
          },
        }),
      ],
    }),
    Icons({ compiler: 'vue3' }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000, // port run project localhost:3000
    strictPort: true,
  },
})
