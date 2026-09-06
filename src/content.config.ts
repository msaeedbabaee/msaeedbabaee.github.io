import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { singletonFile } from './utils/singletonLoader';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional().default('Technical'),
    date: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    year: z.number().optional(),
    featured: z.boolean().optional().default(false),
    image: z.string().optional(),
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    year: z.number().optional(),
    link: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    order: z.number().optional().default(99),
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
    googleScholarUrl: z.string().url().optional(),
    heroBadge: z.string(),
    heroHeadline: z.string(),
    heroSubheadline: z.string(),
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

export const collections = { blog, projects, research, services, siteSettings, about, techStack };
