import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import Editor from '../features/workflow-editor/Editor'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'

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
        element: <div className="text-zinc-500">Settings coming soon...</div>,
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
