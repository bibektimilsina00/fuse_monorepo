import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { AppOverlays } from './app-layout/app-overlays'
import { AppSidebar } from './app-layout/app-sidebar'
import { AppTopBar } from './app-layout/app-top-bar'
import { useAppLayoutController } from './app-layout/use-app-layout-controller'
import { WorkflowDialogs } from './app-layout/workflow-dialogs'

export function AppLayout() {
  const controller = useAppLayoutController()

  return (
    <div
      className={cn(
        'group/shell relative h-screen grid grid-cols-[244px_1fr] z-10',
        'data-[collapsed=true]:grid-cols-[64px_1fr]',
      )}
      data-collapsed={controller.collapsed}
    >
      <AppSidebar controller={controller} variant="flat" />

      <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--bg)]">
        <AppTopBar controller={controller} />
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6" style={{ height: '100%' }}>
          <Outlet />
        </div>
      </div>

      <AppOverlays controller={controller} />
      <WorkflowDialogs controller={controller} />
    </div>
  )
}
