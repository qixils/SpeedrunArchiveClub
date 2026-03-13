<script setup lang="ts">
import { adminSecret, trpc } from '@/utils/trpc';
import type { MirrorSource } from 'server/src/types/query';
import { ref } from 'vue';

const videoId = ref<number>()
const mirrorType = ref<MirrorSource>()
const videoUrl = ref('')
const lastTrpcResult = ref('waiting')

const addMirror = async () => {
  lastTrpcResult.value = '...'
  try {
    if (!videoId.value) throw new Error("Please specify video id")
    if (!mirrorType.value) throw new Error("Please specify mirror type")
    if (!videoUrl.value) throw new Error("Please specify video url")
    await trpc.addMirror.mutate({ videoId: videoId.value, source: mirrorType.value, url: videoUrl.value })
    lastTrpcResult.value = 'ok'
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e) {
      lastTrpcResult.value = String(e.message)
    } else {
      lastTrpcResult.value = String(e)
    }
  }
}

const replaceMirror = async () => {
  lastTrpcResult.value = '...'
  try {
    if (!videoId.value) throw new Error("Please specify video id")
    if (!mirrorType.value) throw new Error("Please specify mirror type")
    if (!videoUrl.value) throw new Error("Please specify video url")
    await trpc.replaceMirror.mutate({ videoId: videoId.value, source: mirrorType.value, url: videoUrl.value })
    lastTrpcResult.value = 'ok'
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e) {
      lastTrpcResult.value = String(e.message)
    } else {
      lastTrpcResult.value = String(e)
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <p>Secret admin dashboard for updating data.</p>
    <div class="grid grid-cols-[auto_1fr] gap-1 items-center bg-emerald-800 p-1">
      <p>Password</p>
      <input type="password" v-model="adminSecret" class="bg-emerald-900 px-2 py-1.5 rounded" />
    </div>

    <p>Last tRPC response</p>
    <p class="bg-emerald-800 rounded p-1 border border-emerald-600">{{ lastTrpcResult }}</p>

    <p>Add/replace video mirror</p>
    <div class="grid grid-cols-[auto_1fr] gap-1 items-center bg-emerald-800 p-1">
      <p>Video ID</p>
      <input type="text" v-model.number="videoId" class="bg-emerald-900 px-2 py-1.5 rounded" />

      <p>Mirror Source</p>
      <select v-model="mirrorType" class="bg-emerald-900 px-2 py-1.5 rounded">
        <option value="INTERNET_ARCHIVE">Internet Archive</option>
        <option value="YOUTUBE">YouTube</option>
      </select>

      <p>Video URL</p>
      <input type="text" v-model.trim="videoUrl" class="bg-emerald-900 px-2 py-1.5 rounded" />

      <div class="col-span-2 flex flex-row gap-1">
        <button @click="addMirror" class="bg-emerald-800 px-2 py-1.5 rounded">Add</button>
        <button @click="replaceMirror" class="bg-emerald-800 px-2 py-1.5 rounded">Replace</button>
      </div>
    </div>
  </div>
</template>
