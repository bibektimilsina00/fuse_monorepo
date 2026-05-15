import React, { useRef, useEffect } from 'react'
import { Search, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandPalette } from '@/components/navigation/hooks/useCommandPalette'

/**
 * Individual result item in the Command Palette.
 */
const PaletteItem: React.FC<{
  label: string
  icon: React.ReactNode | React.ComponentType<{ className?: string }>
  color?: string
  isActive: boolean
  onClick: () => void
  onMouseEnter: () => void
}> = ({ label, icon, color, isActive, onClick, onMouseEnter }) => {
  const renderIcon = () => {
    if (!icon) return null
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && 'render' in icon)) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>
      return <IconComponent className={cn("w-4 h-4", !isActive && color)} />
    }
    return icon
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] transition-all text-left outline-none",
        isActive 
          ? "bg-[var(--brand-accent)] text-white shadow-lg shadow-brand-accent/20" 
          : "text-[var(--text-body)] hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn(
        "flex-shrink-0 transition-colors",
        isActive ? "text-white" : "text-[var(--text-icon)]"
      )}>
        {renderIcon()}
      </div>
      <span className="truncate font-[450] flex-1">{label}</span>
      {isActive && <Command className="w-3 h-3 opacity-60" />}
    </button>
  )
}

/**
 * Command Palette component.
 * Provides a global search and action interface with keyboard navigation.
 */
export const CommandPalette: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    isSearchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    selectedIndex,
    filteredResults,
    handleKeyDown,
    flatItems
  } = useCommandPalette()

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isSearchOpen])

  if (!isSearchOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={() => setSearchOpen(false)}
    >
      <div 
        className="w-full max-w-[580px] bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="relative flex items-center px-4 border-b border-white/5">
          <Search className="w-4.5 h-4.5 text-[var(--text-icon)] mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search workflows, folders, or actions..."
            className="flex-1 h-14 bg-transparent border-none text-[15px] text-white placeholder:text-[var(--text-muted)] focus:ring-0 outline-none font-[450]"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Esc
          </div>
        </div>

        {/* Results Body */}
        <div className="max-h-[420px] overflow-y-auto p-2 custom-scrollbar">
          {filteredResults.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-[var(--text-muted)] opacity-20" />
              </div>
              <p className="text-[14px] text-[var(--text-muted)] font-medium">No results found for "{searchValue}"</p>
              <p className="text-[12px] text-[var(--text-muted)]/60 mt-1">Try a different search term or check your spelling.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {filteredResults.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="px-3 pb-1">
                    <span className="text-[11px] font-bold text-[var(--text-muted)]/60 uppercase tracking-[0.1em]">
                      {group.title}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const absoluteIndex = flatItems.findIndex(fi => fi.id === item.id)
                      return (
                        <PaletteItem
                          key={item.id}
                          label={item.label}
                          icon={item.icon}
                          color={(item as any).color}
                          isActive={selectedIndex === absoluteIndex}
                          onClick={() => {
                            item.onClick()
                            setSearchOpen(false)
                          }}
                          onMouseEnter={() => {}} // Could sync index on hover if desired
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] font-medium">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">↑↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Enter</kbd>
              <span>to select</span>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] opacity-40">
            Fuse Command Palette
          </div>
        </div>
      </div>
    </div>
  )
}
