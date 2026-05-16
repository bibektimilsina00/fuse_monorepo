import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDropdownPosition } from '@/components/navigation/sidebar/hooks/useDropdownPosition'

interface DropdownMenuItemProps {
  label: string
  onClick: () => void
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>
  variant?: 'danger'
  disabled?: boolean
  hasSubmenu?: boolean
  onClose: () => void
}

/**
 * Individual item within the dropdown menu.
 */
const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  label, onClick, icon, variant, disabled, hasSubmenu, onClose 
}) => {
  const renderIcon = () => {
    if (!icon) return null
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in icon)) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>
      return <IconComponent className="w-3.5 h-3.5" />
    }
    return icon
  }

  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
        if (!hasSubmenu) onClose();
      }}
      className={cn(
        "w-full flex items-center justify-between px-3 py-1.5 text-[13px] transition-colors text-left font-[420] group/menuitem",
        variant === 'danger' 
          ? "text-red-400 hover:bg-red-500/10" 
          : "text-[var(--text-primary)] hover:bg-white/5",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
      role="menuitem"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0 opacity-70">
          {renderIcon()}
        </div>
        <span className="truncate">{label}</span>
      </div>
      {hasSubmenu && (
        <ChevronRight className="w-3 h-3 opacity-40 group-hover/menuitem:opacity-100 transition-opacity" />
      )}
    </button>
  )
}

interface DropdownMenuProps {
  items: Omit<DropdownMenuItemProps, 'onClose'>[]
  children: React.ReactElement
  side?: 'right' | 'left'
  className?: string
  submenuContent?: React.ReactNode
}

/**
 * Refactored Dropdown Menu component.
 * Supports sub-views (like color palettes).
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  items, 
  children, 
  side: preferredSide = 'right',
  className,
  submenuContent
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeView, setActiveView] = useState<'main' | 'palette'>('main')
  
  const {
    triggerRef,
    menuRef,
    coords,
    origin,
    isPositioned
  } = useDropdownPosition({ preferredSide, isOpen })

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isOpen) setActiveView('main')
    setIsOpen(!isOpen)
  }

  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, triggerRef, menuRef])

  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        onClick: handleToggle,
        className: cn(children.props.className, isOpen && "opacity-100 bg-[var(--surface-active)]"),
        'aria-haspopup': 'true',
        'aria-expanded': isOpen
      })}

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          role="menu"
          className={cn(
            "fixed w-44 bg-surface-1 border border-white/5 rounded-lg shadow-2xl overflow-hidden z-[9999] py-1 transition-[opacity,transform] duration-150 ease-out",
            isPositioned ? "opacity-100 scale-100" : "opacity-0 scale-95",
            origin === 'top' 
              ? (preferredSide === 'right' ? "origin-top-right" : "origin-top-left") 
              : (preferredSide === 'right' ? "origin-bottom-right" : "origin-bottom-left"),
            className
          )}
          style={{ top: coords.top, left: coords.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeView === 'main' ? (
            items.map((item, i) => (
              <DropdownMenuItem 
                key={i} 
                {...item} 
                onClick={() => {
                  if (item.hasSubmenu) {
                    setActiveView('palette')
                  } else {
                    item.onClick()
                  }
                }}
                onClose={closeMenu} 
              />
            ))
          ) : (
            <div className="p-2">
              <button 
                onClick={() => setActiveView('main')}
                className="flex items-center gap-1.5 px-1 py-1 mb-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
              {submenuContent}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
