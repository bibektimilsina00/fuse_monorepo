import { useMemo } from 'react'
import type { NodeDefinition, NodeProperty } from '@fuse/node-definitions'
import {
  buildCanonicalIndex,
  shouldShowProperty,
  isSubBlockVisibleForMode,
  hasStandaloneAdvancedFields,
  hasAdvancedValues,
  type CanonicalIndex,
  type CanonicalModeOverrides,
} from '../visibility'

export interface PropertyGroup {
  group: string | null
  props: NodeProperty[]
}

export interface EditorLayout {
  /** Visible props in the always-shown main area, grouped by section. */
  mainGroups: PropertyGroup[]
  /** Standalone advanced props not part of any canonical pair. */
  advancedProps: NodeProperty[]
  /** Whether the "Show additional fields" expander should appear. */
  hasAdvanced: boolean
  /** Pre-built index for canonical pair lookups. */
  canonicalIndex: CanonicalIndex
}

const EMPTY_INDEX: CanonicalIndex = { groupsById: {}, canonicalIdByPropName: {} }

export function useEditorLayout(
  definition: NodeDefinition | null | undefined,
  properties: Record<string, any>,
  canonicalModes?: CanonicalModeOverrides,
): EditorLayout {
  return useMemo(() => {
    if (!definition) {
      return { mainGroups: [], advancedProps: [], hasAdvanced: false, canonicalIndex: EMPTY_INDEX }
    }

    const canonicalIndex = buildCanonicalIndex(definition.properties)

    // Step 1: condition + visibility filter
    const conditionVisible = definition.properties.filter(
      p => p.visibility !== 'hidden' && shouldShowProperty(p, properties, definition),
    )

    // Step 2: separate main vs standalone-advanced
    //   - canonical pairs: always in main, swap between basic/advanced variant
    //   - standalone advanced (mode='advanced', no canonicalId): go to advanced section
    const mainProps = conditionVisible.filter(p =>
      isSubBlockVisibleForMode(p, false, canonicalIndex, properties, canonicalModes),
    )

    const advancedProps = conditionVisible.filter(
      p => p.mode === 'advanced' && !canonicalIndex.canonicalIdByPropName[p.name],
    )

    // Show "additional fields" expander when standalone advanced fields exist OR
    // any advanced canonical variant already has a value (makes it discoverable)
    const hasAdvanced =
      hasStandaloneAdvancedFields(definition.properties, canonicalIndex) ||
      hasAdvancedValues(definition.properties, properties, canonicalIndex)

    return {
      mainGroups: groupBySection(mainProps),
      advancedProps,
      hasAdvanced,
      canonicalIndex,
    }
  }, [definition, properties, canonicalModes])
}

function groupBySection(props: NodeProperty[]): PropertyGroup[] {
  const groups: PropertyGroup[] = []
  let current: PropertyGroup | null = null

  for (const prop of props) {
    const g = prop.group ?? null
    if (!current || current.group !== g) {
      current = { group: g, props: [] }
      groups.push(current)
    }
    current.props.push(prop)
  }

  return groups
}
