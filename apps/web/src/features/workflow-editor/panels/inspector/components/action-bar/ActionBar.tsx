import React from 'react'
import { MessageCircle, Send, Play, Square } from 'lucide-react'
import { Button, IconButton, Spinner } from '@/components/ui'
import { useExecution } from '@/features/workflow-editor/hooks/use-execution'
import { WorkflowOptionsMenu } from '../node-header/WorkflowOptionsMenu'

export const ActionBar: React.FC = () => {
  const { run, cancel, isRunning, isCancelling } = useExecution()

  return (
    <div className="flex items-center justify-between p-3 gap-2">
      <div className="flex items-center gap-1.5">
        <WorkflowOptionsMenu />
        <IconButton icon={<MessageCircle />} tooltip="View chat" size="sm" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="md" leftIcon={<Send className="text-[var(--brand-accent)]" />}>
          Deploy
        </Button>
        {isRunning ? (
          <Button
            variant="danger"
            size="md"
            onClick={() => !isCancelling && cancel()}
            disabled={isCancelling}
            leftIcon={isCancelling ? <Spinner size="xs" color="white" /> : <Square className="fill-current" size={12} />}
          >
            {isCancelling ? 'Cancelling' : 'Stop'}
          </Button>
        ) : (
          <Button
            variant="accent"
            size="md"
            onClick={run}
            leftIcon={<Play className="fill-current" />}
          >
            Run
          </Button>
        )}
      </div>
    </div>
  )
}
