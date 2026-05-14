import React from 'react'
import * as LucideIcons from 'lucide-react'

export const getIcon = (iconName: string): React.ReactNode => {
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Globe
  return <IconComponent />
}
