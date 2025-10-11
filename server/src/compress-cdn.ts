import fs from "fs/promises";
import zlib from "zlib";
import { promisify } from "util";
import { getCdnBaseDir } from "./utils/cdn-path";
import { join } from "path";
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process'

const compress = promisify((zlib as any).zstdCompress as typeof zlib.unzip); // Node 22.15+

const main = async () => {
  const dir = getCdnBaseDir()
  const files = await fs.readdir(dir)
  const errored: string[] = []
  for (let i = 0; i < files.length; i++) {
    // if (i % 1000 === 0) console.log(`${i}/${files.length} (${(100 * i / files.length).toFixed(2)}%)`);

    const shortFile = files[i]
    const file = join(dir, shortFile);
    if (!file.endsWith('.m3u8')) continue

    let contents: string;
    try {
      contents = (await fs.readFile(file)).toString('utf-8')
    } catch (e) {
      console.error(`Failed to read ${file}`, e);
      continue;
    }

    // migrate
    const lines = contents.trim().split('\n')
    let root: string | undefined = undefined
    let failed: boolean = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.startsWith('http')) continue;
      if (!root) {
        root = line.split('/').slice(0, -1).join('/') + '/'
      }
      lines[i] = line.replace(root, '')
      if (line === lines[i]) {
        console.error('Failed to rewrite URL', file, line)
      }
    }
    if (failed) continue;
    if (!root) {
      failed = true
      console.error('Failed to find root URL path', file, contents)

      const rl = readline.createInterface({ input: stdin, output: stdout });
      const answer = await rl.question('Delete? y/N: ');
      rl.close()

      if (answer.toLowerCase() === 'y') {
        console.log('Deleting', file)
        try {
          await fs.unlink(file)
          errored.push(shortFile)
        } catch (e) {
          console.error(`Failed to unlink ${file}`, e)
        }
      } else {
        console.log('Skipping', file)
      }

      continue;
    }
    lines.unshift(root)
    const newContents = lines.join('\n')

    let compressed: Buffer;
    try {
      compressed = await compress(newContents);
    } catch (e) {
      console.error(`Failed to compress ${file}:`, e);
      continue;
    }

    const newFile = file + '.zst'
    try {
      await fs.writeFile(newFile, compressed)
    } catch (e) {
      console.error(`Failed to write ${newFile}`, e)
      continue;
    }

    try {
      await fs.unlink(file)
    } catch (e) {
      console.error(`Failed to unlink ${file}`, e)
      continue;
    }
  }
  if (errored.length) {
    console.info('Deleted errored files', errored.join('\n'))
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}
