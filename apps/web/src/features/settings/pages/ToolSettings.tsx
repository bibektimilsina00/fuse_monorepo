import React from 'react'
import { ToolsPage } from '@/features/settings/components/ToolsPage'

export const CustomToolsSettings: React.FC = () => (
  <ToolsPage title="Custom Tools" placeholder="Search tools..." emptyText="Click &quot;Add&quot; above to get started" />
)

export const SkillsSettings: React.FC = () => (
  <ToolsPage title="Skills" placeholder="Search skills..." emptyText="Click &quot;Add&quot; above to get started" />
)

export const MCPToolsSettings: React.FC = () => (
  <ToolsPage title="MCP Tools" placeholder="Search MCPs..." emptyText="Click &quot;Add&quot; above to get started" />
)
