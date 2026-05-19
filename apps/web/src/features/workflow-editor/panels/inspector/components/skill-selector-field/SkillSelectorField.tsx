import React, { useEffect, useRef, useState } from 'react'
import { BookOpen, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSkills, type SkillMeta } from '@/hooks/skills/queries'

export interface SkillSelectorFieldProps {
  value: string[]          // array of skill IDs
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export const SkillSelectorField: React.FC<SkillSelectorFieldProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  const { data: allSkills = [], isLoading } = useSkills()
  const [comboOpen, setComboOpen] = useState(false)
  const [query, setQuery] = useState('')
  const comboRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!comboOpen) return
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [comboOpen])

  useEffect(() => {
    if (comboOpen) inputRef.current?.focus()
  }, [comboOpen])

  const selectedSet = new Set(value)

  const selected: SkillMeta[] = value
    .map((id) => allSkills.find((s) => s.id === id))
    .filter(Boolean) as SkillMeta[]

  const filtered = allSkills.filter(
    (s) =>
      !selectedSet.has(s.id) &&
      (s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase())),
  )

  const handleAdd = (skill: SkillMeta) => {
    onChange([...value, skill.id])
    setQuery('')
    setComboOpen(false)
  }

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className={cn('flex flex-col gap-2', disabled && 'opacity-50 pointer-events-none')}>
      {/* Selected skills */}
      {selected.length > 0 && (
        <div className="flex flex-col gap-1">
          {selected.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-surface-editor"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[12px] font-bold text-white truncate">{skill.name}</span>
                {skill.description && (
                  <span className="text-[10px] text-text-muted truncate">{skill.description}</span>
                )}
              </div>
              <button
                onClick={() => handleRemove(skill.id)}
                className="p-1 rounded hover:bg-surface-5 text-text-muted hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button + combobox */}
      <div className="relative" ref={comboRef}>
        <button
          onClick={() => setComboOpen((v) => !v)}
          className={cn(
            'w-full flex items-center gap-2 border rounded-md px-3 h-[36px] text-[13px] transition-colors',
            selected.length === 0
              ? 'border-dashed border-border hover:border-border-strong bg-transparent text-text-muted hover:text-white'
              : 'border-border bg-surface-editor text-text-muted hover:text-white hover:border-border-strong',
          )}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Add skill...</span>
        </button>

        {comboOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-modal border border-border rounded-md shadow-lg z-50 overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills..."
                className="flex-1 bg-transparent text-[12px] text-white placeholder:text-text-muted outline-none"
              />
            </div>

            {/* Options */}
            <div className="max-h-[200px] overflow-y-auto py-1">
              {isLoading && (
                <div className="px-3 py-3 text-center text-[12px] text-text-muted">Loading...</div>
              )}

              {!isLoading && filtered.length === 0 && allSkills.length === 0 && (
                <div className="px-3 py-3 text-center text-[12px] text-text-muted">
                  No skills yet. Create one in Settings → Skills.
                </div>
              )}

              {!isLoading && filtered.length === 0 && allSkills.length > 0 && (
                <div className="px-3 py-3 text-center text-[12px] text-text-muted">
                  {query ? `No skills match "${query}"` : 'All skills already added'}
                </div>
              )}

              {filtered.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleAdd(skill)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-5 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] text-white truncate">{skill.name}</span>
                    {skill.description && (
                      <span className="text-[11px] text-text-muted truncate">{skill.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
