<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { hashKey, QueryClient, useQuery } from '@tanstack/vue-query';
import { trpc } from '../utils/trpc';
import VideoData from '../components/VideoData.vue';
import { VideoTypeEnum, MirrorSourceEnum, type VideoType, type MirrorSource } from 'server/src/types/query';
import { upperCamelCase } from '@/utils/strings';

const searchText = ref('');
const _selectedTypes = ref<VideoType[]>([]);
const selectedTypes = computed(() => [...new Set(_selectedTypes.value)].sort())
const _selectedMirrors = ref<MirrorSource[]>(['INTERNET_ARCHIVE', 'YOUTUBE']);
const selectedMirrors = computed(() => [...new Set(_selectedMirrors.value)].sort())
const currentPage = ref<string>();
const activeVideoId = ref<number>();

const typeOptions = Object.values(VideoTypeEnum.enum);
const mirrorOptions = Object.values(MirrorSourceEnum.enum);

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

  if (data?.after || currentPage.value) return;

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
      result.push(result[i]!.concat(el));
    }
  }
  return result.map(arr => [...new Set(arr)].sort());
}

// Helper: all supersets of a subset within a set (for permutations containing at least all elements in subset)
function getAllSupersets<T>(subset: T[], fullset: readonly T[]): T[][] {
  // All subsets of fullset that include all elements in subset
  const all = getAllSubsets(fullset);
  return all.filter(s => subset.every(x => s.includes(x)));
}

const search = () => {
  // if (!searchText.value.trim()) return;
  currentPage.value = undefined; // Reset to first page on new search
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
      after: currentPage.value,
    }),
    enabled: false,
  },
  queryClient,
);

const previousPages = ref<Record<string, string | null>>({})

const nextPageCursor = computed<string | undefined>(() => results.value?.after)
const previousPageCursor = computed<string | null | undefined>(() => currentPage.value ? previousPages.value[hashKey(['search', searchText.value, selectedTypes.value, selectedMirrors.value, currentPage.value])] : undefined)

const nextPage = async () => {
  if (nextPageCursor.value === undefined) return

  const nextHash = hashKey(['search', searchText.value, selectedTypes.value, selectedMirrors.value, nextPageCursor.value])
  previousPages.value[nextHash] = currentPage.value || null

  currentPage.value = nextPageCursor.value || undefined

  await nextTick()
  if (isFetched.value) return
  refetch() // not yet cached, lets grab it
}

const previousPage = async () => {
  if (previousPageCursor.value === undefined) return
  currentPage.value = previousPageCursor.value || undefined

  await nextTick()
  if (isFetched.value) return
  refetch() // we lost the cache, grab it again
}

const handleSetActive = (videoId: number) => {
  if (activeVideoId.value === videoId) activeVideoId.value = undefined;
  else activeVideoId.value = videoId;
};

const handleSearchChannel = (channelId: number) => {
  searchText.value = channelId.toString();
  search();
};

onMounted(() => search())
</script>

<template>
  <main class="flex flex-col items-stretch gap-4">
    <p class="text-center">Search for metadata and video archives of Twitch broadcasts</p>

    <div class="flex flex-col items-stretch gap-2">
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
            <input type="checkbox" v-model="_selectedTypes" :value="type" class="accent-emerald-600" />
            <span class="text-sm capitalize">{{ type }}</span>
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="font-semibold text-sm">Available Mirrors</span>
        <div class="flex flex-row gap-2">
          <label v-for="mirror in mirrorOptions" :key="mirror" class="flex items-center gap-1">
            <input type="checkbox" v-model="_selectedMirrors" :value="mirror" class="accent-emerald-600" />
            <span class="text-sm">{{ $t(`mirror.${mirror.toLowerCase()}`, upperCamelCase(mirror)) }}</span>
          </label>
        </div>
      </div>
    </div>

    <div v-if="isFetching" class="text-center text-gray-600">
      Loading...
    </div>

    <div v-else-if="results?.items.length" class="space-y-2">
      <VideoData v-for="video in results.items" :key="video.id" :video="video" :active="video.id === activeVideoId"
        @set-active="handleSetActive" @search-channel="handleSearchChannel" />

      <!-- Pagination -->
      <div class="flex justify-center gap-0.5 mt-4">
        <button @click="previousPage()" :disabled="previousPageCursor === undefined"
          class="rounded-l px-2.5 py-1.5 bg-emerald-100 enabled:hover:bg-emerald-200 text-emerald-800 disabled:opacity-50 font-semibold">
          ⮜ Previous
        </button>
        <button @click="nextPage()" :disabled="nextPageCursor === undefined"
          class="rounded-r px-2.5 py-1.5 bg-emerald-100 enabled:hover:bg-emerald-200 text-emerald-800 disabled:opacity-50 font-semibold">
          Next ⮞
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
