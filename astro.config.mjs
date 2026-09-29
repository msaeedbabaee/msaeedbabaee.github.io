import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkRepairContent from './src/plugins/remark-repair-content.mjs';
import vercel from '@astrojs/vercel';

// وقتی ADMIN_MODE=true باشه (فقط روی دیپلوی Vercel که برای پنل ادمین استفاده میشه)
// خروجی سرور-ساید فعال میشه تا Keystatic بتونه اجرا بشه.
// روی GitHub Pages (خروجی استاتیک عادی سایت) این حالت خاموشه.
const isAdminBuild = process.env.ADMIN_MODE === 'true';

export default defineConfig({
  site: isAdminBuild ? undefined : 'https://msaeedbabaee.github.io',
  output: isAdminBuild ? 'server' : 'static',
  adapter: isAdminBuild ? vercel() : undefined,
  markdown: {
    // پشتیبانی از فرمول‌های ریاضی LaTeX در همه‌ی محتوای Markdown و MDX
    // ترتیب مهم است: remarkMath اول، بعد ترمیم‌کننده‌ی محتوای خراب‌شده توسط ادیتور
    remarkPlugins: [remarkMath, remarkRepairContent],
    rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: 'ignore' }]],
  },
  integrations: [
    mdx(),
    tailwind(),
    react(),
    // روی GitHub Pages (build استاتیک) Keystatic خاموش می‌شود؛ روی دیپلوی ادمین (Vercel) فعاله
    ...(process.env.SKIP_KEYSTATIC === 'true' ? [] : [keystatic()]),
  ],
});
