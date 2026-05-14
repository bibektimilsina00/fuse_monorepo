import React from 'react'
import { cn } from '@/lib/utils'
import { LogEntry, StartIcon, ApiIcon } from '../../components/common/EditorUI'

interface LogListProps {
  isCollapsed: boolean
}

export const LogList = React.memo(({ isCollapsed }: LogListProps) => {
  return (
    <div className="flex flex-col border-r border-[var(--border-default)] h-full overflow-hidden flex-1 min-w-0">
      <div className="group flex h-[30px] flex-shrink-0 items-center justify-between bg-[var(--bg)] px-4">
        <span className="text-[12px] font-medium text-[var(--text-icon)]">Logs</span>
      </div>

      <div className={cn("flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5", isCollapsed && "hidden")}>
        <LogEntry icon={<StartIcon />} iconBg="rgb(52, 181, 255)" label="Start" duration="0.56ms" />
        <LogEntry icon={<ApiIcon />} iconBg="rgb(47, 85, 255)" label="API 1" duration="0.47ms" active />
        <div className="mx-1 my-2 border-t border-[var(--border-default)]" />
        <LogEntry icon={<StartIcon />} iconBg="rgb(52, 181, 255)" label="Start" duration="4ms" />
        <LogEntry icon={<ApiIcon />} iconBg="rgb(47, 85, 255)" label="API 1" duration="3ms" />
      </div>
    </div>
  )
})
