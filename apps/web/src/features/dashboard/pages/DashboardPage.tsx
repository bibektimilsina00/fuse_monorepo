import React, { useState, useMemo } from 'react'
import { Table, Clock, Search, Workflow as WorkflowIcon } from 'lucide-react'
import { TemplateCard } from '@/features/dashboard/components/template-card'
import { ChatInput } from '@/features/dashboard/components/chat-input'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkflows } from '@/features/dashboard/hooks/use-workflows'
import { Link } from 'react-router-dom'

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore()
  const { data: workflows = [], isLoading } = useWorkflows()
  const [searchQuery, setSearchQuery] = useState('')
  
  const firstName = user?.full_name?.split(' ')[0]

  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return workflows
    const query = searchQuery.toLowerCase()
    return workflows.filter(w => 
      w.name.toLowerCase().includes(query) || 
      w.description?.toLowerCase().includes(query)
    )
  }, [workflows, searchQuery])

  // Mock templates for now, but filterable
  const staticTemplates = [
    { title: "Self-populating CRM", icon: Table },
    { title: "Meeting prep agent", icon: Clock },
    { title: "Resolve todo list", icon: Search },
  ]

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return staticTemplates
    const query = searchQuery.toLowerCase()
    return staticTemplates.filter(t => t.title.toLowerCase().includes(query))
  }, [searchQuery])

  const isEmpty = filteredWorkflows.length === 0 && filteredTemplates.length === 0

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)] custom-scrollbar">
      <div className="flex min-h-full flex-col items-center px-6">
        
        {/* Chat Section */}
        <div className="flex flex-1 flex-col items-center justify-center w-full pb-[2vh]">
          {/* Greeting */}
          <h1 className="mb-6 max-w-[42rem] text-balance font-[430] font-season text-[32px] text-[var(--text-primary)] tracking-[-0.02em]">
            What should we get done, {firstName || 'there'}?
          </h1>

          {/* Chat Input / Search */}
          <ChatInput 
            placeholder="Search workflows or ask Fuse..." 
            onChange={(val) => setSearchQuery(val)}
          />
        </div>

        {/* Content Grid */}
        <div className="w-full max-w-[68rem] pb-24 -mt-[30vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--text-primary)]" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-[var(--surface-4)] p-4">
                <Search className="size-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)]">No results found</h3>
              <p className="text-[var(--text-muted)]">Try adjusting your search for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Workflows */}
              {filteredWorkflows.map((workflow) => (
                <Link key={workflow.id} to={`/workflow/${workflow.id}`} className="block transition-transform hover:scale-[1.01] active:scale-[0.99]">
                  <TemplateCard 
                    title={workflow.name} 
                    icon={WorkflowIcon} 
                    description={workflow.description || 'No description'}
                  />
                </Link>
              ))}

              {/* Templates */}
              {filteredTemplates.map((template, i) => (
                <TemplateCard key={i} title={template.title} icon={template.icon} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
