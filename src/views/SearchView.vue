<script setup lang="ts">
import { ref } from 'vue';

const searchText = ref('')
</script>

<template>
  <main class="mx-auto flex flex-col items-center bg-neutral-100">
    <div class="flex flex-row">
      <input v-model="searchText" class="rounded-l-lg py-1 px-2 w-88 border border-r-0 border-emerald-400 outline-none"
        placeholder="Enter your video URL, title, or uploader" />
      <button
        class="bg-emerald-400 hover:bg-emerald-600 active:bg-emerald-700 text-white hover:text-emerald-200 active:text-emerald-400 transition-colors duration-150 p-1 rounded-r-lg">
        <i-mdi-search class="size-5" />
      </button>
    </div>
  </main>
</template>

<style></style>
