import { addMirror, findMirror } from "./utils/videos";
import fs from "fs/promises";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";

const decompress = promisify((zlib as any).zstdDecompress as typeof zlib.unzip); // Node 22.15+

const RESUME_FILE = path.join(__dirname, "resume.json");

type ResumeData = { idx: number; found: number };

async function loadResume(): Promise<ResumeData> {
  try {
    const data = await fs.readFile(RESUME_FILE, "utf8");
    const obj = JSON.parse(data);
    return {
      idx: typeof obj.idx === "number" ? obj.idx : 0,
      found: typeof obj.found === "number" ? obj.found : 0,
    };
  } catch {
    return { idx: 0, found: 0 };
  }
}

async function saveResume(idx: number, found: number) {
  await fs.writeFile(RESUME_FILE, JSON.stringify({ idx, found }), "utf8");
}

async function main() {
  const addedDir = "C:\\Users\\lexikiq\\IdeaProjects\\twitch-items\\added";
  const files = await fs.readdir(addedDir);

  const zstFiles = files.filter(
    f => f.endsWith(".zst") && !f.startsWith("novideo_")
  );

  let totalFiles = zstFiles.length;
  let totalVideos = 0;
  const batchSize = 20;

  // Load and decompress all files, collect video IDs
  const allVideoIds = new Set<number>();
  let fileCount = 0;
  for (const file of zstFiles) {
    fileCount++;
    const filePath = path.join(addedDir, file);
    process.stdout.write(`[${fileCount}/${totalFiles}] Reading ${file}... `);

    let buf: Buffer;
    try {
      buf = await fs.readFile(filePath);
    } catch (e) {
      console.error(`Failed to read ${file}:`, e);
      continue;
    }

    let decompressed: Buffer;
    try {
      decompressed = await decompress(buf);
    } catch (e) {
      console.error(`Failed to decompress ${file}:`, e);
      continue;
    }

    const text = decompressed.toString("utf8");
    const matches = [...text.matchAll(/video:(\d+)/g)];
    const videoIds = matches.map(m => parseInt(m[1], 10));
    for (const vid of videoIds) {
      allVideoIds.add(vid);
    }
    process.stdout.write(`found ${videoIds.length} video IDs\n`);
  }

  const uniqueVideoIds = Array.from(allVideoIds);
  totalVideos = uniqueVideoIds.length;
  console.log(`Total unique video IDs: ${totalVideos}`);

  // Load resume data
  let { idx: resumeIdx, found: resumeFound } = await loadResume();
  let foundVideos = resumeFound;
  if (resumeIdx > 0 || resumeFound > 0) {
    console.log(`Resuming from video index ${resumeIdx + 1}, foundVideos=${foundVideos}`);
  } else {
    // TODO: load basic video metadata
    const csvFile = await fs.readFile("C:\\Users\\lexikiq\\.vodbot-twitch\\vods\\twitch_matches.csv", { encoding: 'utf-8' })
    const csv = (csvFile || '').trim().split(/\s+/).map(line => {
      const [videoId, twitchId] = line.trim().split(',')
      return { videoId, twitchId }
    }).sort((a, b) => a.twitchId.localeCompare(b.twitchId))

    for (const line of csv) {
      const twitchId = parseInt(line.twitchId?.split('_')?.[0])
      if (isNaN(twitchId)) {
        console.error("Invalid video", line)
        continue
      }
      try {
        await addMirror(twitchId, 'YOUTUBE', `https://youtu.be/${line.videoId}`)
      } catch (e: any) {
        const error = 'detail' in e && e.detail ? e.detail : e
        if (!String(error).includes('already exists')) {
          console.error('Failed to add mirror', error)
        }
      }
    }

    console.log('Added', csv.length, "YouTube video mirrors")
  }

  let videoIdx = resumeIdx;
  const pending = new Set<number>();

  async function runNext() {
    if (videoIdx >= uniqueVideoIds.length) return;
    const idx = videoIdx++;
    pending.add(idx);
    const vid = uniqueVideoIds[idx];
    try {
      const url = await findMirror(vid);
      if (url) {
        foundVideos++;
        process.stdout.write(`[${idx}/${totalVideos}] findMirror(${vid})... OK: ${url}\n`);
      } else {
        process.stdout.write(`[${idx}/${totalVideos}] findMirror(${vid})... not found\n`);
      }
    } catch (e) {
      foundVideos++; // this usually means the video was already added so we count it
      process.stdout.write(`[${idx}/${totalVideos}] findMirror(${vid})... error: ${e}\n`);
    } finally {
      pending.delete(idx);
      // Save resume at the smallest unfinished index (or next index if none pending)
      const minPending = pending.size > 0 ? Math.min(...pending) : videoIdx;
      await saveResume(minPending, foundVideos);
      // Launch next task if any remain
      if (videoIdx < uniqueVideoIds.length) {
        await runNext();
      }
    }
  }

  // Start up to batchSize concurrent tasks
  const starters = [];
  for (let i = 0; i < batchSize && videoIdx < uniqueVideoIds.length; i++) {
    starters.push(runNext());
  }
  await Promise.all(starters);

  console.log(
    `Done. Processed ${totalFiles} files, ${totalVideos} unique video IDs, ${foundVideos} mirrors found.`
  );

  // Reset resume file on completion
  await saveResume(0, 0);
}

if (require.main === module) {
  main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}
