import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { 
  Home, 
  Search, 
  Table, 
  Files, 
  Database, 
  Calendar, 
  Terminal, 
  Plus, 
  Settings, 
  HelpCircle,
  ChevronDown,
  LayoutGrid
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const MainLayout: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="flex h-screen w-screen bg-[#0D0D0D] text-[#E0E0E0] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-white/5 bg-[#0D0D0D] flex flex-col pt-4 px-3 pb-6">
        {/* Logo & Workspace */}
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#10B981] rounded-sm flex items-center justify-center">
              <div className="w-2.5 h-2.5 border-t border-l border-black" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">sim</span>
          </div>
          <button className="text-zinc-500 hover:text-white transition-colors">
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <button className="flex items-center justify-between w-full p-2 bg-white/5 border border-white/5 rounded-lg mb-6 hover:bg-white/10 transition-all text-sm group">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center font-bold text-[10px] text-white">B</div>
            <span className="font-medium">bibek's Workspace</span>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
        </button>

        {/* Core Navigation */}
        <nav className="space-y-0.5 mb-8">
          <NavItem href="/dashboard" icon={Home} label="Home" active={isActive('/dashboard')} />
          <NavItem href="/search" icon={Search} label="Search" active={isActive('/search')} />
        </nav>

        {/* Workspace Section */}
        <div className="mb-8">
          <h3 className="px-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Workspace</h3>
          <nav className="space-y-0.5">
            <NavItem href="/tables" icon={Table} label="Tables" active={isActive('/tables')} />
            <NavItem href="/files" icon={Files} label="Files" active={isActive('/files')} />
            <NavItem href="/kb" icon={Database} label="Knowledge Base" active={isActive('/kb')} />
            <NavItem href="/scheduled" icon={Calendar} label="Scheduled Tasks" active={isActive('/scheduled')} />
            <NavItem href="/logs" icon={Terminal} label="Logs" active={isActive('/logs')} />
          </nav>
        </div>

        {/* All Tasks Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">All tasks</h3>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-3 h-3 text-zinc-400" /></button>
          </div>
          <nav className="space-y-0.5">
            <div className="flex items-center justify-between p-2 text-sm text-zinc-400 hover:text-white cursor-pointer group">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-600" />
                <span>New task</span>
              </div>
            </div>
          </nav>
        </div>

        {/* Workflows Section */}
        <div className="mb-8 overflow-y-auto custom-scrollbar pr-1">
          <div className="flex items-center justify-between px-2 mb-2 group">
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Workflows</h3>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-3 h-3 text-zinc-400" /></button>
          </div>
          <nav className="space-y-0.5">
             <div className="flex items-center gap-2 p-2 text-sm text-zinc-400 hover:text-white cursor-pointer group">
                <div className="w-2 h-2 rounded-sm bg-blue-600" />
                <span>default-agent</span>
             </div>
          </nav>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-auto pt-4 space-y-0.5">
          <NavItem href="/help" icon={HelpCircle} label="Help" active={isActive('/help')} />
          <NavItem href="/settings" icon={Settings} label="Settings" active={isActive('/settings')} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#090909] overflow-y-auto custom-scrollbar relative">
        <div className="h-full w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const NavItem = ({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) => (
  <Link
    to={href}
    className={cn(
      'flex items-center gap-2.5 p-2 rounded-md transition-all text-[13px] font-medium',
      active 
        ? 'bg-white/10 text-white' 
        : 'text-zinc-400 hover:text-white hover:bg-white/5'
    )}
  >
    <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-zinc-500')} />
    <span>{label}</span>
  </Link>
)
