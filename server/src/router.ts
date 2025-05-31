import { initTRPC, TRPCError } from '@trpc/server';
import { OpenApiMeta } from 'trpc-to-openapi';
import { z } from 'zod';
import { VideoSchema, VideoSearchParams, searchVideos, getVideoById, addVideo, addMirror } from './utils/videos';
import { MirrorSourceEnum } from './types/query';

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
    .input(VideoSearchParams)
    .output(z.any()) // TODO
    .query(({ input }) => {
      return searchVideos(input);
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
    .input(z.number())
    .output(z.any()) // TODO
    .query(({ input }) => {
      return getVideoById(input);
    }),

  addVideo: adminProcedure
    .input(VideoSchema.omit({ mirrors: true }))
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
