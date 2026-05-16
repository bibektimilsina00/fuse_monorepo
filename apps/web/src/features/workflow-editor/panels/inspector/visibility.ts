import type { NodeDefinition, NodeProperty } from '@fuse/node-definitions'

// ─── Canonical types ──────────────────────────────────────────────────────────

export interface CanonicalGroup {
  canonicalId: string
  basicId?: string
  advancedIds: string[]
}

export interface CanonicalIndex {
  groupsById: Record<string, CanonicalGroup>
  /** prop.name → canonicalId */
  canonicalIdByPropName: Record<string, string>
}

/** Per-node persisted record: canonicalId → 'basic' | 'advanced' */
export type CanonicalModeOverrides = Record<string, 'basic' | 'advanced'>

// ─── Index builder ────────────────────────────────────────────────────────────

export function buildCanonicalIndex(props: NodeProperty[]): CanonicalIndex {
  const groupsById: Record<string, CanonicalGroup> = {}
  const canonicalIdByPropName: Record<string, string> = {}

  for (const prop of props) {
    if (!prop.canonicalId) continue
    if (!groupsById[prop.canonicalId]) {
      groupsById[prop.canonicalId] = { canonicalId: prop.canonicalId, advancedIds: [] }
    }
    const group = groupsById[prop.canonicalId]
    if (prop.mode === 'advanced') {
      if (!group.advancedIds.includes(prop.name)) group.advancedIds.push(prop.name)
    } else {
      group.basicId = prop.name
    }
    canonicalIdByPropName[prop.name] = prop.canonicalId
  }

  return { groupsById, canonicalIdByPropName }
}

export function isCanonicalPair(group?: CanonicalGroup): boolean {
  return Boolean(group?.basicId && group?.advancedIds?.length)
}

/** Default all canonical pairs to 'basic' mode. */
export function buildDefaultCanonicalModes(props: NodeProperty[]): CanonicalModeOverrides {
  const index = buildCanonicalIndex(props)
  const modes: CanonicalModeOverrides = {}
  for (const group of Object.values(index.groupsById)) {
    if (isCanonicalPair(group)) modes[group.canonicalId] = 'basic'
  }
  return modes
}

// ─── Value helpers ────────────────────────────────────────────────────────────

export function isNonEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

export function getCanonicalValues(
  group: CanonicalGroup,
  values: Record<string, unknown>,
): { basicValue: unknown; advancedValue: unknown; advancedSourceId?: string } {
  const basicValue = group.basicId ? values[group.basicId] : undefined
  let advancedValue: unknown
  let advancedSourceId: string | undefined

  for (const id of group.advancedIds) {
    const candidate = values[id]
    if (isNonEmptyValue(candidate)) {
      advancedValue = candidate
      advancedSourceId = id
      break
    }
  }

  return { basicValue, advancedValue, advancedSourceId }
}

// ─── Mode resolution ──────────────────────────────────────────────────────────

/**
 * Determine whether a canonical group should display its basic or advanced variant.
 *
 * Priority:
 * 1. Explicit user override (stored in node.data.canonicalModes)
 * 2. Auto-detect: if no basic value but advanced value exists → show advanced
 * 3. Default: basic
 */
export function resolveCanonicalMode(
  group: CanonicalGroup,
  values: Record<string, unknown>,
  overrides?: CanonicalModeOverrides,
): 'basic' | 'advanced' {
  const override = overrides?.[group.canonicalId]
  if (override === 'advanced' && group.advancedIds.length > 0) return 'advanced'
  if (override === 'basic' && group.basicId) return 'basic'

  if (!group.basicId) return 'advanced'

  const { basicValue, advancedValue } = getCanonicalValues(group, values)
  if (!isNonEmptyValue(basicValue) && isNonEmptyValue(advancedValue)) return 'advanced'
  return 'basic'
}

// ─── Visibility ───────────────────────────────────────────────────────────────

/**
 * Whether a prop should appear in the current layout state.
 *
 * Canonical pairs use their own swap logic independent of the global
 * showAdvanced toggle — the toggle only governs standalone advanced fields.
 */
export function isSubBlockVisibleForMode(
  prop: NodeProperty,
  showAdvanced: boolean,
  canonicalIndex: CanonicalIndex,
  values: Record<string, unknown>,
  overrides?: CanonicalModeOverrides,
): boolean {
  const canonicalId = canonicalIndex.canonicalIdByPropName[prop.name]
  const group = canonicalId ? canonicalIndex.groupsById[canonicalId] : undefined

  if (group && isCanonicalPair(group)) {
    const mode = resolveCanonicalMode(group, values, overrides)
    return mode === 'advanced'
      ? group.advancedIds.includes(prop.name)
      : group.basicId === prop.name
  }

  if (prop.mode === 'advanced' && !showAdvanced) return false
  if (prop.mode === 'basic' && showAdvanced) return false
  return true
}

/** True if there are standalone advanced fields not part of any canonical pair. */
export function hasStandaloneAdvancedFields(
  props: NodeProperty[],
  canonicalIndex: CanonicalIndex,
): boolean {
  return props.some(p => p.mode === 'advanced' && !canonicalIndex.canonicalIdByPropName[p.name])
}

/** True if any canonical advanced variant or standalone advanced field has a value. */
export function hasAdvancedValues(
  props: NodeProperty[],
  values: Record<string, unknown>,
  canonicalIndex: CanonicalIndex,
): boolean {
  const checked = new Set<string>()
  for (const prop of props) {
    const canonicalId = canonicalIndex.canonicalIdByPropName[prop.name]
    if (canonicalId) {
      const group = canonicalIndex.groupsById[canonicalId]
      if (group && isCanonicalPair(group) && !checked.has(canonicalId)) {
        checked.add(canonicalId)
        const { advancedValue } = getCanonicalValues(group, values)
        if (isNonEmptyValue(advancedValue)) return true
      }
      continue
    }
    if (prop.mode === 'advanced' && isNonEmptyValue(values[prop.name])) return true
  }
  return false
}

// ─── Dependency resolution ────────────────────────────────────────────────────

/**
 * Resolve a dependency key's effective value, honoring canonical swaps.
 * When a field depends on a canonical pair member, return the active variant's value.
 */
export function resolveDependencyValue(
  depKey: string,
  values: Record<string, unknown>,
  canonicalIndex: CanonicalIndex,
  overrides?: CanonicalModeOverrides,
): unknown {
  const canonicalId =
    canonicalIndex.groupsById[depKey]?.canonicalId ||
    canonicalIndex.canonicalIdByPropName[depKey]

  if (!canonicalId) return values[depKey]

  const group = canonicalIndex.groupsById[canonicalId]
  if (!group) return values[depKey]

  const { basicValue, advancedValue } = getCanonicalValues(group, values)
  const mode = resolveCanonicalMode(group, values, overrides)
  return mode === 'advanced' ? (advancedValue ?? basicValue) : (basicValue ?? advancedValue)
}

// ─── Condition evaluation ─────────────────────────────────────────────────────

type Condition = {
  any?: Condition[]
  all?: Condition[]
  and?: Condition[]
  not?: Condition
  field?: string
  value?: any
}

function checkCondition(
  condition: Condition,
  properties: Record<string, any>,
  definition: NodeDefinition,
): boolean {
  if (!condition) return true

  if (condition.any) {
    return condition.any.some(c => checkCondition(c, properties, definition))
  }

  if (condition.all || condition.and) {
    const conditions = condition.all ?? condition.and ?? []
    return conditions.every(c => checkCondition(c, properties, definition))
  }

  if (condition.not && typeof condition.not === 'object') {
    return !checkCondition(condition.not, properties, definition)
  }

  if (!condition.field) return true

  const { field, value: expectedValue, not } = condition as any
  const propDef = definition.properties.find(p => p.name === field)
  const conditionValue = properties?.[field] ?? propDef?.default

  const matches = Array.isArray(expectedValue)
    ? expectedValue.some(v => String(v).toUpperCase() === String(conditionValue).toUpperCase())
    : String(expectedValue).toUpperCase() === String(conditionValue).toUpperCase()

  return not ? !matches : matches
}

export function shouldShowProperty(
  prop: NodeProperty,
  properties: Record<string, any>,
  definition: NodeDefinition,
): boolean {
  if (!prop.condition) return true
  return checkCondition(prop.condition, properties, definition)
}
