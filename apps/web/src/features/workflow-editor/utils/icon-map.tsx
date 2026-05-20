import React from 'react'
import * as LucideIcons from 'lucide-react'
import * as Si from '@icons-pack/react-simple-icons'

// Brand icon prefix convention: "si:SiGithub" → simple-icons
// All other strings → lucide-react (existing behavior unchanged)

export const getIcon = (iconName: string): React.ReactNode => {
  if (iconName?.startsWith('si:')) {
    const siName = iconName.slice(3)
    const SiIcon = (Si as any)[siName]
    if (SiIcon) return <SiIcon />
  }
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Globe
  return <IconComponent />
}
