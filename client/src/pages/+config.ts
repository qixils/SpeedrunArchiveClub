import vikeVue from 'vike-vue/config'
import type { Config } from 'vike/types'

// Default configs (can be overridden by pages)
export default {
  extends: vikeVue,
  prerender: true,
} satisfies Config
