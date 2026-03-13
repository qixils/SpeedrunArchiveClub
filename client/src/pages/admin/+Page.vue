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
    <div class="grid grid-cols-[auto_1fr] gap-1 items-center">
      <p>Password</p>
      <input type="password" v-model="adminSecret" />
    </div>

    <p>Last tRPC response</p>
    <p class="bg-emerald-400 rounded p-1 border-emerald-600">{{ lastTrpcResult }}</p>

    <p>Add/replace video mirror</p>
    <div class="grid grid-cols-[auto_1fr] gap-1 items-center">
      <p>Video ID</p>
      <input type="text" v-model.number="videoId" />

      <p>Mirror Source</p>
      <select v-model="mirrorType">
        <option value="INTERNET_ARCHIVE">Internet Archive</option>
        <option value="YOUTUBE">YouTube</option>
      </select>

      <p>Video URL</p>
      <input type="text" v-model.trim="videoUrl" />

      <div class="col-span-2 flex flex-row gap-1">
        <button @click="addMirror">Add</button>
        <button @click="replaceMirror">Replace</button>
      </div>
    </div>
  </div>
</template>
