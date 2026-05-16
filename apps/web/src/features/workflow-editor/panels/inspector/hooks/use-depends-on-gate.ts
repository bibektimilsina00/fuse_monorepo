import { useMemo } from 'react'
import type { NodeProperty } from '@fuse/node-definitions'
import {
  isNonEmptyValue,
  resolveDependencyValue,
  type CanonicalIndex,
  type CanonicalModeOverrides,
} from '../visibility'

export interface DependsOnGate {
  disabled: boolean
  tooltip: string | null
}

/**
 * Determines whether a property should be disabled based on its `dependsOn` fields.
 *
 * Supports both array format (all must be set) and object format:
 *   { all?: string[]; any?: string[] }
 *
 * Dependency values are resolved through the canonical index so that
 * canonical pair members (basic/advanced variants) resolve to the active value.
 */
export function useDependsOnGate(
  prop: NodeProperty,
  properties: Record<string, any>,
  canonicalIndex?: CanonicalIndex,
  canonicalModes?: CanonicalModeOverrides,
): DependsOnGate {
  return useMemo(() => {
    if (!prop.dependsOn) return { disabled: false, tooltip: null }

    const resolve = (field: string): unknown =>
      canonicalIndex
        ? resolveDependencyValue(field, properties, canonicalIndex, canonicalModes)
        : properties[field]

    let missingFields: string[]

    if (Array.isArray(prop.dependsOn)) {
      // Simple array — all must be non-empty (AND logic)
      missingFields = prop.dependsOn.filter(f => !isNonEmptyValue(resolve(f)))
    } else {
      // Object format { all?, any? }
      const { all = [], any = [] } = prop.dependsOn as { all?: string[]; any?: string[] }
      const missingAll = all.filter(f => !isNonEmptyValue(resolve(f)))
      const anyMet = any.length === 0 || any.some(f => isNonEmptyValue(resolve(f)))
      missingFields = [...missingAll, ...(anyMet ? [] : any)]
    }

    if (missingFields.length === 0) return { disabled: false, tooltip: null }

    const tooltip =
      missingFields.length === 1
        ? `Fill "${missingFields[0]}" first`
        : `Fill these fields first: ${missingFields.join(', ')}`

    return { disabled: true, tooltip }
  }, [prop.dependsOn, properties, canonicalIndex, canonicalModes])
}
