import path from 'path';

/**
 * Returns the absolute path to the CDN directory for the current OS/user.
 */
export function getCdnBaseDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || process.env.LOCALAPPDATA || 'C:/Users/Public', 'SpeedrunArchiveClub', 'cdn');
  } else if (process.platform === 'darwin') {
    return path.join(process.env.HOME || '', 'Library', 'Application Support', 'speedrunarchiveclub', 'cdn');
  } else {
    return path.join(process.env.HOME || '', '.local', 'share', 'speedrunarchiveclub', 'cdn');
  }
}

/**
 * Returns the absolute path to a specific m3u8 file in the CDN directory.
 */
export function getCdnM3u8Path(videoId: number | string): string {
  return path.join(getCdnBaseDir(), `${videoId}.m3u8`);
}
