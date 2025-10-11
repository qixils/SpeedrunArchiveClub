import './styles.css'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import en_US from '@/i18n/en_us.json'

const app = createApp(App)
const i18n = createI18n({
  fallbackLocale: 'en-US',
  messages: {
    "en-US": en_US,
  },
})

app.use(router)
app.use(VueQueryPlugin)
app.use(i18n)

app.mount('#app')
