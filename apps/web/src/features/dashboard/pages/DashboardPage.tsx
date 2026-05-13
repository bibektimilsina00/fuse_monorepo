import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkflows } from '../hooks/use-workflows'
import { Play, FileEdit, Trash2, Loader2, AlertCircle } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: workflows, isLoading, error } = useWorkflows()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-zinc-500 animate-pulse">Loading your workflows...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl flex items-center gap-4 text-red-500">
        <AlertCircle className="w-6 h-6" />
        <div>
          <h3 className="font-semibold">Failed to load workflows</h3>
          <p className="text-sm opacity-80">Please check your backend connection and try again.</p>
        </div>
      </div>
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
        <h3 className="text-xl font-medium text-zinc-300 mb-2">No workflows found</h3>
        <p className="text-zinc-500 mb-6">Start by creating your first automation.</p>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all">
          Create New Workflow
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <div 
            key={workflow.id} 
            className="group relative bg-[#0A0A0A] border border-white/5 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 cursor-pointer shadow-2xl"
            onClick={() => navigate(`/workflows/${workflow.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                <FileEdit className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors">
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <button className="p-2 hover:bg-red-500/10 rounded-md text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors mb-1 truncate">
              {workflow.name}
            </h3>
            <p className="text-sm text-zinc-500 line-clamp-2 min-h-[40px]">
              {workflow.description || 'No description provided.'}
            </p>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                {new Date(workflow.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-zinc-400 font-medium capitalize">{workflow.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
