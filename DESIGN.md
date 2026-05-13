---
# design-md spec v1
name: Fuse
description: A high-precision, production-grade workflow automation platform with a focus on enterprise reliability and professional utility.
tokens:
  colors:
    brand:
      primary: "#4d7fff"
      secondary: "#1a5cff"
      accent: "#7c3aed"
      accent-hover: "#6d28d9"
    light:
      bg: "#f8fafc"
      surface:
        "1": "#f1f5f9"
        "2": "#ffffff"
        "3": "#f8fafc"
        "4": "#e2e8f0"
        "5": "#cbd5e1"
        "6": "#94a3b8"
        "7": "#64748b"
        hover: "#f1f5f9"
        active: "#e2e8f0"
      text:
        primary: "#0f172a"
        secondary: "#334155"
        tertiary: "#475569"
        muted: "#64748b"
        subtle: "#94a3b8"
        body: "#1e293b"
        icon: "#475569"
        placeholder: "#94a3b8"
        success: "#10b981"
        error: "#ef4444"
      border:
        default: "#e2e8f0"
        strong: "#cbd5e1"
        muted: "#f1f5f9"
        divider: "#f1f5f9"
    dark:
      bg: "#0a0a0a"
      surface:
        "1": "#121212"
        "2": "#171717"
        "3": "#1a1a1a"
        "4": "#262626"
        "5": "#404040"
        "6": "#525252"
        "7": "#737373"
        hover: "#1e1e1e"
        active: "#262626"
      text:
        primary: "#fafafa"
        secondary: "#e5e5e5"
        tertiary: "#a3a3a3"
        muted: "#737373"
        subtle: "#525252"
        body: "#d4d4d4"
        icon: "#a3a3a3"
        placeholder: "#525252"
        success: "#10b981"
        error: "#ef4444"
      border:
        default: "#262626"
        strong: "#404040"
        muted: "#171717"
        divider: "#1a1a1a"
    semantic:
      error: "#ef4444"
      caution: "#f59e0b"
      success: "#10b981"
      warning: "#f97316"
    selection:
      light: "#4d7fff"
      dark: "#4d7fff"
      bg-light: "#dbeafe"
      bg-dark: "#1e3a8a"
  typography:
    families:
      body: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
      mono: "Roboto Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      brand: "Outfit, system-ui, sans-serif"
    sizes:
      micro: "10px"
      xs: "11px"
      caption: "12px"
      small: "13px"
      base: "14px"
      md: "16px"
    weights:
      base: 400
      medium: 500
      semibold: 600
      bold: 700
  radii:
    default: "8px"
    xs: "2px"
    sm: "4px"
    md: "8px"
    lg: "12px"
  shadows:
    subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
    medium: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    overlay: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
  motion:
    standard: "200ms cubic-bezier(0.4, 0, 0.2, 1)"
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)"
---

# Design Identity: Fuse

Fuse is designed as a **high-precision, enterprise-grade workspace** for professional developers and automation engineers. The visual identity emphasizes **functional density, structural clarity, and professional reliability**.

## Visual Principles

### 1. Enterprise-Grade Reliability
The core of Fuse's aesthetic is a refined, stable palette. We use cool grays and deep slates to create a focused, industrious environment that feels solid and dependable.

### 2. Hierarchical Surface Elevation
Hierarchy is established through a multi-layered surface system that provides depth and focus.
- **Canvas (`bg`):** The primary workspace background, kept neutral to allow nodes to stand out.
- **Panels (`surface-1`):** Structural sidebars and property editors that frame the workspace.
- **Nodes (`surface-2`):** Interactive blocks that are the primary focus of the platform.
- **Modals/Popovers (`surface-6/7`):** High-elevation contexts for critical interactions.

### 3. Professional Brand Accents
Fuse uses brand colors intentionally to guide action and denote status.
- **Brand Primary (#4d7fff):** Used for primary actions, selection states, and focus.
- **Brand Accent (#7c3aed):** Used for AI-driven features and advanced automation blocks.
- **Success/Error:** Vibrant semantic colors for real-time execution feedback.

### 4. Typography for Clarity
- **Inter:** Our primary UI font, chosen for its exceptional legibility and neutral character.
- **Roboto Mono:** Used for all code blocks, variables, and logs to ensure technical precision.
- **Outfit:** Used for headings and brand elements to provide a modern, premium character.

### 5. Snappy, Utility-First Motion
Animations in Fuse are fast and purposeful. They provide immediate feedback for user actions—like a node snapping into place or an execution line pulsing—without ever feeling sluggish or decorative.

### 6. Consistent Geometry
A standard **8px border radius** is applied to primary components to achieve a modern but disciplined look. Interactive elements use precise padding and alignment to maintain a high-density, professional UI.
