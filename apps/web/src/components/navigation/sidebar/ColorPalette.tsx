import React from 'react'
import { Check } from 'lucide-react'

const WORKFLOW_COLORS = [
  // Row 1: Blues/Indigos
  '#3b82f6', '#2563eb', '#1d4ed8', '#6366f1', '#4f46e5', '#4338ca',
  // Row 2: Cyans/Teals
  '#06b6d4', '#0891b2', '#0e7490', '#14b8a6', '#0d9488', '#0f766e',
  // Row 3: Greens/Limes
  '#10b981', '#059669', '#047857', '#84cc16', '#65a30d', '#4d7c0f',
  // Row 4: Yellows/Ambers
  '#facc15', '#eab308', '#ca8a04', '#f59e0b', '#d97706', '#b45309',
  // Row 5: Oranges/Reds
  '#fb923c', '#f97316', '#ea580c', '#f87171', '#ef4444', '#dc2626',
  // Row 6: Purples/Pinks
  '#a855f7', '#9333ea', '#7e22ce', '#ec4899', '#db2777', '#be185d',
]

interface ColorPaletteProps {
  workflowId: string
  currentColor?: string | null
  onSelect: (color: string | null) => void
}

/**
 * UI Component for the workflow color palette.
 */
export const ColorPalette: React.FC<ColorPaletteProps> = ({ 
  currentColor, 
  onSelect 
}) => {
  return (
    <div className="grid grid-cols-6 gap-x-0.5 gap-y-1 py-1 px-0.5 w-fit mx-auto">
      {WORKFLOW_COLORS.map(color => (
        <button
          key={color}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(color)
          }}
          className="w-4 h-4 rounded-[1.5px] transition-all hover:scale-110 flex items-center justify-center border border-white/5 hover:border-white/20"
          style={{ backgroundColor: color }}
        >
          {currentColor === color && (
            <Check className="w-2.5 h-2.5 text-white shadow-sm" />
          )}
        </button>
      ))}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect(null)
        }}
        className="col-span-6 mt-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-white hover:bg-white/5 rounded transition-colors border border-dashed border-white/10"
      >
        Reset to default
      </button>
    </div>
  )
}
