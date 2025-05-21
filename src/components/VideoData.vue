<script setup lang="ts">
import { ref } from 'vue';

const active = ref(true)
</script>

<template>
  <div class="bg-green-50 border-green-100 border">
    <div class="flex flex-row justify-between gap-1">
      <!-- TODO: pfp -->
      <div>
        <p>TITLE</p>
        <!-- todo: uploader link updates the search for that creator -->
        <p class="text-sm text-neutral-900"><a>UPLOADER</a> on DATE</p>
      </div>
      <button class="text-neutral-400 hover:text-neutral-500">
        <i-mdi-arrow-down-drop :class="active ? 'rotate-90' : 'rotate-180'"
          class="size-5 transition-transform duration-150" />
      </button>
    </div>
    <div :class="[active ? 'h-fit' : 'h-0']" class="transition-all duration-150 overflow-clip">
      <div class="mt-2 h-fit">
        <p class="text-sm text-neutral-800">DESCRIPTION</p>
        <!-- TODO: iframe -->
        <!-- todo: stream source selector -->
      </div>
    </div>
  </div>
</template>
