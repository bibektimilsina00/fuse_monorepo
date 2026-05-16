import React from 'react'
import type { NodeProperty } from '@fuse/node-definitions'
import { toInputValue } from '../../../utils/field-helpers'

interface NumberInputProps {
  prop: NodeProperty
  value: any
  onChange: (val: any) => void
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  onClick: (e: React.MouseEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const NumberInput: React.FC<NumberInputProps> = ({
  prop, value, onChange, onFocus, onClick, onKeyDown,
}) => (
  <input
    type="number"
    value={toInputValue(value)}
    onFocus={onFocus}
    onClick={onClick}
    onKeyDown={onKeyDown}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    placeholder={prop.placeholder || '0'}
    className="w-full bg-surface-editor border border-border rounded-md px-3 h-[36px] text-[13px] text-white placeholder:text-text-placeholder focus:outline-none"
  />
)
