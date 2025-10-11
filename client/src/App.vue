<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router'

onMounted(() => {
  window.addEventListener('vite:preloadError', () => {
    window.location.reload()
  })
})
</script>

<template>
  <!-- todo: test mobile -->
  <div id="root" class="flex flex-col min-h-dvh">
    <header class="space-y-2 px-1 py-2 items-center bg-sky-100/50 dark:bg-sky-900/50">
      <nav class="flex flex-col justify-center items-center gap-2 md:flex-row">
        <RouterLink to="/">Search</RouterLink>
        <span class="not-md:hidden text-neutral-700">·</span>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </header>

    <div class="w-[min(100%,50rem)] p-4 flex-grow-1 flex flex-col items-stretch self-center">
      <RouterView />
    </div>

    <footer class="space-y-2 px-1 py-5 items-center bg-sky-100/50 dark:bg-sky-900/50">
      <p class="text-center">
        Made with ❤️ by <a href="https://github.com/qixils">lexikiq</a>
        with support from <a href="https://wiki.archiveteam.org/index.php/Twitch">ArchiveTeam</a>
        and <a href="https://github.com/dunkyl">Dunkyl</a>
      </p>
      <nav class="flex flex-col justify-center items-center gap-2 md:flex-row">
        <a href="https://github.com/qixils/speedrunarchiveclub">GitHub</a>
        <span class="not-md:hidden text-neutral-700">·</span>
        <a href="https://github.com/sponsors/qixils">Buy me a coffee</a>
      </nav>
    </footer>
  </div>
</template>

<style>
@reference "tailwindcss";

html {
  font-family: 'Noto Sans', sans-serif;
  font-optical-sizing: auto;
  font-style: normal;
  font-variation-settings: 'wdth' 100;
  --bg-bg: #001;
  --text: #EEF;
  --link: #AAF;
  --link-visited: #BBE;
  --link-hover: #FFF;
  background-color: var(--bg-bg);
  color: var(--text);
}

a {
  color: var(--link);

  &:visited {
    color: var(--link-visited);
  }

  &:hover {
    color: var(--link-hover);
    text-decoration: underline;
  }
}

.router-link-active {
  @apply !text-sky-500 underline;
}

@media (prefers-color-scheme: light) {
  html {
    --bg-bg: #faf8ff;
    --text: #112;
    --link: hsl(251, 75%, 48%);
    --link-visited: hsl(271, 75%, 55%);
    --link-hover: #97e;
  }
}
</style>
