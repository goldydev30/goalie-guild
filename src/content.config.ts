import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per page, at the same path it had on GitBook
// (src/content/pages/foundation/intro/mission.md -> /foundation/intro/mission/).
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // true until the page's real text comes in from the GitBook import
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { pages };
