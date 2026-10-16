// Content model. Everything here is editable in the admin editor (/admin), which writes these same files.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const topics = z.enum(["3d-printing", "robots", "photography", "electric", "web"]);

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(["in-progress", "done", "live", "coming-soon"]),
    topics: z.array(topics).default([]),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),            // image path, e.g. /img/uploads/board.jpg
    order: z.number().default(100),          // lower = earlier on the Projects page
    featured: z.boolean().default(false),    // shown on the home page (first 3)
    started: z.string().optional(),          // e.g. "Sep 2026"
    skills: z.string().optional(),
    tools: z.string().optional(),
    cost: z.string().optional(),
    video: z.string().optional(),            // YouTube video ID
    link: z.string().optional(),             // e.g. the live tool for apps
    files: z.array(z.object({ label: z.string(), note: z.string().optional(), url: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    topic: z.enum(["electric", "robots", "3d-printing", "photography", "web", "site-updates"]),
    project: z.string().optional(),          // project file name (slug), e.g. "ferrofluid-display"
    cover: z.string().optional(),
    video: z.string().optional(),            // YouTube video ID shown at the top
    draft: z.boolean().default(false),
  }),
});

const videos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/videos" }),
  schema: z.object({
    title: z.string(),
    series: z.string(),                      // = YouTube playlist name, e.g. "Ferrofluid display"
    episode: z.number().optional(),
    youtube: z.string().optional(),          // video ID once uploaded; empty = planned
    duration: z.string().optional(),         // "12:04"
    date: z.coerce.date().optional(),
    project: z.string().optional(),
    post: z.string().optional(),
    description: z.string().optional(),
    chapters: z.string().optional(),
    thumb: z.string().optional(),
  }),
});

export const collections = { projects, posts, videos };
