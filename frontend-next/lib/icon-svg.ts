import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideFC = React.FC<any>;

const _cache = new Map<string, string>();

/**
 * Converts a Lucide icon component to a CSS-ready data URI.
 * Called once per icon at module load time; result is cached.
 * Use as mask-image + background-color:currentColor to render
 * the icon as a pure CSS background that inherits text color.
 */
export function lucideToDataUrl(Icon: LucideFC): string {
    const key = (Icon as any).displayName ?? (Icon as any).name ?? "";
    const cached = _cache.get(key);
    if (cached) return cached;
    try {
        const svg = renderToStaticMarkup(
            createElement(Icon, { size: 16, strokeWidth: 2 })
        );
        const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        _cache.set(key, url);
        return url;
    } catch {
        return "";
    }
}
