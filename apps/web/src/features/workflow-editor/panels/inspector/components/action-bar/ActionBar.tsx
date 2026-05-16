import React from 'react'
import { Ellipsis, MessageCircle, Send, Play } from 'lucide-react'
import { Button, IconButton, Spinner } from '@/components/ui'
import { useExecution } from '@/features/workflow-editor/hooks/use-execution'

export const ActionBar: React.FC = () => {
  const { run, isRunning } = useExecution()

  return (
    <div className="flex items-center justify-between p-3 gap-2">
      <div className="flex items-center gap-1.5">
        <IconButton icon={<Ellipsis />} tooltip="More options" size="sm" />
        <IconButton icon={<MessageCircle />} tooltip="View chat" size="sm" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="md" leftIcon={<Send className="text-[var(--brand-accent)]" />}>
          Deploy
        </Button>
        <Button
          variant="accent"
          size="md"
          onClick={() => !isRunning && run()}
          disabled={isRunning}
          leftIcon={isRunning ? <Spinner size="xs" color="white" /> : <Play className="fill-current" />}
        >
          {isRunning ? 'Running' : 'Run'}
        </Button>
      </div>
    </div>
  )
}
