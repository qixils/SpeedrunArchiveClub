import { z } from 'zod';

export const VideoTypeEnum = z.enum(['archive', 'highlight', 'upload']);
export const MirrorSourceEnum = z.enum(['INTERNET_ARCHIVE', 'YOUTUBE']);

export type VideoType = z.infer<typeof VideoTypeEnum>;
export type MirrorSource = z.infer<typeof MirrorSourceEnum>;
