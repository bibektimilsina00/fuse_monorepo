import { 
  Table, 
  Files, 
  Database, 
  Calendar, 
  ScrollText,
  User,
  Puzzle,
  Key,
  Wrench,
  Lightbulb,
  Layers,
  KeyRound,
  Server,
  Trash2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href?: string
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  onClick?: () => void
  type?: 'link' | 'button' | 'action'
}

export interface NavSection {
  label: string
  items: NavItem[]
  hasAdd?: boolean
}

export const MAIN_NAV: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Tables", href: "/tables", icon: Table },
      { label: "Files", href: "/files", icon: Files },
      { label: "Knowledge Base", href: "/kb", icon: Database },
      { label: "Scheduled Tasks", href: "/scheduled", icon: Calendar },
      { label: "Logs", href: "/logs", icon: ScrollText },
    ]
  }
]

export const SETTINGS_NAV: NavSection[] = [
  {
    label: "Account",
    items: [
      { label: "General", href: "/settings/general", icon: User },
      { label: "Integrations", href: "/settings/integrations", icon: Puzzle },
      { label: "Secrets", href: "/settings/secrets", icon: Key },
    ]
  },
  {
    label: "Tools",
    items: [
      { label: "Custom Tools", href: "/settings/custom-tools", icon: Wrench },
      { label: "Skills", href: "/settings/skills", icon: Lightbulb },
      { label: "MCP Tools", href: "/settings/mcp-tools", icon: Layers },
    ]
  },
  {
    label: "System",
    items: [
      { label: "Fuse Keys", href: "/settings/keys", icon: KeyRound },
      { label: "MCP Servers", href: "/settings/mcp-servers", icon: Server },
      { label: "Recently Deleted", href: "/settings/deleted", icon: Trash2 },
    ]
  }
]
