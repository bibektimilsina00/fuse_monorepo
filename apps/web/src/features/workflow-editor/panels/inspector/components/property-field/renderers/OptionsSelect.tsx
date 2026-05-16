import React from 'react'
import type { NodeProperty } from '@fuse/node-definitions'
import { CustomSelect } from '../../custom-select'

interface OptionsSelectProps {
  prop: NodeProperty
  value: any
  onChange: (val: any) => void
}

export const OptionsSelect: React.FC<OptionsSelectProps> = ({ prop, value, onChange }) => (
  <CustomSelect
    value={value}
    options={prop.options}
    onChange={onChange}
    placeholder={prop.placeholder}
  />
)
