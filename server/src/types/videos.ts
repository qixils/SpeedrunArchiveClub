import z from "zod";
import { MirrorSourceEnum, VideoTypeEnum } from './query';

export const TwitchUserSchema = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
  profile_image_url: z.string(),
}).nullable()

export const VideoSchema = z.object({
  id: z.coerce.number().int().nonnegative(),
  channel_id: z.coerce.number().int().nonnegative(),
  title: z.string(),
  duration_seconds: z.coerce.number().int().nonnegative(),
  view_count: z.coerce.number().int().nonnegative(),
  language: z.string().nullish(),
  type: VideoTypeEnum,
  created_at: z.coerce.date(),
  mirrors: z.array(z.object({
    id: z.coerce.number().int().nonnegative(),
    source: MirrorSourceEnum,
    url: z.string(),
  })).default([]),
})

export type Video = z.infer<typeof VideoSchema>;

// Response from SQL search query
export const VideoQuerySchema = z.array(VideoSchema.extend({
  // TODO: mirrors should be moved here too
  full_count: z.coerce.number().int().default(0),
}))

export type VideoQuery = z.infer<typeof VideoQuerySchema>

export const VideoOutputSchema = VideoSchema.extend({
  channel: TwitchUserSchema.optional(),
})

export type VideoOutput = z.infer<typeof VideoOutputSchema>

export const VideoSearchParamsSchema = z.object({
  query: z.string(),
  types: z.array(VideoTypeEnum).optional(),
  acceptableMirrors: z.array(MirrorSourceEnum).optional(),
  after: z.string().optional(),
})

export type VideoSearchParams = z.infer<typeof VideoSearchParamsSchema>

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(schema: T) => {
  return z.object({
    items: z.array(schema),
    after: z.string().optional(),
  })
}

export interface PaginatedResponse<T> {
  items: T[];
  after?: string;
}
