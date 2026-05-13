import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkflows } from '../hooks/use-workflows'
import { 
  Plus, 
  Paperclip, 
  ArrowUp, 
  Layout, 
  Terminal, 
  Database,
  Loader2,
  AlertCircle
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: workflows, isLoading, error } = useWorkflows()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-10 h-10 text-zinc-700 animate-spin" />
        <p className="text-zinc-500 font-medium tracking-tight">Initializing Sim...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-8">
        <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-2xl max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">Connection Lost</h3>
          <p className="text-zinc-500 text-sm mb-6">We couldn't connect to the Fuse engine. Please ensure your backend is running.</p>
          <button onClick={() => window.location.reload()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg transition-all font-medium">
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto pt-32 px-8 pb-20">
      {/* Hero Greeting */}
      <div className="text-center mb-12">
        <h1 className="text-[44px] font-medium tracking-tight text-white mb-8">
          What should we get done, bibek?
        </h1>

        {/* Command Bar */}
        <div className="relative max-w-2xl mx-auto group">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 pl-12 flex items-center transition-all focus-within:border-white/10 focus-within:bg-[#222222] shadow-2xl">
            <input 
              type="text" 
              placeholder="Ask Sim to do anything..." 
              className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600 text-[15px]"
            />
            <div className="absolute left-4 flex items-center gap-2">
               <button className="text-zinc-600 hover:text-zinc-300 transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3">
               <button className="text-zinc-600 hover:text-zinc-300 transition-colors"><Paperclip className="w-4 h-4" /></button>
               <button className="bg-[#333333] p-1.5 rounded-lg text-zinc-500 group-focus-within:bg-blue-600 group-focus-within:text-white transition-all">
                 <ArrowUp className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows?.map((workflow, idx) => (
          <div 
            key={workflow.id} 
            className="group cursor-pointer"
            onClick={() => navigate(`/workflows/${workflow.id}`)}
          >
            {/* Visual Preview Window */}
            <div className="aspect-[16/10] bg-[#141414] border border-white/5 rounded-t-xl overflow-hidden relative group-hover:border-white/10 transition-all duration-300">
               {/* Mock Visual representation based on type or generic pattern */}
               <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                  {idx % 3 === 0 ? (
                    <div className="p-4 space-y-2">
                       <div className="h-4 w-3/4 bg-white/5 rounded" />
                       <div className="h-4 w-1/2 bg-white/5 rounded" />
                       <div className="h-20 w-full border border-white/5 rounded-md mt-4 flex items-center justify-center text-[10px] text-zinc-700 uppercase tracking-tighter">Table View Preview</div>
                    </div>
                  ) : idx % 3 === 1 ? (
                    <div className="flex items-center justify-center h-full">
                       <div className="w-24 h-16 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center">
                          <Terminal className="w-6 h-6 text-zinc-800" />
                       </div>
                    </div>
                  ) : (
                    <div className="p-6">
                       <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center">
                          <Database className="w-5 h-5 text-zinc-800" />
                       </div>
                    </div>
                  )}
               </div>
               
               {/* Gradient Overlay */}
               <div className="absolute inset-0 bg-gradient-to-t from-[#090909] to-transparent opacity-60" />
            </div>

            {/* Card Footer */}
            <div className="bg-[#1A1A1A] border-x border-b border-white/5 p-4 rounded-b-xl flex items-center gap-3 group-hover:bg-[#222222] transition-all">
               <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
                  {idx % 3 === 0 ? <Table className="w-3.5 h-3.5 text-zinc-500" /> : <Layout className="w-3.5 h-3.5 text-zinc-500" />}
               </div>
               <span className="text-[14px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
                  {workflow.name}
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const Table = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
)
