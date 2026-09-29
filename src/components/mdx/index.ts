// نگاشت مرکزی کامپوننت‌های سفارشی MDX
// در تمام صفحاتی که محتوای Keystatic (Blog/Projects/Services/Research) را رندر می‌کنند
// از همین یک آبجکت به‌عنوان components پاس داده می‌شود.
// نام‌ها باید دقیقاً با keystatic.config.ts (mdxComponents) یکی باشند.
import YouTube from './YouTube.astro';
import Video from './Video.astro';
import Embed from './Embed.astro';
import DemoLink from './DemoLink.astro';
import Equation from './Equation.astro';
import InlineMath from './InlineMath.astro';

export const mdxComponents = {
  YouTube,
  Video,
  Embed,
  DemoLink,
  Equation,
  InlineMath,
};
