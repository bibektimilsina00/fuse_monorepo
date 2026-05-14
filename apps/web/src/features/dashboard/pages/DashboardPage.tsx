import React from 'react'
import { Table, Clock, Search } from 'lucide-react'
import { TemplateCard } from '@/features/dashboard/components/template-card'
import { ChatInput } from '@/features/dashboard/components/chat-input'

export const DashboardPage: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)] custom-scrollbar">
      <div className="flex min-h-full flex-col items-center px-6">
        
        {/* Chat Section */}
        <div className="flex flex-1 flex-col items-center justify-center w-full pb-[2vh]">
          {/* Greeting */}
          <h1 className="mb-6 max-w-[42rem] text-balance font-[430] font-season text-[32px] text-[var(--text-primary)] tracking-[-0.02em]">
            What should we get done, bibek?
          </h1>

          {/* Chat Input */}
          <ChatInput placeholder="Ask Fuse to track GitHub commits..." />
        </div>

        {/* Templates Grid */}
        <div className="w-full max-w-[68rem] pb-24 -mt-[30vh]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TemplateCard title="Self-populating CRM" icon={Table} />
            <TemplateCard title="Meeting prep agent" icon={Clock} />
            <TemplateCard title="Resolve todo list" icon={Search} />
          </div>
        </div>
      </div>
    </div>
  )
}
