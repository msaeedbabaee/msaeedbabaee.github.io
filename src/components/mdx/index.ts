// نگاشت مرکزی کامپوننت‌های سفارشی MDX
// در تمام صفحاتی که محتوای Keystatic (Blog/Projects/Services/Research) را رندر می‌کنند
// از همین یک آبجکت به‌عنوان components پاس داده می‌شود
import YouTube from './YouTube.astro';
import Video from './Video.astro';
import Embed from './Embed.astro';
import DemoLink from './DemoLink.astro';

export const mdxComponents = {
  YouTube,
  Video,
  Embed,
  DemoLink,
};
