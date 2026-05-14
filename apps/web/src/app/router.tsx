import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import Editor from '../features/workflow-editor/Editor'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { SettingsLayout } from '../features/settings/layouts/SettingsLayout'
import { GeneralSettings } from '../features/settings/pages/GeneralSettings'
import { IntegrationsSettings } from '../features/settings/pages/IntegrationsSettings'
import { SecretsSettings } from '../features/settings/pages/SecretsSettings'
import { CustomToolsSettings, SkillsSettings, MCPToolsSettings } from '../features/settings/pages/ToolSettings'
import { FuseKeysSettings } from '../features/settings/pages/FuseKeysSettings'
import { MCPServersSettings } from '../features/settings/pages/MCPServersSettings'
import { RecentlyDeletedSettings } from '../features/settings/pages/RecentlyDeletedSettings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'workflows',
        element: <div className="text-zinc-500">Workflow list coming soon...</div>,
      },
      {
        path: 'executions',
        element: <div className="text-zinc-500">Execution history coming soon...</div>,
      },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="general" replace />,
          },
          {
            path: 'general',
            element: <GeneralSettings />,
          },
          {
            path: 'integrations',
            element: <IntegrationsSettings />,
          },
          {
            path: 'secrets',
            element: <SecretsSettings />,
          },
          {
            path: 'custom-tools',
            element: <CustomToolsSettings />,
          },
          {
            path: 'skills',
            element: <SkillsSettings />,
          },
          {
            path: 'mcp-tools',
            element: <MCPToolsSettings />,
          },
          {
            path: 'keys',
            element: <FuseKeysSettings />,
          },
          {
            path: 'mcp-servers',
            element: <MCPServersSettings />,
          },
          {
            path: 'deleted',
            element: <RecentlyDeletedSettings />,
          },
          {
            path: '*',
            element: <div className="flex items-center justify-center h-full text-[var(--text-muted)]">Coming soon...</div>,
          },
        ],
      },
    ],
  },
  {
    path: '/workflows/:id',
    element: (
      <div className="h-screen w-screen overflow-hidden">
        <Editor />
      </div>
    ),
  },
])
