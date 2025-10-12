import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vike from 'vike/plugin'
import tailwindcss from '@tailwindcss/vite'
import iconsResolver from 'unplugin-icons/resolver'
import icons from 'unplugin-icons/vite'
import components from 'unplugin-vue-components/vite'

// import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vike(),
    // vueDevTools(),
    tailwindcss(), // todo: not defining css classes correctly
    components({
      resolvers: [
        iconsResolver(),
      ],
    }),
    icons(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
