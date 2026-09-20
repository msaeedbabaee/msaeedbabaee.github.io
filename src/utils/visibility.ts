// src/utils/visibility.ts
import { getCollection, getEntry } from 'astro:content';

export type PageKey = 'blog' | 'projects' | 'research' | 'services' | 'about';
export type HomeSectionKey =
  | 'hero'
  | 'stats'
  | 'featuredProjects'
  | 'latestPosts'
  | 'services'
  | 'techStack'
  | 'cta';
export type GatedCollection = 'blog' | 'projects' | 'research' | 'services';

const DEFAULTS = {
  maintenance: { enabled: false, message: '' },
  announcement: { enabled: false, text: '', url: '' as string | null | undefined },
  pages: { blog: true, projects: true, research: true, services: true, about: true },
  home: {
    hero: true,
    stats: true,
    featuredProjects: true,
    latestPosts: true,
    services: true,
    techStack: true,
    cta: true,
  },
  nav: [] as { label: string; href: string; visible: boolean; newTab: boolean }[],
};

/** Reads site-control.json; falls back to "everything visible" if the file is missing. */
export async function getSiteControl() {
  // NOTE: same id convention as your other singletons (getEntry('siteSettings', 'settings'))
  const entry = await getEntry('siteControl', 'siteControl').catch(() => undefined);
  const d = entry?.data;
  return {
    maintenance: { ...DEFAULTS.maintenance, ...d?.maintenance },
    announcement: { ...DEFAULTS.announcement, ...d?.announcement },
    pages: { ...DEFAULTS.pages, ...d?.pages },
    home: { ...DEFAULTS.home, ...d?.home },
    nav: d?.nav ?? DEFAULTS.nav,
  };
}

export async function isPageEnabled(page: PageKey) {
  return (await getSiteControl()).pages[page];
}

export async function isHomeSectionEnabled(section: HomeSectionKey) {
  return (await getSiteControl()).home[section];
}

/** Menu from CMS (only visible items), or `fallback` if the editor hasn't defined one. */
export async function getVisibleNav<T>(fallback: T[]): Promise<T[] | { label: string; href: string; newTab: boolean }[]> {
  const { nav } = await getSiteControl();
  return nav.length ? nav.filter((i) => i.visible) : fallback;
}

/* ── entry-level checks ─────────────────────────────────────── */
type Gateable = { data: { draft?: boolean; unlisted?: boolean; publishAt?: Date | null } };

/** Page should be generated (drafts and future-dated entries are skipped; shown in `astro dev`). */
export function isPublished(entry: Gateable, now = new Date()) {
  if (import.meta.env.DEV) return true;
  const { draft, publishAt } = entry.data;
  return !draft && (!publishAt || publishAt <= now);
}

/** Should appear in lists / sitemap / RSS (published AND not unlisted). */
export function isListed(entry: Gateable) {
  return isPublished(entry) && !entry.data.unlisted;
}

/** For getStaticPaths: every page that must exist (includes unlisted). */
export async function getPublished<C extends GatedCollection>(name: C) {
  const all = await getCollection(name);
  return all.filter((e) => isPublished(e as unknown as Gateable));
}

/** For index pages, home sections, RSS: only publicly listed entries. */
export async function getListed<C extends GatedCollection>(name: C) {
  const all = await getCollection(name);
  return all.filter((e) => isListed(e as unknown as Gateable));
}

/* ═════════════════════════════════════════════════════════════
   USAGE EXAMPLES (copy into your pages — adjust paths/names)
   ═════════════════════════════════════════════════════════════

   ── 1) Index page: src/pages/blog/index.astro ─────────────────
   ---
   import { isPageEnabled, getListed } from '../../utils/visibility';
   if (!(await isPageEnabled('blog'))) return Astro.rewrite('/404');
   const posts = (await getListed('blog')).sort((a, b) => +b.data.date - +a.data.date);
   ---

   ── 2) Detail page: src/pages/blog/[...slug].astro ────────────
   ---
   import { isPageEnabled, getPublished } from '../../utils/visibility';
   export async function getStaticPaths() {
     if (!(await isPageEnabled('blog'))) return [];      // page disabled → no HTML generated
     const posts = await getPublished('blog');           // drafts / future posts skipped
     return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
   }
   const { post } = Astro.props;
   const noindex = post.data.unlisted;                   // pass to <BaseLayout noindex={noindex}>
   ---

   ── 3) Homepage sections: src/pages/index.astro ───────────────
   ---
   import { getSiteControl } from '../utils/visibility';
   const { home } = await getSiteControl();
   ---
   {home.hero && <Hero />}
   {home.stats && <StatsRow />}
   {home.featuredProjects && <FeaturedProjects />}
   {home.latestPosts && <LatestPosts />}

   ── 4) Layout: maintenance mode + announcement bar + menu ─────
   ---
   import { getSiteControl, getVisibleNav } from '../utils/visibility';
   const { maintenance, announcement } = await getSiteControl();
   const nav = await getVisibleNav(defaultNavItems);
   ---
   {announcement.enabled && announcement.text && (
     <div class="announcement">
       {announcement.url ? <a href={announcement.url}>{announcement.text}</a> : announcement.text}
     </div>
   )}
   <Header items={nav} />
   {maintenance.enabled ? <main><p>{maintenance.message}</p></main> : <slot />}

   ── 5) Sitemap (astro.config.mjs) — hide disabled pages ───────
   Add `filter: (url) => !disabledPrefixes.some((p) => url.includes(p))` to @astrojs/sitemap,
   or generate the list from getSiteControl() in a small custom endpoint.
   ═════════════════════════════════════════════════════════════ */
