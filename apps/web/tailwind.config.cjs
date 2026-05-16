/** @type {import('tailwindcss').Config} */

// Helper: map a CSS variable name to a Tailwind-compatible color value.
// Using HSL channels would allow /opacity modifiers (bg-surface-2/50), but
// since our tokens are hex we use the rgb() trick via the special DEFAULT key.
const v = (variable) => `var(${variable})`

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ────────────────────────────────────────────────────────
        bg:             v('--bg'),
        surface: {
          1:     v('--surface-1'),
          2:     v('--surface-2'),
          3:     v('--surface-3'),
          4:     v('--surface-4'),
          5:     v('--surface-5'),
          6:     v('--surface-6'),
          7:     v('--surface-7'),
          hover:   v('--surface-hover'),
          active:  v('--surface-active'),
          editor:  v('--surface-editor'),
          modal:   v('--surface-modal'),
          0:       v('--surface-0'),
        },

        // ── Semantic ──────────────────────────────────────────────────────────
        error: v('--color-error'),

        // ── Text ─────────────────────────────────────────────────────────────
        text: {
          primary:     v('--text-primary'),
          body:        v('--text-body'),
          secondary:   v('--text-secondary'),
          tertiary:    v('--text-tertiary'),
          muted:       v('--text-muted'),
          subtle:      v('--text-subtle'),
          icon:        v('--text-icon'),
          placeholder: v('--text-placeholder'),
        },

        // ── Borders ───────────────────────────────────────────────────────────
        border: {
          DEFAULT:  v('--border-default'),
          default:  v('--border-default'),
          strong:   v('--border-strong'),
          muted:    v('--border-muted'),
          divider:  v('--border-divider'),
        },

        // ── Brand ─────────────────────────────────────────────────────────────
        brand: {
          DEFAULT:      v('--brand-accent'),
          accent:       v('--brand-accent'),
          'accent-hover': v('--brand-accent-hover'),
          secondary:    v('--brand-secondary'),
        },
      },
    },
  },
  plugins: [],
}
