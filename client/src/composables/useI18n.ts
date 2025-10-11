import { createGlobalState } from '@vueuse/core'
import { createI18n } from 'vue-i18n'
import en_US from '@/i18n/en_us.json'

// todo? vike has opinions: https://vike.dev/i18n

export const useI18n = createGlobalState(() => {
  const i18n = createI18n({
    fallbackLocale: 'en-US',
    messages: {
      "en-US": en_US,
    },
  })

  return i18n.global
})
