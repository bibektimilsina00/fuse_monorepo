import React from 'react'
import { SidebarItem } from '@/components/navigation/sidebar/SidebarItem'
import type { LucideIcon } from 'lucide-react'

interface SidebarLinkProps {
  href: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  isCollapsed?: boolean
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Convenience wrapper for SidebarItem that specializes in navigation links.
 */
export const SidebarLink: React.FC<SidebarLinkProps> = (props) => {
  return <SidebarItem {...props} variant="default" />
}
