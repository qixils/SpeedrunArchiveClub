<template>
  <main class="space-y-2">
    <h1 class="font-bold text-2xl text-emerald-700 dark:text-emerald-300" id="about">About</h1>
    <p>
      This website holds an archive of metadata for over 60 million Twitch videos, and video content
      for over 630,000. While this project was designed initially for speedruns, a large variety of
      popular streams were saved, as well as the metadata for every public video on the site
      (as of April 23, 2025; ongoing archives to begin at a later™ date).
    </p>
    <h2 class="font-semibold text-xl text-emerald-800 dark:text-emerald-200" id="usage">Usage</h2>
    <p>
      On the Search page you can input a link to a video, a link to a streamer, or a video title
      search term. You can optionally filter to only certain types of videos or only videos
      with archives available. Press Enter or click the Search button to submit your search.
    </p>
    <p>
      Once you submit your search, you'll see a list of results. You can click on each one to
      bring up more information, including where to watch the broadcast (if available).
    </p>
    <h3 class="font-medium text-lg text-emerald-900 dark:text-emerald-100" id="wayback-machine">Wayback Machine archives
    </h3>
    <p>
      Internet Archive currently does not include CORS headers on its Wayback Machine endpoints
      which makes it impossible to playback in an embed. Additionally, the video streams
      consist of hundreds or thousands of video segments, so it's impossible to provide a direct
      download link.
    </p>
    <p id="cors-patchers">
      As a workaround for easy playback, I've added an option to toggle on a CORS HTTP proxy,
      although these services can be slow or block certain kinds of requests.
      If you're facing issues, you may be able to install a CORS patcher addon for
      <a href="https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/" target="_blank"> Firefox </a>
      or <a href="https://chromewebstore.google.com/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino?hl=en"
        target="_blank"> Chrome </a>
      but please be aware that CORS helps protect your user data from being exfiltrated to other
      services, so I would recommend only using an addon when necessary.
    </p>
    <p>
      You can also download the video stream file and load it in
      <a href="https://www.videolan.org/vlc/" target="_blank">VLC</a>.
      MPV sorta works but doesn't buffer any video segments so it's a poor experience.
      If you need to download the full video stream,
      <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">yt-dlp</a> works.
    </p>
    <h2 class="font-semibold text-xl text-emerald-800 dark:text-emerald-200" id="backstory">Backstory</h2>
    <p>
      On February 19, 2025, the livestreaming platform Twitch announced that effective immediately,
      streamers could no longer permanently save more than 100 hours worth of content to their account.
      Beginning on April 19, later postponed to May 19, they would retroactively enforce this rule
      by automatically deleting content with less-viewed content, leaving only the 100 most-viewed hours
      of content on every channel.
    </p>
    <p>
      Within days of the announcement, and having remembered the aftermath of lost speedruns following the
      mass privatization of unlisted YouTube videos in 2021,
      I (<a href="https://qixils.dev/socials">lexikiq</a>) began scraping all videos on speedrun.com and
      cross-referencing them against Twitch's API to find which videos appeared to be at risk of deletion.
    </p>
    <p>
      Simultaneously, <a href="https://wiki.archiveteam.org/index.php/User:Arkiver">arkiver</a> of the
      <a href="https://wiki.archiveteam.org/">ArchiveTeam</a> began working to identify all the GraphQL
      queries used by the Twitch app to fetch the metadata for videos and began scraping all 2bn+ IDs in
      bulk using AT's
      <a href="https://wiki.archiveteam.org/index.php/ArchiveTeam_Warrior">distributed warrior system</a>.
    </p>
    <p>
      While this scrape was in progress, I finished my list of speedruns as well as a larger list of
      highly viewed videos on the site as a whole using a scrape of my own, and shared them with arkiver
      who ultimately was very generously able to offer nearly half a petabyte of storage on the
      Internet Archive's servers to save video content. In the end we were able to save over 630,000 videos
      and the metadata of tens of millions more.
      <i>
        Due to technical issues, some archived data is currently unavailable through this tool.
        While I am slowly recovering it, you can also manually recover data using the instructions
        shared by arkiver on the AT wiki
        <a href="https://wiki.archiveteam.org/index.php/Twitch#2025_DPoS_project">here</a>.
      </i>
    </p>
    <p>
      A few speedrun mirrors are also available on YouTube, notably some longer videos that failed
      in the AT Warrior's queue. This collection is much more limited however, totaling only ~3700 videos,
      and many of them facing issues from copyrighted audio.
    </p>
  </main>
</template>

<style scoped>
:target {
  position: relative;
}

:target::before {
  content: '';
  position: absolute;
  inset: -0.25rem -0.5rem;
  /* emerald-500 */
  background-color: oklch(69.6% 0.17 162.48 / 20%);
  border-radius: 0.25rem;
  z-index: -1;
}
</style>
