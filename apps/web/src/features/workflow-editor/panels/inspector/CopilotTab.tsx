import React from 'react'
import { Plus, Paperclip, ArrowUp } from 'lucide-react'

export const CopilotTab = React.memo(() => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4" />
      <div className="p-4 pt-0">
        <div className="rounded-2xl bg-surface-1 border border-border p-3 flex flex-col gap-2 group focus-within:border-border-strong transition-all">
          <textarea 
            rows={1}
            placeholder="Ask or describe what you want to build..."
            className="w-full bg-transparent border-none text-[14px] text-white placeholder-[#666] resize-none focus:outline-none py-1"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-md hover:bg-surface-active text-text-muted hover:text-white transition-all">
                <Plus className="size-4" />
              </button>
              <button className="p-1.5 rounded-md hover:bg-surface-active text-text-muted hover:text-white transition-all">
                <Paperclip className="size-4" />
              </button>
            </div>
            <button className="flex items-center justify-center size-8 rounded-full bg-surface-5 hover:bg-surface-6 text-text-muted hover:text-white transition-all">
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
