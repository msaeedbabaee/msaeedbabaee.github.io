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
        description: 'قسمت بعد از v= توی لینک یوتیوب، مثلاً برای youtube.com/watch?v=dQw4w9WgXcQ مقدار dQw4w9WgXcQ است',
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
        description: 'لینک iframe-پذیر: CodePen, StackBlitz, Observable, Plotly Chart Studio, Google Maps و غیره',
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
    description: 'خلاصهٔ کوتاه؛ برای لیست‌ها و meta description (حداکثر ۲۰۰ کاراکتر، ایده‌آل ۱۲۰–۱۶۰)',
    multiline: true,
    validation: { isRequired: true, length: { max: 200 } },
  });

const tagsField = () =>
  fields.array(fields.text({ label: 'Tag', validation: { isRequired: true } }), {
    label: 'Tags',
    description: 'حداکثر ۸ تگ؛ املای یکسان (همیشه «Machine Learning»، نه «ML»)',
    itemLabel: (props) => props.value || 'Tag',
    validation: { length: { max: 8 } },
  });

const yearField = () => fields.integer({ label: 'Year', validation: { min: 1990, max: 2100 } });

const coverImage = (dir: string) =>
  fields.image({
    label: 'Cover Image',
    description: 'اختیاری. عکس جلد (ترجیحاً عرض ~۱۶۰۰px، WebP/JPG)',
    directory: `public/assets/images/${dir}`,
    publicPath: `/assets/images/${dir}/`,
  });

const coverAlt = () =>
  fields.text({ label: 'Cover Image Alt Text', description: 'توضیح کوتاه تصویر برای دسترس‌پذیری و سئو' });

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
    description: 'پیش‌نویس: اصلاً در سایت ساخته نمی‌شود',
    defaultValue: false,
  }),
  unlisted: fields.checkbox({
    label: 'Unlisted',
    description: 'با لینک مستقیم باز می‌شود ولی در لیست‌ها و sitemap نمی‌آید',
    defaultValue: false,
  }),
  publishAt: fields.date({
    label: 'Publish On (optional)',
    description: 'تا این تاریخ منتشر نمی‌شود (نیاز به build زمان‌بندی‌شده در GitHub Actions)',
  }),
});

/** Optional per-entry SEO override */
const seoField = () =>
  fields.object(
    {
      title: fields.text({
        label: 'SEO Title',
        description: 'خالی = همان عنوان',
        validation: { length: { max: 70 } },
      }),
      description: fields.text({
        label: 'SEO Description',
        description: 'خالی = همان Description',
        multiline: true,
        validation: { length: { max: 170 } },
      }),
      ogImage: fields.image({
        label: 'Social Share Image',
        description: 'ابعاد پیشنهادی ۱۲۰۰×۶۳۰',
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
      'Site Control': ['siteControl', 'settings', 'about', 'techStack'],
    },
  },

  collections: {
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
            description: 'چند تصویر برای صفحهٔ پروژه؛ با کشیدن و رها کردن جابه‌جا کنید',
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
          description: 'عدد کمتر = بالاتر در لیست',
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
              message: 'DOI باید با 10. شروع شود و بدون https://doi.org/ باشد',
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
    /* ── NEW: the "control room" — show/hide anything without touching code ── */
    siteControl: singleton({
      label: 'Visibility & Navigation',
      path: 'src/content/site/site-control',
      format: { data: 'json' },
      schema: {
        maintenance: fields.object(
          {
            enabled: fields.checkbox({
              label: 'Maintenance Mode',
              description: 'فعال = به‌جای سایت فقط پیام زیر نمایش داده می‌شود',
              defaultValue: false,
            }),
            message: fields.text({
              label: 'Message',
              multiline: true,
              defaultValue: 'سایت در حال به‌روزرسانی است. به‌زودی برمی‌گردیم.',
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
            description: 'غیرفعال = صفحه ساخته نمی‌شود و از منو و sitemap حذف می‌شود',
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
              description: 'مثلاً /blog یا https://…',
              validation: {
                isRequired: true,
                pattern: { regex: /^(\/|https?:\/\/)/, message: 'با / یا https:// شروع شود' },
              },
            }),
            visible: fields.checkbox({ label: 'Visible', defaultValue: true }),
            newTab: fields.checkbox({ label: 'Open in new tab', defaultValue: false }),
          }),
          {
            label: 'Header Menu (optional)',
            description: 'خالی = منوی پیش‌فرض کد. ترتیب را با کشیدن و رها کردن عوض کنید.',
            itemLabel: (props) =>
              `${props.fields.visible.value ? '' : '🚫 '}${props.fields.label.value || 'Menu item'}`,
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
            pattern: { regex: /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/, message: 'ایمیل معتبر وارد کنید' },
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
            description: 'چند عدد کوتاه برای نمایش زیر Hero',
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
                    'اسلاگ آیکون از skillicons.dev — مثلاً برای پایتون py، برای React react. لیست کامل: https://github.com/tandpfun/skill-icons#icons-list — اگر خالی بگذارید یا در لیست نباشد، آواتار حرفی خودکار ساخته می‌شود.',
                  validation: {
                    pattern: { regex: /^[a-z0-9-]*$/, message: 'فقط حروف کوچک انگلیسی، عدد و خط تیره' },
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
