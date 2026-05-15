import React, { useState, useMemo } from 'react'
import { Table, Clock, Search, Workflow as WorkflowIcon, Bot, FileText, Zap } from 'lucide-react'
import { TemplateCard } from '@/features/dashboard/components/template-card'
import { ChatInput } from '@/features/dashboard/components/chat-input'
import { useAuthStore } from '@/stores/auth-store'

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  
  const firstName = user?.full_name?.split(' ')[0]

  // Mock templates for now, but filterable
  const staticTemplates = [
    { title: "Self-populating CRM", icon: Table },
    { title: "Meeting prep agent", icon: Clock },
    { title: "Resolve todo list", icon: Search },
    { title: "Customer Support Bot", icon: Bot },
    { title: "Invoice Generator", icon: FileText },
    { title: "Automated Lead Scoring", icon: Zap },
  ]

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return staticTemplates
    const query = searchQuery.toLowerCase()
    return staticTemplates.filter(t => t.title.toLowerCase().includes(query))
  }, [searchQuery])

  const isEmpty = filteredTemplates.length === 0

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)] custom-scrollbar">
      <div className="flex flex-col items-center px-6">
        
        {/* Chat Section */}
        <div className="flex flex-col items-center w-full pt-[35vh] pb-[10vh]">
          {/* Greeting */}
          <h1 className="mb-6 max-w-[42rem] text-balance font-[430] font-season text-[32px] text-[var(--text-primary)] tracking-[-0.02em]">
            What should we get done, {firstName || 'there'}?
          </h1>

          {/* Chat Input / Search */}
          <ChatInput 
            placeholder="Search templates or ask Fuse..." 
            onChange={(val) => setSearchQuery(val)}
          />
        </div>

        {/* Content Grid */}
        <div className="w-full max-w-[68rem] pb-24">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-[var(--surface-4)] p-4">
                <Search className="size-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)]">No results found</h3>
              <p className="text-[var(--text-muted)]">Try adjusting your search for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
