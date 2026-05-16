import React from 'react'
import { getIcon } from '@/features/workflow-editor/utils/icon-map'

interface NodeHeaderProps {
  label: string
  icon: string
  color?: string
}

export const NodeHeader = ({ label, icon, color }: NodeHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5">
        <div
          className="flex size-[24px] flex-shrink-0 items-center justify-center rounded-md"
          style={{ background: color }}
        >
          {React.cloneElement(getIcon(icon) as React.ReactElement, { className: 'size-[16px] text-white' })}
        </div>
        <span className="truncate font-bold text-[13px] text-white" title={label}>
          {label}
        </span>
      </div>
    </div>
  )
}
