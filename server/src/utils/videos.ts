import fs from 'fs/promises';
import { query, queryOne } from './db';
import { getUsers } from './twitch';
import { getCdnBaseDir, getCdnM3u8Path } from './cdn-path';
import type { MirrorSource, VideoType } from '../types/query';
import type { ChannelVideoCoreResponse, VideoMetadataResponse } from '../types/gql';
import { fetchJson, fetchJsonWithUrl, fetchText } from './networking';
import { WaybackAvailableSchema } from '../types/ia';
import { type PaginatedResponse, type Video, type VideoOutput, type VideoQuery, VideoQuerySchema, type VideoSearchParams } from '../types/videos';

// TODO: improve pagination performance (since this dataset is fairly static: https://dba.stackexchange.com/a/308354)
const ITEMS_PER_PAGE = 250;
const baseVideoQuery = `
    SELECT
        v.id,
        v.channel_id,
        v.title,
        v.duration_seconds,
        v.view_count,
        v.language,
        v.type,
        v.created_at,
        count(v.id) OVER() AS full_count,
        COALESCE(
            json_agg(
                CASE WHEN m.id IS NOT NULL
                THEN json_build_object(
                    'id', m.id,
                    'source', m.source,
                    'url', m.url
                )
                END
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
        ) as mirrors
    FROM videos v
    LEFT JOIN mirrors m ON v.id = m.id
    %%WHERE_CONDITIONS%%
    GROUP BY v.id
    ORDER BY v.created_at DESC
    LIMIT ${ITEMS_PER_PAGE}
    OFFSET %%OFFSET%%
`;
const oneVideoQuery = `
    SELECT
        v.id,
        v.channel_id,
        v.title,
        v.duration_seconds,
        v.view_count,
        v.language,
        v.type,
        v.created_at,
        COALESCE(
            json_agg(
                CASE WHEN m.id IS NOT NULL
                THEN json_build_object(
                    'id', m.id,
                    'source', m.source,
                    'url', m.url
                )
                END
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::json
        ) as mirrors
    FROM videos v
    LEFT JOIN mirrors m ON v.id = m.id
    WHERE v.id = $1
    GROUP BY v.id
    ORDER BY v.created_at DESC
    LIMIT 1
`;

// const iaPrefix = 'https://web.archive.org/web/20250509131638id_/';

function extractIaPrefix(url: string) {
  const match = url.match(/https?:\/\/web\.archive\.org\/web\/(\d+)(?:id_)?\/(.+)/);
  if (!match) return;

  const [timestamp, path] = match.slice(1);
  const prefix = `https://web.archive.org/web/${timestamp}id_/`;
  const fixed = `${prefix}${path}`;
  return {
    timestamp,
    prefix,
    path,
    fixed,
  }
}

function applyIaPrefix(url: string, prefix: string) {
  const path = extractIaPrefix(url)?.path || url;
  return `${prefix}${path}`;
}

// Helper function to chunk array into groups of n
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function fixVideo(video: Video) {
  return {
    ...video,
    // TODO: this can work I think but the types are not setup correctly for it
    // created_at: new Date(video.created_at),
    mirrors: (video.mirrors || []).map(mirror => {
      if (mirror.source !== 'INTERNET_ARCHIVE') return mirror
      const match = mirror.url.match(/(\d+\.m3u8)$/)
      if (!match?.[1]) return mirror
      return {
        ...mirror,
        url: `http://localhost:3000/cdn/${match}`,
      }
    })
  }
}

export async function searchVideos(params: VideoSearchParams): Promise<PaginatedResponse<VideoOutput>> {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  // Check if query is a numeric string first
  const isNumeric = /^\d+$/.test(params.query);
  const searchConditions = [];

  if (isNumeric) {
    const numericValue = parseInt(params.query);
    // Try both video ID and channel ID
    searchConditions.push(`v.id = $${paramCount}`);
    values.push(numericValue);
    paramCount++;
    searchConditions.push(`v.channel_id = $${paramCount}`);
    values.push(numericValue);
    paramCount++;
  } else {
    // Parse potential video ID from twitch.tv URLs
    const videoIdMatch = params.query.match(/twitch\.tv\/(?:videos\/|\w+\/[bcv]\/|.+video=v?)(\d+)/i);
    const channelMatch = params.query.match(/twitch\.tv\/(\w+)/i);

    // Try to find channel info if there's a channel match
    if (channelMatch && channelMatch[1]) {
      // For channel name search we only need one request since it's a single login
      const users = await getUsers({ login: [channelMatch[1]] });
      if (users.data.length > 0) {
        const placeholders = users.data.map(() => `$${paramCount++}`).join(',');
        searchConditions.push(`v.channel_id IN (${placeholders})`);
        values.push(...users.data.map(user => parseInt(user.id)));
      }
    }

    // Video ID match (most specific)
    if (videoIdMatch && videoIdMatch[1]) {
      searchConditions.push(`v.id = $${paramCount}`);
      values.push(parseInt(videoIdMatch[1]));
      paramCount++;
    }

    // Title search using Full Text Search
    searchConditions.push(`v.title_tsv @@ websearch_to_tsquery('english', $${paramCount})`);
    values.push(params.query);
    paramCount++;
  }

  conditions.push(`(${searchConditions.join(' OR ')})`);

  // Add type filter
  if (params.types && params.types.length > 0) {
    const typePlaceholders = params.types.map(() => `$${paramCount++}`).join(',');
    conditions.push(`v.type IN (${typePlaceholders})`);
    values.push(...params.types);
  }

  // Add mirror filter
  if (params.acceptableMirrors && params.acceptableMirrors.length > 0) {
    const mirrorPlaceholders = params.acceptableMirrors.map(() => `$${paramCount++}`).join(',');
    conditions.push(`EXISTS (
      SELECT 1 FROM mirrors m2
      WHERE m2.id = v.id AND m2.source IN (${mirrorPlaceholders})
    )`);
    values.push(...params.acceptableMirrors);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const fullQuery = baseVideoQuery.replace('%%WHERE_CONDITIONS%%', whereClause).replace('%%OFFSET%%', String((params.page - 1) * ITEMS_PER_PAGE));

  const results = VideoQuerySchema.parse(
    await query<VideoQuery>(fullQuery, values)
  );
  const totalPages = Math.ceil((results[0]?.full_count || 0) / ITEMS_PER_PAGE);

  // Get channel information from Twitch in chunks of 100
  const resultChannelIds = [...new Set(results.map(v => v.channel_id))];
  const channelResponses = await Promise.all(
    chunk(resultChannelIds.map(String), 100).map(ids =>
      getUsers({ id: ids })
    )
  );

  const channelMap = new Map(
    channelResponses.flatMap(response =>
      response.data.map(user => [parseInt(user.id), user])
    )
  );

  return {
    items: results.map(video => ({
      ...fixVideo(video),
      channel: channelMap.get(video.channel_id),
    })),
    totalPages,
    currentPage: params.page,
  };
}

export async function getVideoById(id: number): Promise<VideoOutput | undefined> {
  const result = await queryOne<Video>(oneVideoQuery, [id]);

  if (!result) return undefined;

  const { data: [channel] } = await getUsers({ id: [String(result.channel_id)] })

  return {
    ...fixVideo(result),
    channel,
  }
}

export async function addVideo(video: Omit<Video, 'mirrors'>): Promise<Video> {
  const result = await queryOne<Video>(`
      INSERT INTO videos (id, channel_id, title, duration_seconds, view_count, language, type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
    video.id,
    video.channel_id,
    video.title,
    video.duration_seconds,
    video.view_count,
    video.language,
    video.type,
    video.created_at,
  ]);

  if (!result) throw new Error('Failed to insert video');
  return {
    ...fixVideo(result),
    mirrors: [],
  };
}

/**
 * Insert a new Video from VideoMetadataResponse if it does not already exist.
 * Returns the Video row (new or existing).
 */
export async function addVideoFromMetadata(
  videoMetadata?: VideoMetadataResponse,
): ReturnType<typeof getVideoById> {
  const v = videoMetadata?.data?.video;
  if (!v) throw new Error('No video data in metadata');

  const { title, lengthSeconds: duration_seconds, viewCount: view_count } = v;
  const type = v.broadcastType.includes('PREMIERE') ? 'upload' : v.broadcastType.toLowerCase() as VideoType;
  const id = parseInt(v.id);
  const channel_id = parseInt(v.owner.id);
  const created_at = new Date(v.createdAt);

  // Insert video
  const inserted = await addVideo({
    id,
    channel_id,
    title,
    duration_seconds,
    view_count,
    language: undefined, // Not available in metadata
    type,
    created_at,
  });

  return inserted;
}

export async function addMirror(videoId: number, source: MirrorSource, url: string): Promise<void> {
  await query(`
    INSERT INTO mirrors (id, source, url)
    VALUES ($1, $2, $3)
  `, [videoId, source, url]);
}

export async function fetchUnwrap<T>(url: string): Promise<{ url: string, json: T } | undefined> {
  const resp = await fetchJsonWithUrl(url);
  if (!resp) return;
  const json = Array.isArray(resp.json) ? resp.json[0] : resp.json;
  return { ...resp, json }
}

// Find an Internet Archive m3u8 mirror for a Twitch video
export async function findMirror(videoId: number): Promise<string | undefined> {
  let video = await getVideoById(videoId);

  if (!video) {
    // 1. Get username from ChannelVideoCore
    const channelVideoCoreUrl = `https://web.archive.org/web/30000101000000id_/https://gql.twitch.tv/gql?operationName=ChannelVideoCore&variables_videoID=${videoId}`;
    const channelVideoCore = await fetchUnwrap<ChannelVideoCoreResponse>(channelVideoCoreUrl);
    const username = channelVideoCore?.json?.data?.video?.owner?.login;
    if (!username) {
      console.error('Failed to find username from ChannelVideoCore');
      return;
    }

    // 2. Get video metadata (not strictly needed for m3u8, but for completeness)
    const iaPrefix = extractIaPrefix(channelVideoCore.url)?.prefix;
    if (!iaPrefix) {
      console.error('Failed to extract IA prefix from ChannelVideoCore URL', channelVideoCore.url);
      return;
    }
    const videoMetadataUrl = applyIaPrefix(`https://gql.twitch.tv/gql?operationName=VideoMetadata&variables_channelLogin=${username}&variables_videoID=${videoId}`, iaPrefix);
    const videoMetadata = await fetchUnwrap<VideoMetadataResponse>(videoMetadataUrl);
    try {
      video = await addVideoFromMetadata(videoMetadata?.json);
    } catch (e) {
      console.error('Error inserting video from metadata:', e);
      return;
    }
  }

  if (!video) {
    console.error('Failed to find video from metadata');
    return;
  }

  if (video.mirrors.find(m => m.source === 'INTERNET_ARCHIVE')) {
    console.warn('Video already has an Internet Archive mirror');
    return;
  }

  /*
  // 3. Get playback access token
  const playbackTokenUrl = `${iaPrefix}https://gql.twitch.tv/gql?operationName=PlaybackAccessToken_Template&variables_isLive=false&variables_isVod=true&variables_login=&variables_platform=web&variables_playerType=site&variables_vodID=${videoId}`;
  const playbackToken = await fetchUnwrap(playbackTokenUrl) as PlaybackAccessTokenResponse | undefined;
  const tokenData = playbackToken?.data?.videoPlaybackAccessToken;
  if (!tokenData) return;
  const { value, signature } = tokenData;
  if (!value || !signature) return;

  // 4. Get app version from archived Twitch video page
  // !! This is how the archive scripts did it, but the version hasn't actually changed so we just hardcode it for convenience for now
  // !! In the future, we could follow the redirects of the playbackToken query to find its IA prefix, and then fetch the corresponding Twitch page
  // const twitchPageUrl = `${iaPrefix}https://www.twitch.tv/videos/${videoId}`;
  // const twitchPageText = await fetchText(twitchPageUrl);
  // if (!twitchPageText) return;
  // const twilightBuildIdMatch = twitchPageText.match(/window\.__twilightBuildID\s*=\s*"([a-f0-9-]+)"/);
  // const appVersion = twilightBuildIdMatch?.[1];
  // if (!appVersion) return;
  // !! base64 encode JSON: {"AppVersion":"..."}
  // const appVersionJson = JSON.stringify({ AppVersion: appVersion });
  // const appVersionBase64 = Buffer.from(appVersionJson).toString('base64');
  const appVersionBase64 = 'eyJBcHBWZXJzaW9uIjoiODY0YzlmNDctMTg0YS00M2RiLTk0NmEtNDU5MTQ4NzYwMjU4In0='

  // 5. Build usher m3u8 URL
  const usherUrl = `${iaPrefix}https://usher.ttvnw.net/vod/${videoId}.m3u8?acmb=${encodeURIComponent(appVersionBase64)}&allow_source=true&browser_family=firefox&browser_version=128.0&cdm=wv&os_name=Linux&os_version=undefined&p=9000000&platform=web&play_session_id=00000000000000000000000000000000&player_backend=mediaplayer&player_version=1.41.0-skippable.alpha.1&playlist_include_framerate=true&reassignments_supported=true&sig=${encodeURIComponent(signature)}&supported_codecs=av1,h264&token=${encodeURIComponent(value)}&transcode_mode=cbr_v1`;
  */

  let usherUrlBase: string | undefined = undefined;

  const findFromJson = async () => {
    const usherUrlRepsonse = await fetchJson(`https://archive.org/wayback/available?url=https://usher.ttvnw.net/vod/${videoId}.m3u8*`, undefined, 100)
    if (!usherUrlRepsonse) return;

    const parseResult = WaybackAvailableSchema.safeParse(usherUrlRepsonse);
    if (!parseResult.success) return;

    const { url } = parseResult.data.archived_snapshots?.closest || {}
    if (!url) return

    // console.log(`JSON found`)//, url)
    return url
  }

  const findFromCdx = async () => {
    const cdxResponse = await fetchText(`https://web.archive.org/cdx/search/cdx?url=usher.ttvnw.net/vod/${videoId}.m3u8*&limit=-1&fastLatest=true`, undefined, 100);
    if (!cdxResponse) return;

    const cdxMatch = cdxResponse.match(/^net,ttvnw,usher\)(\S+)\s+(\d+)/);
    if (!cdxMatch) return;

    const url = `https://web.archive.org/web/${cdxMatch[2]}id_/https://usher.ttvnw.net${cdxMatch[1]}`
    // console.log(`CDX found`)//, url)
    return url
  }

  usherUrlBase = await findFromJson();
  if (!usherUrlBase) usherUrlBase = await findFromCdx();
  if (!usherUrlBase) {
    console.error('Failed to find usher URL');
    return;
  }

  const usherUrlData = extractIaPrefix(usherUrlBase);
  if (!usherUrlData) {
    console.error('Failed to extract IA prefix from usher URL');
    return;
  }

  const iaPrefix = usherUrlData.prefix;
  const usherUrl = usherUrlData.fixed;

  // 6. Fetch the m3u8 playlist
  const m3u8Text = await fetchText(usherUrl, undefined, 4);
  if (!m3u8Text) {
    console.error('Failed to fetch m3u8 playlist');
    return;
  }

  // 7. Find the chunked/highest bandwidth m3u8 URL in the playlist
  // Look for lines ending with .m3u8 and containing 'chunked' or highest BANDWIDTH
  const m3u8Lines = m3u8Text.split('\n');
  let archiveM3u8Url: string | undefined = undefined;
  let maxBandwidth = 0;
  for (let i = 0; i < m3u8Lines.length; i++) {
    const line = m3u8Lines[i];
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
      const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0;
      const nextLine = m3u8Lines[i + 1];
      if (nextLine && nextLine.endsWith('.m3u8')) {
        if (nextLine.includes('chunked')) {
          archiveM3u8Url = nextLine;
          break;
        } else if (bandwidth > maxBandwidth) {
          archiveM3u8Url = nextLine;
          maxBandwidth = bandwidth;
        }
      }
    }
  }
  if (!archiveM3u8Url) {
    console.error('No chunked or highest bandwidth m3u8 URL found in playlist');
    return;
  }
  // Prefix with IA URL
  const iaM3u8Url = applyIaPrefix(archiveM3u8Url, iaPrefix);

  // Fetch the m3u8 file contents
  const iaM3u8Text = await fetchText(iaM3u8Url, undefined, 4);
  if (!iaM3u8Text) {
    console.error('Failed to fetch m3u8 file contents');
    return;
  }

  // Rewrite the m3u8: replace segment lines with IA-prefixed URLs
  const prefix = iaM3u8Url.split("/").slice(0, -1).join("/") + '/$1';
  // Replace lines that are not comments (do not start with #)
  const processedM3u8Text = iaM3u8Text.replace(/^(?!#)([^\r\n]+)/gm, (match) => prefix.replace('$1', match));

  // Save the processed m3u8
  const baseDir = getCdnBaseDir();
  await fs.mkdir(baseDir, { recursive: true });
  const m3u8Path = getCdnM3u8Path(videoId);
  await fs.writeFile(m3u8Path, processedM3u8Text, 'utf8');

  const videoUrl = `${videoId}.m3u8`;

  // Save the mirror to the database with source 'INTERNET_ARCHIVE'
  await addMirror(videoId, 'INTERNET_ARCHIVE', videoUrl);

  // Return the CDN URL
  return videoUrl;
}
