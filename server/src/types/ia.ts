import { z } from 'zod';

export const WaybackAvailableSchema = z.object({
  url: z.string(), // input URL
  archived_snapshots: z.object({
    closest: z.object({
      status: z.string(),
      available: z.boolean(),
      url: z.string(),
      timestamp: z.string(),
    }).optional(),
  }),
});
