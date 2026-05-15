import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PanelLeft, PanelLeftOpen } from 'lucide-react'

interface SidebarHeaderProps {
  isCollapsed: boolean
  onToggle: () => void
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isCollapsed, onToggle }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="flex flex-shrink-0 items-center pr-2 pb-2 pl-2.5 h-[38px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-[30px] items-center w-full relative">
        {isCollapsed ? (
          <button onClick={onToggle} className="flex items-center justify-center w-full h-[30px] rounded-lg hover:bg-[var(--surface-hover)] group">
            {isHovered ? <PanelLeftOpen className="w-4 h-4 text-white" /> : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="h-[16px] w-auto text-[var(--brand-accent)]">
                <path d="M10.68 9.25C10.68 11.91 9.61 14.28 7.74 15.98C5.87 17.68 3.33 18.63 0.68 18.63H0.23V0H0.68C3.33 0 5.87 0.95 7.74 2.65C9.61 4.35 10.68 6.72 10.68 9.38" fill="currentColor" />
                <rect x="13.1" y="12.8" width="6.3" height="6.3" rx="1.5" fill="currentColor" />
              </svg>
            )}
          </button>
        ) : (
          <>
            <Link to="/dashboard" className="flex items-center gap-2 px-[7px] h-[30px] rounded-lg hover:bg-[var(--surface-hover)]">
              <svg width="71" height="22" viewBox="0 0 71 22" fill="none" className="h-[16px] w-auto text-[var(--text-primary)]">
                <path d="M10.68 9.25C10.68 11.91 9.61 14.28 7.74 15.98C5.87 17.68 3.33 18.63 0.68 18.63H0.23V0H0.68C3.33 0 5.87 0.95 7.74 2.65C9.61 4.35 10.68 6.72 10.68 9.38" fill="var(--brand-accent)" />
                <rect x="13.1" y="12.8" width="6.3" height="6.3" rx="1.5" fill="var(--brand-accent)" />
                <g fill="currentColor">
                  <text x="22" y="16.5" fontSize="18" fontWeight="600" letterSpacing="-0.02em" className="font-season text-white">Fuse</text>
                </g>
              </svg>
            </Link>
            <button onClick={onToggle} className="ml-auto p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-icon)] hover:text-white transition-colors">
              <PanelLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
