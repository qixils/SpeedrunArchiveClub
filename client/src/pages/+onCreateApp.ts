export { onCreateApp }

import { VueQueryPlugin } from '@tanstack/vue-query'
import type { OnCreateAppSync } from 'vike-vue/types'

const onCreateApp: OnCreateAppSync = (pageContext): ReturnType<OnCreateAppSync> => {
  if (pageContext.isRenderingHead) return
  const { app } = pageContext

  app.use(VueQueryPlugin)
}
