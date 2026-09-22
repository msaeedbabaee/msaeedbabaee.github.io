import { config, collection, singleton, fields } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

/* ────────────────────────────────────────────────────────────────
   1) MDX components  (must match src/components/mdx/*)
   ──────────────────────────────────────────────────────────────── */
const mdxComponents = {
  YouTube: block({
    label: 'YouTube Video',
    schema: {
      id: fields.text({
        label: 'Video ID',
        description:
          'The part after v= in the YouTube link — e.g. for youtube.com/watch?v=dQw4w9WgXcQ the value is dQw4w9WgXcQ',
        validation: { isRequired: true },
      }),
      title: fields.text({ label: 'Title (accessibility)', defaultValue: 'YouTube video' }),
    },
  }),
  Video: block({
    label: 'Video File (mp4/webm)',
    schema: {
      src: fields.url({ label: 'Video File URL', validation: { isRequired: true } }),
      poster: fields.url({ label: 'Poster Image URL (optional)' }),
      caption: fields.text({ label: 'Caption (optional)' }),
    },
  }),
  Embed: block({
    label: 'Interactive Embed (demo / chart / other platform)',
    schema: {
      url: fields.url({
        label: 'Embed URL',
        description:
          'Any iframe-embeddable link: CodePen, StackBlitz, Observable, Plotly Chart Studio, Google Maps, etc.',
        validation: { isRequired: true },
      }),
      title: fields.text({ label: 'Title (accessibility)', defaultValue: 'Embedded content' }),
      height: fields.integer({ label: 'Height (px)', defaultValue: 480, validation: { min: 200, max: 1200 } }),
    },
  }),
  DemoLink: block({
    label: 'Demo Link Button (for Streamlit, Colab, or anything that fails inside an iframe)',
    schema: {
      url: fields.url({ label: 'Demo URL', validation: { isRequired: true } }),
      label: fields.text({ label: 'Button Label', defaultValue: 'Open Live Demo' }),
      description: fields.text({ label: 'Description (optional)' }),
    },
  }),
};

/* ────────────────────────────────────────────────────────────────
   2) Shared field factories
   ──────────────────────────────────────────────────────────────── */
const titleField = () =>
  fields.slug({
    name: { label: 'Title', validation: { isRequired: true, length: { min: 3, max: 100 } } },
  });

const descriptionField = () =>
  fields.text({
    label: 'Description',
    description: 'Short summary used in lists and as the meta description (max 200 characters, ideally 120–160)',
    multiline: true,
    validation: { isRequired: true, length: { max: 200 } },
  });

/**
 * Tags are picked from the Tags collection, never typed free-hand.
 * This is what prevents duplicate tags such as "Site Investigations" and
 * " Site Investigations" (leading space) or "site investigations" (different
 * case) from ever existing side by side — every entry points at the same
 * tag record, so there is only ever one canonical spelling per tag.
 */
const tagsField = () =>
  fields.array(
    fields.relationship({
      label: 'Tag',
      collection: 'tags',
      validation: { isRequired: true },
    }),
    {
      label: 'Tags',
      description:
        'Pick from existing tags. Need a new one? Open the "Tags" collection in the sidebar, add it there once, then come back and select it here — that way the same tag is never created twice.',
      itemLabel: (props) => props.value || 'Tag',
      validation: { length: { max: 8 } },
    }
  );

const yearField = () => fields.integer({ label: 'Year', validation: { min: 1990, max: 2100 } });

/**
 * Cover image. Keystatic Cloud stores uploads for a collection's image field
 * under `${directory}/{entry-slug}/...`, using the entry's own slug — so as
 * long as the entry's Title (slug) has no stray spaces/mixed case, the
 * uploaded file's folder will be clean automatically. See "USCS Soil
 * Classification Tool" migration note in the setup guide for the one legacy
 * entry that predates this and still needs a manual rename.
 */
const coverImage = (dir: string) =>
  fields.image({
    label: 'Cover Image',
    description: 'Optional. Recommended width ~1600px, WebP or JPG under 300KB.',
    directory: `public/assets/images/${dir}`,
    publicPath: `/assets/images/${dir}/`,
  });

const coverAlt = () =>
  fields.text({ label: 'Cover Image Alt Text', description: 'Short description of the image, for accessibility and SEO' });

const mdxContent = (dir: string, label = 'Content') =>
  fields.mdx({
    label,
    options: { image: { directory: `public/assets/images/${dir}`, publicPath: `/assets/images/${dir}/` } },
    components: mdxComponents,
  });

/** Per-entry visibility: draft / unlisted / scheduled */
const visibilityFields = () => ({
  draft: fields.checkbox({
    label: 'Draft',
    description: 'Draft entries are never built into the live site.',
    defaultValue: false,
  }),
  unlisted: fields.checkbox({
    label: 'Unlisted',
    description: 'Reachable by direct link, but excluded from lists, tag filters and the sitemap.',
    defaultValue: false,
  }),
  publishAt: fields.date({
    label: 'Publish On (optional)',
    description: 'Hide this entry until the given date (requires a scheduled build in GitHub Actions).',
  }),
});

/** Optional per-entry SEO override */
const seoField = () =>
  fields.object(
    {
      title: fields.text({
        label: 'SEO Title',
        description: 'Leave blank to reuse the entry title.',
        validation: { length: { max: 70 } },
      }),
      description: fields.text({
        label: 'SEO Description',
        description: 'Leave blank to reuse the entry description.',
        multiline: true,
        validation: { length: { max: 170 } },
      }),
      ogImage: fields.image({
        label: 'Social Share Image',
        description: 'Recommended size 1200×630.',
        directory: 'public/assets/images/seo',
        publicPath: '/assets/images/seo/',
      }),
    },
    { label: 'SEO & Social (optional)' }
  );

const flag = (label: string, description?: string) =>
  fields.checkbox({ label, description, defaultValue: true });

/* ────────────────────────────────────────────────────────────────
   3) Config
   ──────────────────────────────────────────────────────────────── */
export default config({
  storage: { kind: 'cloud' },
  cloud: { project: 'msb6/githubio' },

  ui: {
    brand: { name: 'Saeed — Content' },
    navigation: {
      Content: ['blog', 'projects', 'research', 'services'],
      Taxonomy: ['tags'],
      'Site Control': ['siteControl', 'settings', 'about', 'techStack'],
    },
  },

  collections: {
    /* ── NEW: the single source of truth for every tag on the site ── */
    tags: collection({
      label: 'Tags',
      entryLayout: 'form',
      slugField: 'name',
      path: 'src/content/tags/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: {
            label: 'Tag Name',
            description:
              'The exact label shown to visitors, e.g. "Site Investigations". Keystatic turns this into a unique ID automatically, so it is impossible to save two tags that produce the same ID.',
            validation: { isRequired: true, length: { min: 2, max: 40 } },
          },
        }),
      },
    }),

    blog: collection({
      label: 'Blog',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: titleField(),
        description: descriptionField(),
        category: fields.text({ label: 'Category', defaultValue: 'Technical' }),
        date: fields.date({ label: 'Date', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        updated: fields.date({ label: 'Last Updated (optional)' }),
        ...visibilityFields(),
        tags: tagsField(),
        image: coverImage('blog'),
        imageAlt: coverAlt(),
        seo: seoField(),
        content: mdxContent('blog'),
      },
    }),

    projects: collection({
      label: 'Projects',
      slugField: 'title',
      path: 'src/content/projects/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: titleField(),
        description: descriptionField(),
        category: fields.text({ label: 'Category' }),
        tags: tagsField(),
        year: yearField(),
        featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
        liveUrl: fields.url({ label: 'Live Demo URL (optional)' }),
        repoUrl: fields.url({ label: 'Repository URL (optional)' }),
        ...visibilityFields(),
        image: coverImage('projects'),
        imageAlt: coverAlt(),
        gallery: fields.array(
          fields.object({
            image: fields.image({
              label: 'Image',
              directory: 'public/assets/images/projects/gallery',
              publicPath: '/assets/images/projects/gallery/',
            }),
            alt: fields.text({ label: 'Alt text' }),
            caption: fields.text({ label: 'Caption (optional)' }),
          }),
          {
            label: 'Gallery (optional)',
            description: 'Extra images for the project page. Drag to reorder.',
            itemLabel: (props) => props.fields.caption.value || props.fields.alt.value || 'Image',
          }
        ),
        seo: seoField(),
        content: mdxContent('projects'),
      },
    }),

    services: collection({
      label: 'Services',
      slugField: 'title',
      path: 'src/content/services/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: titleField(),
        description: descriptionField(),
        tags: tagsField(),
        order: fields.integer({
          label: 'Order',
          description: 'Lower number = higher up the list.',
          defaultValue: 99,
          validation: { min: 1, max: 99 },
        }),
        ...visibilityFields(),
        seo: seoField(),
        content: mdxContent('services'),
      },
    }),

    research: collection({
      label: 'Research & Notes',
      slugField: 'title',
      path: 'src/content/research/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: titleField(),
        description: descriptionField(),
        authors: fields.text({ label: 'Authors', description: 'e.g. S. Babaee, A. Smith, J. Doe' }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Academic Paper / Thesis', value: 'paper' },
            { label: 'Quarto Report', value: 'quarto' },
          ],
          defaultValue: 'paper',
        }),
        status: fields.text({ label: 'Status', description: 'e.g. Published, Under Review, In Progress' }),
        year: yearField(),
        link: fields.url({ label: 'Link' }),
        doi: fields.text({
          label: 'DOI',
          description: 'e.g. 10.1007/s11227-021-03858-6 (without the doi.org/ prefix)',
          validation: {
            pattern: {
              regex: /^(10\.\d{4,9}\/\S+)?$/,
              message: 'DOI must start with 10. and must not include https://doi.org/',
            },
          },
        }),
        tags: tagsField(),
        ...visibilityFields(),
        seo: seoField(),
        content: mdxContent('research', 'Abstract / Main Text'),
      },
    }),
  },

  singletons: {
    /* ── the "control room" — show/hide anything without touching code ── */
    siteControl: singleton({
      label: 'Visibility & Navigation',
      path: 'src/content/site/site-control',
      format: { data: 'json' },
      schema: {
        maintenance: fields.object(
          {
            enabled: fields.checkbox({
              label: 'Maintenance Mode',
              description: 'When on, the site shows only the message below instead of its normal pages.',
              defaultValue: false,
            }),
            message: fields.text({
              label: 'Message',
              multiline: true,
              defaultValue: 'The site is being updated. Check back soon.',
            }),
          },
          { label: 'Maintenance Mode' }
        ),

        announcement: fields.object(
          {
            enabled: fields.checkbox({ label: 'Show Announcement Bar', defaultValue: false }),
            text: fields.text({ label: 'Text' }),
            url: fields.url({ label: 'Link (optional)' }),
          },
          { label: 'Announcement Bar' }
        ),

        pages: fields.object(
          {
            blog: flag('Blog'),
            projects: flag('Projects'),
            research: flag('Research & Notes'),
            services: flag('Services'),
            about: flag('About'),
          },
          {
            label: 'Pages — show / hide',
            description: 'Turning a page off removes it from the build, the menu and the sitemap.',
          }
        ),

        home: fields.object(
          {
            hero: flag('Hero'),
            stats: flag('Stats Row'),
            featuredProjects: flag('Featured Projects'),
            latestPosts: flag('Latest Posts'),
            services: flag('Services Preview'),
            techStack: flag('Tech Stack'),
            cta: flag('Call To Action'),
          },
          { label: 'Homepage Sections — show / hide' }
        ),

        nav: fields.array(
          fields.object({
            label: fields.text({ label: 'Label', validation: { isRequired: true } }),
            href: fields.text({
              label: 'Link',
              description: 'e.g. /blog or https://…',
              validation: {
                isRequired: true,
                pattern: { regex: /^(\/|https?:\/\/)/, message: 'Must start with / or https://' },
              },
            }),
            visible: fields.checkbox({ label: 'Visible', defaultValue: true }),
            newTab: fields.checkbox({ label: 'Open in new tab', defaultValue: false }),
          }),
          {
            label: 'Header Menu (optional)',
            description: 'Leave empty to use the default menu from the code. Drag to reorder.',
            itemLabel: (props) =>
              `${props.fields.visible.value ? '' : '(hidden) '}${props.fields.label.value || 'Menu item'}`,
          }
        ),
      },
    }),

    settings: singleton({
      label: 'Site Settings',
      path: 'src/content/site/settings',
      format: { data: 'json' },
      schema: {
        siteName: fields.text({ label: 'Site Name (e.g. Saeed)', validation: { isRequired: true } }),
        tagline: fields.text({ label: 'Footer Tagline', multiline: true }),
        availabilityText: fields.text({ label: 'Availability Text' }),
        email: fields.text({
          label: 'Contact Email',
          validation: {
            pattern: { regex: /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, message: 'Enter a valid email address' },
          },
        }),
        location: fields.text({ label: 'Location' }),
        githubUrl: fields.url({ label: 'GitHub URL' }),
        linkedinUrl: fields.url({ label: 'LinkedIn URL' }),
        googleScholarUrl: fields.url({ label: 'Google Scholar URL (optional)' }),
        orcidUrl: fields.url({ label: 'ORCID URL (optional)', description: 'e.g. https://orcid.org/0000-0000-0000-0000' }),
        heroBadge: fields.text({ label: 'Homepage Hero Badge' }),
        heroHeadline: fields.text({ label: 'Homepage Hero Headline' }),
        heroSubheadline: fields.text({ label: 'Homepage Hero Subheadline', multiline: true }),
        stats: fields.array(
          fields.object({
            value: fields.text({ label: 'Value', description: 'e.g. 5+, 3, 2025', validation: { isRequired: true } }),
            label: fields.text({ label: 'Label', description: 'e.g. Projects Completed', validation: { isRequired: true } }),
          }),
          {
            label: 'Homepage Stats Row (optional)',
            description: 'A few short numbers shown below the Hero.',
            itemLabel: (props) =>
              [props.fields.value.value, props.fields.label.value].filter(Boolean).join(' ') || 'Stat',
            validation: { length: { max: 4 } },
          }
        ),
        ctaHeading: fields.text({ label: 'Homepage CTA Heading' }),
        ctaText: fields.text({ label: 'Homepage CTA Text', multiline: true }),
      },
    }),

    about: singleton({
      label: 'About Page',
      path: 'src/content/site/about',
      format: { data: 'json' },
      schema: {
        introHeading: fields.text({ label: 'Intro Heading', defaultValue: 'About Me' }),
        introText: fields.text({ label: 'Intro Text', multiline: true }),
        education: fields.array(
          fields.object({
            degreeLabel: fields.text({ label: 'Degree Label', description: 'e.g. M.Sc. in Geotechnical Engineering' }),
            title: fields.text({ label: 'Title', validation: { isRequired: true } }),
            description: fields.text({ label: 'Description', multiline: true }),
            institution: fields.text({ label: 'Institution / Status' }),
            current: fields.checkbox({ label: 'Currently In Progress', defaultValue: false }),
          }),
          { label: 'Education Entries', itemLabel: (props) => props.fields.title.value || 'Education entry' }
        ),
        specializations: fields.array(
          fields.object({
            title: fields.text({ label: 'Title', validation: { isRequired: true } }),
            description: fields.text({ label: 'Description', multiline: true }),
          }),
          { label: 'Core Specializations', itemLabel: (props) => props.fields.title.value || 'Specialization' }
        ),
        certifications: fields.array(
          fields.object({
            name: fields.text({ label: 'Certification Name', validation: { isRequired: true } }),
            issuer: fields.text({ label: 'Issuer', description: 'e.g. Coursera, PMI, SCRUMstudy' }),
            date: fields.text({ label: 'Date (optional)', description: 'e.g. June 2022' }),
            credentialUrl: fields.url({ label: 'Credential URL (optional)' }),
          }),
          { label: 'Certifications', itemLabel: (props) => props.fields.name.value || 'Certification' }
        ),
      },
    }),

    techStack: singleton({
      label: 'Tech Stack',
      path: 'src/content/site/tech-stack',
      format: { data: 'json' },
      schema: {
        categories: fields.array(
          fields.object({
            name: fields.text({
              label: 'Category Name',
              description: 'e.g. AI & Machine Learning',
              validation: { isRequired: true },
            }),
            skills: fields.array(
              fields.object({
                name: fields.text({
                  label: 'Skill Name',
                  description: 'e.g. Python, React, PLAXIS',
                  validation: { isRequired: true },
                }),
                icon: fields.text({
                  label: 'Icon (optional)',
                  description:
                    'skillicons.dev slug — e.g. py for Python, react for React. Full list: https://github.com/tandpfun/skill-icons#icons-list — leave blank, or use one not on the list, to fall back to an automatic letter avatar.',
                  validation: {
                    pattern: { regex: /^[a-z0-9-]*$/, message: 'Lowercase letters, numbers and hyphens only' },
                  },
                }),
              }),
              { label: 'Skills', itemLabel: (props) => props.fields.name.value || 'Skill' }
            ),
          }),
          { label: 'Categories', itemLabel: (props) => props.fields.name.value || 'Category' }
        ),
      },
    }),
  },
});
