<template>
  <main class="space-y-2">
    <h1 class="font-bold text-xl">About</h1>
    <p>
      This website holds an archive of metadata for over 60 million Twitch videos, and video content
      for over 630,000. While this project was designed initially for speedruns, a large variety of
      popular streams were saved, as well as the metadata for every public video on the site
      (as of April 23, 2025; ongoing archives to begin at a later™ date).
    </p>
    <h2 class="font-semibold text-lg">Backstory</h2>
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
