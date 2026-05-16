import React from 'react'
import { Outlet } from 'react-router-dom'

export const SettingsLayout: React.FC = () => {
  return (
    <div className="flex h-full w-full bg-bg overflow-hidden">
      {/* 
          The Sidebar is now managed by the MainLayout (via route-based detection).
          This layout purely handles the main content scrolling area for settings.
      */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <Outlet />
      </main>
    </div>
  )
}
