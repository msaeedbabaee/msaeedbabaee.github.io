import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { singletonFile } from './utils/singletonLoader';

/* ── helpers ────────────────────────────────────────────────────
   Keystatic may save an empty optional field as '', null or omit it.
   These helpers accept all three so an empty field never breaks the build. */
const optionalUrl = z.union([z.string().url(), z.literal('')]).nullish();
const optionalText = z.string().nullish();
const optionalImage = z.string().nullish();

/** draft / unlisted / scheduled — shared by every content collection */
const visibility = {
  draft: z.boolean().optional().default(false),
  unlisted: z.boolean().optional().default(false),
  publishAt: z.coerce.date().nullish(),
};

const seo = z
  .object({
    title: optionalText,
    description: optionalText,
    ogImage: optionalImage,
  })
  .optional();

/* ── content collections ───────────────────────────────────── */

// The single source of truth for every tag (src/content/tags/*.json).
// Blog/Projects/Research/Services store an array of these tag IDs.
const tags = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/tags' }),
  schema: z.object({
    name: z.string(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional().default('Technical'),
    date: z.coerce.date(),
    updated: z.coerce.date().nullish(),
    tags: z.array(z.string()).optional(),
    image: optionalImage,
    imageAlt: optionalText,
    seo,
    ...visibility,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    year: z.number().nullish(),
    featured: z.boolean().optional().default(false),
    liveUrl: optionalUrl,
    repoUrl: optionalUrl,
    image: optionalImage,
    imageAlt: optionalText,
    gallery: z
      .array(
        z.object({
          image: optionalImage,
          alt: optionalText,
          caption: optionalText,
        })
      )
      .optional()
      .default([]),
    seo,
    ...visibility,
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    authors: optionalText, // was missing → silently stripped by Zod before
    type: z.string().optional(),
    status: z.string().optional(),
    year: z.number().nullish(),
    link: optionalUrl,
    doi: optionalText, // was missing → silently stripped by Zod before
    tags: z.array(z.string()).optional(),
    seo,
    ...visibility,
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    order: z.number().optional().default(99),
    seo,
    ...visibility,
  }),
});

/* ── site singletons ───────────────────────────────────────── */

// Defaults live here so a missing/partial JSON never hides anything by accident.
const flag = z.boolean().default(true);

const siteControl = defineCollection({
  loader: singletonFile('src/content/site/site-control.json', 'siteControl'),
  schema: z.object({
    maintenance: z
      .object({
        enabled: z.boolean().default(false),
        message: z.string().default('The site is being updated. Check back soon.'),
      })
      .default({ enabled: false, message: 'The site is being updated. Check back soon.' }),
    announcement: z
      .object({
        enabled: z.boolean().default(false),
        text: z.string().default(''),
        url: optionalUrl,
      })
      .default({ enabled: false, text: '' }),
    pages: z
      .object({
        blog: flag,
        projects: flag,
        research: flag,
        services: flag,
        about: flag,
      })
      .default({ blog: true, projects: true, research: true, services: true, about: true }),
    home: z
      .object({
        hero: flag,
        stats: flag,
        featuredProjects: flag,
        latestPosts: flag,
        services: flag,
        techStack: flag,
        cta: flag,
      })
      .default({
        hero: true,
        stats: true,
        featuredProjects: true,
        latestPosts: true,
        services: true,
        techStack: true,
        cta: true,
      }),
    nav: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          visible: z.boolean().default(true),
          newTab: z.boolean().default(false),
        })
      )
      .optional()
      .default([]),
  }),
});

const siteSettings = defineCollection({
  loader: singletonFile('src/content/site/settings.json', 'settings'),
  schema: z.object({
    siteName: z.string(),
    tagline: z.string(),
    availabilityText: z.string(),
    email: z.string(),
    location: z.string(),
    githubUrl: z.string().url(),
    linkedinUrl: z.string().url(),
    googleScholarUrl: optionalUrl,
    orcidUrl: optionalUrl, // was missing → silently stripped by Zod before
    heroBadge: z.string(),
    heroHeadline: z.string(),
    heroSubheadline: z.string(),
    stats: z // was missing → silently stripped by Zod before
      .array(z.object({ value: z.string(), label: z.string() }))
      .optional()
      .default([]),
    ctaHeading: z.string(),
    ctaText: z.string(),
  }),
});

const about = defineCollection({
  loader: singletonFile('src/content/site/about.json', 'about'),
  schema: z.object({
    introHeading: z.string(),
    introText: z.string(),
    education: z.array(
      z.object({
        degreeLabel: z.string(),
        title: z.string(),
        description: z.string(),
        institution: z.string(),
        current: z.boolean().optional().default(false),
      })
    ),
    specializations: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    ),
    certifications: z // was missing → silently stripped by Zod before
      .array(
        z.object({
          name: z.string(),
          issuer: optionalText,
          date: optionalText,
          credentialUrl: optionalUrl,
        })
      )
      .optional()
      .default([]),
  }),
});

const techStack = defineCollection({
  loader: singletonFile('src/content/site/tech-stack.json', 'techStack'),
  schema: z.object({
    categories: z.array(
      z.object({
        name: z.string(),
        skills: z.array(
          z.object({
            name: z.string(),
            icon: z.string().optional(),
          })
        ),
      })
    ),
  }),
});

export const collections = {
  tags,
  blog,
  projects,
  research,
  services,
  siteControl,
  siteSettings,
  about,
  techStack,
};
