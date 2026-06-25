import React from 'react'
import * as LucideIcons from 'lucide-react'
import { BrandIcon } from './BrandIcon'

/**
 * Two-tier icon resolver:
 *
 * 1. **theSVG brand mark.** Anything lowercase / kebab-case
 *    (`youtube`, `google-sheets`, `slack`) is lazy-loaded from
 *    `@thesvg/icons` via a Vite-managed dynamic import — only the
 *    chunks the running editor actually mounts are downloaded. No
 *    static registry; ANY icon theSVG ships works the moment the
 *    backend names a new node with that slug. No frontend change.
 * 2. **Lucide.** Anything that looks PascalCase (`Play`, `Clock`,
 *    `MessageSquare`) is treated as a bundled Lucide icon. If
 *    neither tier matches, the Globe fallback keeps the node card
 *    from rendering empty.
 *
 * The split-by-casing rule means we never burn a network request on
 * a Lucide name trying to be a theSVG slug, and we never miss a brand
 * because a registry forgot to register it.
 */
export const getIcon = (iconName: string): React.ReactNode => {
  if (looksLikeBrandSlug(iconName)) {
    return <BrandIcon slug={iconName.toLowerCase()} />
  }
  const LucideComponent = (LucideIcons as unknown as Record<string, React.ElementType | undefined>)[iconName]
  if (LucideComponent) {
    return <LucideComponent />
  }
  return <LucideIcons.Globe />
}

/** A brand slug is all-lowercase letters / digits, optionally
 *  hyphen-separated — the exact shape `@thesvg/icons` ships its
 *  modules under. Lucide names are PascalCase, so an uppercase first
 *  letter is a perfect signal that this is NOT a brand. */
function looksLikeBrandSlug(name: string): boolean {
  if (!name) return false
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
}
