import { config, collection, singleton, fields } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

// کامپوننت‌های تعاملی قابل‌درج داخل هر محتوای MDX (بلاگ، پروژه‌ها، سرویس‌ها، ریسرچ)
// این‌ها دقیقاً با کامپوننت‌های واقعی سایت در src/components/mdx/ مطابقت دارن
const mdxComponents = {
  YouTube: block({
    label: 'YouTube Video',
    schema: {
      id: fields.text({
        label: 'Video ID',
        description: 'قسمت بعد از v= توی لینک یوتیوب، مثلاً برای youtube.com/watch?v=dQw4w9WgXcQ مقدار dQw4w9WgXcQ است',
      }),
      title: fields.text({ label: 'Title (accessibility)', defaultValue: 'YouTube video' }),
    },
  }),
  Video: block({
    label: 'Video File (mp4/webm)',
    schema: {
      src: fields.url({ label: 'Video File URL' }),
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
      }),
      title: fields.text({ label: 'Title (accessibility)', defaultValue: 'Embedded content' }),
      height: fields.integer({ label: 'Height (px)', defaultValue: 480 }),
    },
  }),
};

export default config({
  storage: {
    kind: 'cloud',
  },
  cloud: {
    project: 'msb6/githubio',
  },
  collections: {
    blog: collection({
      label: 'Blog',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        category: fields.text({ label: 'Category', defaultValue: 'Technical' }),
        date: fields.date({ label: 'Date' }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        image: fields.text({ label: 'Image Path', description: 'e.g. /assets/images/blog/cover.jpg' }),
        content: fields.mdx({
          label: 'Content',
          options: {
            image: {
              directory: 'public/assets/images/blog',
              publicPath: '/assets/images/blog/',
            },
          },
          components: mdxComponents,
        }),
      },
    }),
    projects: collection({
      label: 'Projects',
      slugField: 'title',
      path: 'src/content/projects/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        category: fields.text({ label: 'Category' }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        year: fields.integer({ label: 'Year' }),
        featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
        image: fields.text({ label: 'Image Path', description: 'e.g. /assets/images/projects/slope.jpg' }),
        content: fields.mdx({
          label: 'Content',
          options: {
            image: {
              directory: 'public/assets/images/projects',
              publicPath: '/assets/images/projects/',
            },
          },
          components: mdxComponents,
        }),
      },
    }),
    services: collection({
      label: 'Services',
      slugField: 'title',
      path: 'src/content/services/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        order: fields.integer({ label: 'Order', defaultValue: 99 }),
        content: fields.mdx({
          label: 'Content',
          options: {
            image: {
              directory: 'public/assets/images/services',
              publicPath: '/assets/images/services/',
            },
          },
          components: mdxComponents,
        }),
      },
    }),
    research: collection({
      label: 'Research & Notes',
      slugField: 'title',
      path: 'src/content/research/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        authors: fields.text({ label: 'Authors', description: 'e.g. S. Babaee, A. Smith, J. Doe' }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Academic Paper / Thesis', value: 'paper' },
            { label: 'Quarto Report', value: 'quarto' },
          ],
          defaultValue: 'paper',
        }),
        status: fields.text({ label: 'Status' }),
        year: fields.integer({ label: 'Year' }),
        link: fields.url({ label: 'Link' }),
        doi: fields.text({ label: 'DOI', description: 'e.g. 10.1007/s11227-021-03858-6 (without the doi.org/ prefix)' }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        content: fields.mdx({
          label: 'Abstract / Main Text',
          options: {
            image: {
              directory: 'public/assets/images/research',
              publicPath: '/assets/images/research/',
            },
          },
          components: mdxComponents,
        }),
      },
    }),
  },
  singletons: {
    settings: singleton({
      label: 'Site Settings',
      path: 'src/content/site/settings',
      format: { data: 'json' },
      schema: {
        siteName: fields.text({ label: 'Site Name (e.g. Saeed)' }),
        tagline: fields.text({ label: 'Footer Tagline', multiline: true }),
        availabilityText: fields.text({ label: 'Availability Text' }),
        email: fields.text({ label: 'Contact Email' }),
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
            value: fields.text({ label: 'Value', description: 'e.g. 5+, 3, 2025' }),
            label: fields.text({ label: 'Label', description: 'e.g. Projects Completed' }),
          }),
          {
            label: 'Homepage Stats Row (optional)',
            description: 'چند عدد کوتاه برای نمایش زیر Hero',
            itemLabel: (props) => `${props.fields.value.value} ${props.fields.label.value}` || 'Stat',
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
            title: fields.text({ label: 'Title' }),
            description: fields.text({ label: 'Description', multiline: true }),
            institution: fields.text({ label: 'Institution / Status' }),
            current: fields.checkbox({ label: 'Currently In Progress', defaultValue: false }),
          }),
          {
            label: 'Education Entries',
            itemLabel: (props) => props.fields.title.value || 'Education entry',
          }
        ),
        specializations: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            description: fields.text({ label: 'Description', multiline: true }),
          }),
          {
            label: 'Core Specializations',
            itemLabel: (props) => props.fields.title.value || 'Specialization',
          }
        ),
        certifications: fields.array(
          fields.object({
            name: fields.text({ label: 'Certification Name' }),
            issuer: fields.text({ label: 'Issuer', description: 'e.g. Coursera, PMI, SCRUMstudy' }),
            date: fields.text({ label: 'Date (optional)', description: 'e.g. June 2022' }),
            credentialUrl: fields.url({ label: 'Credential URL (optional)' }),
          }),
          {
            label: 'Certifications',
            itemLabel: (props) => props.fields.name.value || 'Certification',
          }
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
            name: fields.text({ label: 'Category Name', description: 'e.g. AI & Machine Learning' }),
            skills: fields.array(
              fields.object({
                name: fields.text({ label: 'Skill Name', description: 'e.g. Python, React, PLAXIS' }),
                icon: fields.text({
                  label: 'Icon (optional)',
                  description: 'اسلاگ آیکون از skillicons.dev — مثلاً برای پایتون بنویسید py، برای React بنویسید react. لیست کامل: https://github.com/tandpfun/skill-icons#icons-list — اگه خالی بذارید یا ابزار توی اون لیست نباشه، یه آواتار حرفی رنگی خودکار ساخته میشه.',
                }),
              }),
              {
                label: 'Skills',
                itemLabel: (props) => props.fields.name.value || 'Skill',
              }
            ),
          }),
          {
            label: 'Categories',
            itemLabel: (props) => props.fields.name.value || 'Category',
          }
        ),
      },
    }),
  },
});
