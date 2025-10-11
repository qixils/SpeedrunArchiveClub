import { initTRPC, TRPCError } from '@trpc/server';
import type { OpenApiMeta } from 'trpc-to-openapi';
import { z } from 'zod';
import { searchVideos, getVideoById, addVideo, addMirror } from './utils/videos';
import { MirrorSourceEnum } from './types/query';
import { PaginatedResponseSchema, VideoOutputSchema, VideoSchema, VideoSearchParamsSchema } from './types/videos';
import { cacheMem } from './utils/cache';

type Context = {
  adminSecret?: string;
};

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create();

const isAdmin = t.middleware(({ next, ctx }) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin secret not configured' });

  if (ctx.adminSecret !== adminSecret) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({ ctx });
});

const adminProcedure = t.procedure.use(isAdmin);

export const router = t.router({
  findVideos: t.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/videos',
        tags: ['videos'],
        summary: 'Search for videos',
      }
    })
    .input(VideoSearchParamsSchema)
    .output(PaginatedResponseSchema(VideoOutputSchema))
    .query(async ({ input }) => {
      const cacheKey = `findVideos//${input.query}//${input.after}//${input.types?.sort().join(',')}//${input.acceptableMirrors?.sort().join(',')}`
      try {
        const cached = await cacheMem.get(cacheKey)
        if (cached) {
          try {
            return PaginatedResponseSchema(VideoOutputSchema).parse(cached)
          } catch (e) {
            console.error('Failed to parse', e)
          }
        }
      } catch (e) {
        console.warn("Failed to restore cache", e)
      }

      // TODO: cursor
      const result = await searchVideos(input);
      await cacheMem.set(cacheKey, result, 1000 * 60 * 60 * 24) // 24 hours
      return result
    }),

  findVideoById: t.procedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/videos/{id}',
        tags: ['videos'],
        summary: 'Get video by ID'
      }
    })
    .input(z.object({
      id: z.number(),
    }))
    .output(VideoOutputSchema.optional())
    .query(({ input: { id } }) => {
      return getVideoById(id);
    }),

  addVideo: adminProcedure
    .input(VideoSchema.omit({ mirrors: true })) // TODO: probably could handle mirrors
    .mutation(({ input }) => {
      return addVideo(input);
    }),

  addMirror: adminProcedure
    .input(z.object({
      videoId: z.number(),
      source: MirrorSourceEnum,
      url: z.string().url(),
    }))
    .mutation(({ input }) => {
      return addMirror(input.videoId, input.source, input.url);
    }),
});

export type AppRouter = typeof router;
