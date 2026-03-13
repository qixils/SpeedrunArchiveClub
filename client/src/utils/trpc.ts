import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server/src/router'
import { ref } from 'vue'

export const adminSecret = ref<string>()

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://archive.speedrun.club/trpc',
      async headers() {
        return {
          ...(adminSecret.value && { 'x-admin-secret': adminSecret.value }),
        }
      },
    }),
  ],
})

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>
