import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, GitGraph, History, Settings, LogOut, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workflows', href: '/workflows', icon: GitGraph },
  { name: 'Executions', href: '/executions', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export const MainLayout: React.FC = () => {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0A0A0A] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">F</div>
            <span className="font-bold text-xl tracking-tight">Fuse</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group',
                  isActive
                    ? 'bg-blue-600/10 text-blue-500'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive ? 'text-blue-500' : 'text-zinc-500 group-hover:text-zinc-300')} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          <button className="flex items-center gap-3 px-3 py-2 w-full text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-all">
            <LogOut className="w-5 h-5 text-zinc-500" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0A0A0A]/50 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="font-semibold text-zinc-200">
            {navigation.find(n => location.pathname.startsWith(n.href))?.name || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-4">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
