// src/utils/tags.ts
// Single place that turns whatever is stored in `tags:` (tag IDs from the Tags
// collection, or legacy free-text labels) into clean, de-duplicated tag objects.
//
//  • Tag IDs      (new data)   "site-investigations"  → label from the Tags collection
//  • Legacy text  (old data)   " Site Investigations"  → matched to the same tag by label
//  • Unknown text              "Something new"         → still shown, but de-duplicated
//    ignoring case, extra spaces and stray commas
//
// Result: the same tag can never appear twice in filters or on cards.
import { getCollection } from 'astro:content';

export type TagItem = { id: string; label: string };
export type TagIndex = {
  byId: Map<string, string>;
  byLabel: Map<string, TagItem>;
};

const clean = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
const keyOf = (s: string) => clean(s).toLowerCase().replace(/,/g, '');

/** Load the central tag list (src/content/tags/*.json) once per page build. */
export async function getTagIndex(): Promise<TagIndex> {
  const entries = await getCollection('tags');
  const byId = new Map<string, string>();
  const byLabel = new Map<string, TagItem>();
  for (const entry of entries) {
    const label = clean(entry.data.name);
    byId.set(entry.id, label);
    byLabel.set(keyOf(label), { id: entry.id, label });
  }
  return { byId, byLabel };
}

/** Resolve an entry's raw `tags` value into unique { id, label } items. */
export function resolveTags(
  raw: ReadonlyArray<string | null | undefined> | null | undefined,
  index: TagIndex
): TagItem[] {
  const out = new Map<string, TagItem>();
  for (const value of raw ?? []) {
    if (!value) continue;
    const trimmed = clean(value);
    if (!trimmed) continue;

    const label = index.byId.get(trimmed);
    const item: TagItem = label
      ? { id: trimmed, label }
      : index.byLabel.get(keyOf(trimmed)) ?? { id: keyOf(trimmed), label: trimmed };

    if (!out.has(item.id)) out.set(item.id, item);
  }
  return [...out.values()];
}

/** Unique, alphabetically sorted tags across several entries (for filter buttons). */
export function collectTags(lists: TagItem[][]): TagItem[] {
  const all = new Map<string, TagItem>();
  for (const list of lists) for (const tag of list) if (!all.has(tag.id)) all.set(tag.id, tag);
  return [...all.values()].sort((a, b) => a.label.localeCompare(b.label));
}
