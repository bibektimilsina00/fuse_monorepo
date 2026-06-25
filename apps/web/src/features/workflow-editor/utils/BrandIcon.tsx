import { useEffect, useState } from 'react'

interface IconModule {
  variants?: Record<string, string>
}

/**
 * Loaded-icon cache keyed by normalised slug. Vite already dedupes
 * dynamic imports at the module level, but caching the resolved
 * IconModule means we avoid the `await import(...)` micro-task on
 * every render — the SVG paints synchronously the second time a node
 * with that brand mounts.
 *
 * Negative cache entries (`null`) are kept so we don't re-try the
 * dynamic import for a slug that doesn't ship in `@thesvg/icons` (e.g.
 * the user typed a typo in node metadata).
 */
const iconCache = new Map<string, IconModule | null>()

async function loadIcon(slug: string): Promise<IconModule | null> {
  if (iconCache.has(slug)) return iconCache.get(slug) ?? null
  let resolved: IconModule | null
  try {
    // Dynamic import resolves at runtime. Vite analyses the template
    // and emits a lazy chunk per matching `@thesvg/icons/*` file —
    // only the chunks whose slug is actually requested by the running
    // editor get fetched, so the editor's initial bundle stays lean.
    const m = (await import(`@thesvg/icons/${slug}`)) as { default?: IconModule }
    resolved = m.default ?? null
  } catch {
    resolved = null
  }
  iconCache.set(slug, resolved)
  return resolved
}

/**
 * Renders a theSVG icon module by slug. Prefers the `mono` variant so
 * the silhouette inherits the parent's `text-*` colour on a brand-
 * coloured tile; falls back to `default` for icons that ship no mono
 * (e.g. Slack — its identity is the four-colour cluster).
 *
 * Lives in its own file so vite-react-refresh stays happy (the
 * surrounding registry is plain data).
 */
export function BrandIcon({ slug }: { slug: string }) {
  // Seed from the cache so a warm slug paints synchronously on first
  // render — no flash of empty placeholder when a node remounts.
  const [module, setModule] = useState<IconModule | null>(() => iconCache.get(slug) ?? null)

  useEffect(() => {
    let cancelled = false
    // Always reach for the value via `loadIcon` — it short-circuits
    // against the cache itself, so this is a no-network resolve when
    // the slug is already known. The state write lives inside the
    // promise callback (never synchronously in the effect body) so
    // react-hooks/set-state-in-effect stays happy.
    void loadIcon(slug).then((mod) => {
      if (!cancelled) setModule(mod)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!module) {
    // While the chunk streams in (~10-30ms on a warm cache), render a
    // transparent placeholder of the same size so the node card
    // doesn't reflow. On miss this stays empty, which is fine — the
    // outer NodeHeader still shows the brand-coloured tile.
    return <span className="inline-block h-full w-full" />
  }

  const variants = module.variants ?? {}
  const raw = variants.mono ?? variants.default ?? ''
  const svg = injectCurrentColor(raw)
  return (
    <span
      className="inline-flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-current"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/** Add `fill="currentColor"` to the `<svg>` root when no explicit fill
 *  is set so paths without their own fill inherit the parent colour
 *  instead of falling back to black. Idempotent.
 */
function injectCurrentColor(svg: string): string {
  if (!svg) return svg
  if (/<svg[^>]*\bfill=/i.test(svg)) return svg
  return svg.replace(/<svg(\s)/i, '<svg fill="currentColor"$1')
}
