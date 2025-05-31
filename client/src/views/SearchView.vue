<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { QueryClient, useQuery } from '@tanstack/vue-query';
import { trpc } from '../utils/trpc';
import VideoData from '../components/VideoData.vue';
import { VideoTypeEnum, MirrorSourceEnum } from '../../../server/src/types/query';
import type { z } from 'zod';
import type { RouterOutput } from '../utils/trpc';

type SearchResult = RouterOutput['findVideos'];
type Video = SearchResult['items'][number];

const searchText = ref('');
const selectedTypes = ref<z.infer<typeof VideoTypeEnum>[]>([]);
const selectedMirrors = ref<z.infer<typeof MirrorSourceEnum>[]>([]);
const currentPage = ref(1);
const activeVideoId = ref<number>();

const typeOptions = Object.values(VideoTypeEnum.enum);
const mirrorOptions = Object.values(MirrorSourceEnum.enum);

const formatMirrorName = (name: string) => {
  return name.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const isUrlOrId = computed(() => {
  const value = searchText.value.trim();
  return /^\d+$/.test(value) || value.startsWith('http');
});

const refetch = async () => {
  const { data } = await _refetch()

  for (const video of data?.items || []) {
    // Find all type/mirror permutations that this video should appear in
    const videoTypes = Array.isArray(video.type) ? video.type : [video.type];
    const videoMirrors = video.mirrors?.map(m => m.source) ?? [];

    const typePerms = getAllSupersets(videoTypes, typeOptions);
    const mirrorPerms = getAllSupersets(videoMirrors, mirrorOptions);

    for (const types of typePerms) {
      for (const mirrors of mirrorPerms) {
        queryClient.setQueryData(['search', searchText.value, types, mirrors, 1], { items: [video], totalPages: 1, currentPage: 1 });
      }
    }
  }

  if ((data?.totalPages || 0) > 1) return;

  // Determine which sets to use for permutations: if empty, use all options
  const typeSet = selectedTypes.value.length ? selectedTypes.value : typeOptions;
  const mirrorSet = selectedMirrors.value.length ? selectedMirrors.value : mirrorOptions;

  const typePerms = getAllSubsets(typeSet);
  const mirrorPerms = getAllSubsets(mirrorSet);

  // For each permutation, filter items to only those matching the permutation
  for (const types of typePerms) {
    for (const mirrors of mirrorPerms) {
      // If both types and mirrors are empty, skip (no filter)
      if (!types.length && !mirrors.length) continue;

      const filteredItems = (data?.items || []).filter(video => {
        // Type match: if types is empty, always match; else, match if video.type is in types
        const typeMatch = !types.length ||
          (Array.isArray(video.type)
            ? video.type.some(t => types.includes(t))
            : types.includes(video.type));
        // Mirror match: if mirrors is empty, always match; else, match if any video.mirrors' source is in mirrors
        const mirrorMatch = !mirrors.length ||
          (video.mirrors?.some(m => mirrors.includes(m.source)));
        return typeMatch && mirrorMatch;
      });

      queryClient.setQueryData(
        ['search', searchText.value, types, mirrors, 1],
        { ...data, items: filteredItems, currentPage: 1 }
      );
    }
  }
}

// Helper: all subsets (power set) of an array
function getAllSubsets<T>(arr: readonly T[]): T[][] {
  const result: T[][] = [[]];
  for (const el of arr) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push(result[i].concat(el));
    }
  }
  return result;
}

// Helper: all supersets of a subset within a set (for permutations containing at least all elements in subset)
function getAllSupersets<T>(subset: T[], fullset: readonly T[]): T[][] {
  // All subsets of fullset that include all elements in subset
  const all = getAllSubsets(fullset);
  return all.filter(s => subset.every(x => s.includes(x)));
}

const search = () => {
  if (!searchText.value.trim()) return;
  currentPage.value = 1; // Reset to first page on new search
  refetch();
};

const queryClient = new QueryClient()

const { data: results, isFetched, isFetching, refetch: _refetch } = useQuery(
  {
    queryKey: ['search', searchText, selectedTypes, selectedMirrors, currentPage],
    queryFn: () => trpc.findVideos.query({
      query: searchText.value,
      types: selectedTypes.value.length > 0 ? selectedTypes.value : undefined,
      acceptableMirrors: selectedMirrors.value.length > 0 ? selectedMirrors.value : undefined,
      page: currentPage.value,
    }),
    enabled: false,
  },
  queryClient,
);

const setPage = async (page: number) => {
  currentPage.value = page
  refetch()
};

// Simpler approach using a ref to track active video
const handleSetActive = (videoId: number) => {
  if (activeVideoId.value === videoId) activeVideoId.value = undefined;
  else activeVideoId.value = videoId;
};

const handleSearchChannel = (channelId: number) => {
  searchText.value = channelId.toString();
  search();
};

const paginationRange = computed(() => {
  const totalPages = results.value?.totalPages ?? 0;
  if (totalPages <= 1) return [];

  // Always show first, last, current page, and one page before/after current
  const pages = new Set([
    1,
    Math.max(1, currentPage.value - 1),
    currentPage.value,
    Math.min(totalPages, currentPage.value + 1),
    totalPages
  ]);

  return Array.from(pages).sort((a, b) => a - b);
});
</script>

<template>
  <main class="mx-auto flex flex-col items-center p-4 gap-4">
    <div class="flex flex-col gap-4 w-full max-w-2xl">
      <div class="flex flex-col gap-2">
        <div class="flex flex-row">
          <input v-model="searchText" @keyup.enter="search"
            class="rounded-l-lg py-2 px-3 w-full border border-r-0 border-emerald-400 outline-none"
            placeholder="Enter video URL, title, or channel name" />
          <button @click="search"
            class="bg-emerald-400 hover:bg-emerald-600 active:bg-emerald-700 text-white hover:text-emerald-200 active:text-emerald-400 transition-colors duration-150 px-4 rounded-r-lg">
            <i-mdi-search class="size-5" />
          </button>
        </div>
        <p v-if="searchText && !isUrlOrId" class="text-sm text-amber-600">
          <i-mdi-alert class="inline size-4 -mt-0.5" /> For best results, search by video ID or URL
        </p>
      </div>

      <div class="flex flex-row gap-4">
        <div class="flex flex-col gap-2">
          <span class="font-semibold text-sm">Video Type</span>
          <div class="flex flex-row gap-2">
            <label v-for="type in typeOptions" :key="type" class="flex items-center gap-1">
              <input type="checkbox" v-model="selectedTypes" :value="type" class="accent-emerald-600" />
              <span class="text-sm capitalize">{{ type }}</span>
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="font-semibold text-sm">Available Mirrors</span>
          <div class="flex flex-row gap-2">
            <label v-for="mirror in mirrorOptions" :key="mirror" class="flex items-center gap-1">
              <input type="checkbox" v-model="selectedMirrors" :value="mirror" class="accent-emerald-600" />
              <span class="text-sm">{{ formatMirrorName(mirror) }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isFetching" class="text-center text-gray-600">
      Loading...
    </div>

    <div v-else-if="results?.items.length" class="w-full max-w-2xl space-y-4">
      <VideoData v-for="video in results.items" :key="video.id" :video="video" :active="video.id === activeVideoId"
        @set-active="handleSetActive" @search-channel="handleSearchChannel" />

      <!-- Pagination -->
      <div v-if="results.totalPages > 1" class="flex justify-center gap-2 mt-4">
        <button v-for="page in paginationRange" :key="page" @click="setPage(page)" :class="[
          'px-3 py-1 rounded',
          page === currentPage
            ? 'bg-emerald-500 text-white'
            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
        ]">
          {{ page }}
        </button>
      </div>
    </div>

    <div v-else-if="isFetched" class="text-center text-gray-600">
      No results found
    </div>

    <div v-else class="text-center text-gray-600">
      Enter a search to begin
    </div>
  </main>
</template>
