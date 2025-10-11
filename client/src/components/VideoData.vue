<script setup lang="ts">
import { ref, computed, useTemplateRef, watch, shallowRef } from 'vue';
import type { RouterOutput } from '@/utils/trpc';
import { upperCamelCase } from '@/utils/strings';
import Hls from 'hls.js';

type VideoType = RouterOutput['findVideos']['items'][number];

interface Props {
  video: VideoType;
  active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
});

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getLanguageName = (code: string) => {
  try {
    return new Intl.DisplayNames(undefined, { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
};

const emit = defineEmits<{
  setActive: [videoId: number]
  searchChannel: [channelId: number]
}>();

const setActive = () => {
  emit('setActive', props.video.id)
}

const details = ref<HTMLElement | null>(null);

function beforeEnter(el: Element) {
  (el as HTMLElement).style.height = '0';
  (el as HTMLElement).style.opacity = '0';
}
function enter(el: Element) {
  const h = (el as HTMLElement).scrollHeight;
  (el as HTMLElement).style.transition = 'height 0.2s, opacity 0.2s';
  (el as HTMLElement).style.height = h + 'px';
  (el as HTMLElement).style.opacity = '1';
}
function afterEnter(el: Element) {
  (el as HTMLElement).style.height = '';
  (el as HTMLElement).style.transition = '';
}
function beforeLeave(el: Element) {
  (el as HTMLElement).style.height = (el as HTMLElement).scrollHeight + 'px';
  (el as HTMLElement).style.opacity = '1';
}
function leave(el: Element) {
  (el as HTMLElement).style.transition = 'height 0.2s, opacity 0.2s';
  (el as HTMLElement).style.height = '0';
  (el as HTMLElement).style.opacity = '0';
}
function afterLeave(el: Element) {
  (el as HTMLElement).style.height = '';
  (el as HTMLElement).style.transition = '';
}

const selectedMirrorIdx = ref<number>();

const selectedMirror = computed(() => {
  if (selectedMirrorIdx.value === undefined) return

  const obj = props.video.mirrors[selectedMirrorIdx.value]
  if (!obj) return

  let embedUrl: string | undefined = obj.url
  if (obj.source === 'YOUTUBE') {
    // Handles various YouTube URL formats
    const re = /(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = obj.url.match(re);
    if (match) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}`
    } else {
      embedUrl = undefined
    }
  }

  return {
    ...obj,
    embedUrl,
  }
})

function selectMirror(mirrorIdx: number) {
  selectedMirrorIdx.value = mirrorIdx === selectedMirrorIdx.value ? undefined : mirrorIdx;
}

const iaVideoEl = useTemplateRef('iaVideo')
const useCorsProxy = ref(false)
const hlsInstance = shallowRef<Hls>()
watch([iaVideoEl, useCorsProxy], ([video, cors]) => {
  if (hlsInstance.value) {
    hlsInstance.value.destroy()
    hlsInstance.value = undefined
  }

  if (!video) return
  let videoSrc = selectedMirror.value?.url
  if (!videoSrc) return

  if (cors) videoSrc = `${videoSrc}?cors=true`;

  if (Hls.isSupported()) {
    const hls = new Hls();
    hlsInstance.value = hls
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  }
  else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
  }
})
</script>

<template>
  <div class="bg-sky-50 border-sky-200 dark:bg-sky-950 dark:border-sky-700 border-2 p-1 px-3 rounded">
    <div class="flex flex-row justify-between gap-3">
      <div class="flex flex-row items-center gap-3">
        <!-- Profile picture from video.channel; placeholder if missing -->
        <img v-if="video.channel?.profile_image_url" :src="video.channel.profile_image_url" alt="Profile Picture"
          class="w-8 h-8 aspect-square rounded-full object-cover shrink-0" />
        <div v-else
          class="w-8 h-8 aspect-square rounded-full bg-neutral-300 flex items-center justify-center text-neutral-600 text-xs shrink-0"
          title="No profile picture">
          <span>
            {{ video.channel?.display_name?.charAt(0) || '?' }}
          </span>
        </div>
        <div>
          <p>{{ video.title }}</p>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            <a @click="$emit('searchChannel', video.channel_id)" class="hover:underline cursor-pointer">
              {{ video.channel?.display_name || video.channel_id }}
            </a>
            on {{ new Date(video.created_at).toLocaleDateString() }}
          </p>
        </div>
      </div>
      <div class="flex flex-row gap-1 items-center">
        <button v-if="video.mirrors?.length"
          class="text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
          @click="setActive()">
          <!-- film camera icon to indicate an archive exists-->
          <i-mdi-video class="size-5" />
        </button>
        <button class="text-neutral-400 hover:text-neutral-500" @click="setActive()">
          <i-mdi-arrow-down-drop :class="active ? 'rotate-0' : '-rotate-90'"
            class="size-5 transition-transform duration-150" />
        </button>
      </div>
    </div>
    <!-- Collapse/hide below div when `active` is false (with animation) -->
    <transition @before-enter="beforeEnter" @enter="enter" @after-enter="afterEnter" @before-leave="beforeLeave"
      @leave="leave" @after-leave="afterLeave">
      <div v-show="active" ref="details">
        <div class="flex flex-row gap-1">
          <div>
            <p class="flex flex-row items-center gap-1">
              <i-mdi:clock class="size-5" />
              {{ formatDuration(video.duration_seconds) }}
            </p>
            <p class="flex flex-row items-center gap-1">
              <i-mdi:eye class="size-5" />
              {{ video.view_count.toLocaleString() }}
            </p>
            <p class="flex flex-row items-center gap-1" v-if="video.language">
              <i-mdi:language class="size-5" />
              {{ getLanguageName(video.language) }}
            </p>
            <p class="flex flex-row items-center gap-1">
              <i-mdi:tv-classic class="size-5" />
              <span class="capitalize">{{ video.type }}</span>
            </p>

            <div v-if="video.mirrors?.length">
              <h3 class="font-semibold">Archives</h3>
              <div class="flex flex-row gap-2">
                <button v-for="(mirror, idx) in video.mirrors" :key="mirror.source"
                  class="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium"
                  @click="selectMirror(idx)" :class="{ 'bg-blue-300': selectedMirrorIdx === idx }">
                  {{ $t(`short_mirror.${mirror.source.toLowerCase()}`, upperCamelCase(mirror.source)) }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="selectedMirror" class="flex-1 flex flex-col gap-1 items-end">
            <template v-if="selectedMirror.source === 'INTERNET_ARCHIVE'">
              <video ref="iaVideo" controls style="width: 100%; aspect-ratio: 16/9; max-width: 560px;"
                crossorigin="anonymous" playsinline></video>
              <p class="text-end">
                web playback may require
                <a @click="useCorsProxy = !useCorsProxy" class="cursor-pointer"> cors proxy </a>
                <br />or (more reliable) installing
                <a href="/about#cors-patchers" target="_blank"> cors patchers </a>
              </p>
              <p class="text-end">
                or: <a :href="selectedMirror.url">download stream file</a>
                <br />(compatible with yt-dlp, vlc)
              </p>
            </template>
            <template v-else-if="selectedMirror.source === 'YOUTUBE' && selectedMirror.embedUrl">
              <iframe :src="selectedMirror.embedUrl" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen style="width: 100%; aspect-ratio: 16/9; max-width: 560px;"></iframe>
            </template>
            <template v-else>
              <a :href="selectedMirror.url" target="_blank" class="text-blue-600 hover:underline">
                Open in new tab
              </a>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped></style>
