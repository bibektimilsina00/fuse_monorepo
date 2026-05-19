import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useSkills,
  useSkill,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  type SkillMeta,
  type Skill,
} from '@/hooks/skills/queries'

// ---------------------------------------------------------------------------
// Shared inspector-style primitives
// ---------------------------------------------------------------------------

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="mb-3 mt-6 pb-1 border-b border-border">
    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
  </div>
)

const FieldLabel: React.FC<{ label: string; required?: boolean; hint?: string }> = ({
  label,
  required,
  hint,
}) => (
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-[12px] font-bold text-white">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
  </div>
)

const textInputClass =
  'w-full bg-surface-editor border border-border rounded-md px-3 h-[36px] text-[13px] text-white placeholder:text-text-placeholder focus:outline-none focus:border-border-strong transition-colors'

// ---------------------------------------------------------------------------
// ToolEditor — right panel, inspector-style
// ---------------------------------------------------------------------------

interface ToolEditorProps {
  skillId: string | null
  onCreated: (id: string) => void
  onDeleted: () => void
  isNew: boolean
}

const ToolEditor: React.FC<ToolEditorProps> = ({ skillId, onCreated, onDeleted, isNew }) => {
  const { data: skill, isLoading } = useSkill(skillId && !isNew ? skillId : '')
  const createSkill = useCreateSkill()
  const updateSkill = useUpdateSkill()
  const deleteSkill = useDeleteSkill()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)

  // Sync with loaded skill data
  useEffect(() => {
    if (isNew) {
      setName('')
      setDescription('')
      setContent('')
      setDirty(false)
    } else if (skill) {
      setName(skill.name)
      setDescription(skill.description)
      setContent(skill.content)
      setDirty(false)
    }
  }, [skill, isNew, skillId])

  const isValidName = name.trim().length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name.trim())
  const canSave = isValidName && content.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    if (isNew) {
      createSkill.mutate(
        { name: name.trim(), description: description.trim(), content: content.trim() },
        { onSuccess: (s) => { onCreated(s.id); setDirty(false) } },
      )
    } else if (skillId) {
      updateSkill.mutate(
        { id: skillId, description: description.trim(), content: content.trim() },
        { onSuccess: () => setDirty(false) },
      )
    }
  }

  const handleDelete = () => {
    if (!skillId || isNew) return
    deleteSkill.mutate(skillId, { onSuccess: onDeleted })
  }

  const change = (setter: (v: string) => void) => (v: string) => {
    setter(v)
    setDirty(true)
  }

  const isSaving = createSkill.isPending || updateSkill.isPending

  if (!isNew && isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!isNew && !skillId) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-8">
        <div>
          <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-[14px] font-medium text-white mb-1">No tool selected</p>
          <p className="text-[13px] text-text-muted">
            Select a tool from the list or create a new one.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — matches NodeHeader style */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[14px] font-semibold text-white truncate">
            {isNew ? 'New Tool' : name}
          </span>
          {dirty && <span className="text-[10px] text-text-muted shrink-0">• unsaved</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isNew && skillId && (
            <button
              onClick={handleDelete}
              disabled={deleteSkill.isPending}
              className="flex items-center gap-1.5 px-3 h-[32px] rounded-md border border-border text-[12px] text-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving || (!dirty && !isNew)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-[32px] rounded-md text-[12px] font-semibold transition-colors',
              canSave && (dirty || isNew)
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-surface-5 text-text-muted cursor-not-allowed',
            )}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Body — scrollable, same padding/layout as EditorTab */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-2">
        <SectionHeader label="Tool Settings" />

        {/* Name */}
        <div className="mb-4">
          <FieldLabel label="Name" required hint="kebab-case" />
          <input
            className={textInputClass}
            value={name}
            onChange={(e) => change(setName)(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-tool"
            disabled={!isNew}
          />
          {name && !isValidName && (
            <p className="text-[11px] text-red-400 mt-1">
              Lowercase letters, numbers and hyphens only
            </p>
          )}
          {!isNew && (
            <p className="text-[11px] text-text-muted mt-1">Name cannot be changed after creation.</p>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <FieldLabel label="Description" hint="shown to LLM" />
          <input
            className={textInputClass}
            value={description}
            onChange={(e) => change(setDescription)(e.target.value)}
            placeholder="What this tool does — the LLM uses this to decide when to call it"
          />
        </div>

        <SectionHeader label="Instructions" />

        {/* Content — code editor style matching inspector */}
        <div className="mb-4">
          <FieldLabel
            label="Markdown Content"
            required
            hint={`${content.length} / 50,000`}
          />
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => change(setContent)(e.target.value)}
              placeholder={'# My Tool\n\nWhen the agent loads this tool, it receives these instructions.\n\nYou can include:\n- Step-by-step guidance\n- Examples\n- Constraints\n- Output format requirements'}
              className={cn(
                'w-full bg-surface-editor border border-border rounded-md px-3 py-2.5',
                'text-[13px] text-white font-mono leading-relaxed',
                'placeholder:text-text-placeholder',
                'focus:outline-none focus:border-border-strong transition-colors',
                'resize-none custom-scrollbar',
              )}
              rows={20}
              maxLength={50000}
            />
          </div>
        </div>

        {(createSkill.isError || updateSkill.isError) && (
          <p className="text-[12px] text-red-400 mt-2">
            Save failed. Name may already be taken.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToolList — left panel
// ---------------------------------------------------------------------------

interface ToolListProps {
  tools: SkillMeta[]
  selectedId: string | null
  isNew: boolean
  onSelect: (id: string) => void
  onNew: () => void
}

const ToolList: React.FC<ToolListProps> = ({ tools, selectedId, isNew, onSelect, onNew }) => (
  <div className="flex flex-col h-full border-r border-border">
    {/* List header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <span className="text-[12px] font-bold text-text-muted uppercase tracking-wider">Tools</span>
      <button
        onClick={onNew}
        className="p-1 rounded hover:bg-surface-5 text-text-muted hover:text-white transition-colors"
        title="New tool"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>

    {/* Tool entries */}
    <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
      {tools.length === 0 && (
        <div className="px-4 py-6 text-center text-[12px] text-text-muted">
          No tools yet.<br />Click + to create one.
        </div>
      )}

      {/* "New tool" entry */}
      {isNew && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-5">
          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[13px] text-white font-medium truncate">New Tool</span>
        </div>
      )}

      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelect(tool.id)}
          className={cn(
            'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
            selectedId === tool.id && !isNew
              ? 'bg-surface-5'
              : 'hover:bg-surface-2',
          )}
        >
          <BookOpen className={cn(
            'w-3.5 h-3.5 shrink-0',
            selectedId === tool.id && !isNew ? 'text-primary' : 'text-text-muted',
          )} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className={cn(
              'text-[13px] font-medium truncate',
              selectedId === tool.id && !isNew ? 'text-white' : 'text-text-muted',
            )}>
              {tool.name}
            </span>
            {tool.description && (
              <span className="text-[11px] text-text-muted truncate">{tool.description}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// SkillsSettings — full-height two-panel tool editor
// ---------------------------------------------------------------------------

export const SkillsSettings: React.FC = () => {
  const { data: tools = [], isLoading } = useSkills()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)

  // Auto-select first tool on load
  useEffect(() => {
    if (!selectedId && !isNew && tools.length > 0) {
      setSelectedId(tools[0].id)
    }
  }, [tools, selectedId, isNew])

  const handleNew = () => {
    setIsNew(true)
    setSelectedId(null)
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setIsNew(false)
  }

  const handleCreated = (id: string) => {
    setSelectedId(id)
    setIsNew(false)
  }

  const handleDeleted = () => {
    setSelectedId(tools.find((t) => t.id !== selectedId)?.id ?? null)
    setIsNew(false)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left — tool list */}
      <div className="w-[220px] shrink-0 flex flex-col overflow-hidden">
        <ToolList
          tools={tools}
          selectedId={selectedId}
          isNew={isNew}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>

      {/* Right — inspector-style editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <ToolEditor
          skillId={selectedId}
          isNew={isNew}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        />
      </div>
    </div>
  )
}
