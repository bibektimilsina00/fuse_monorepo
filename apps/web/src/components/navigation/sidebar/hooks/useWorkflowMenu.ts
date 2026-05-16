import { useMemo } from 'react'
import { Edit2, Copy, Trash2, ExternalLink, Palette, Lock, Download } from 'lucide-react'
import { useDeleteWorkflow, useWorkflows, useUpdateWorkflow } from '@/features/dashboard/hooks/use-workflows'
import { logger } from '@/lib/logger'

interface UseWorkflowMenuProps {
  workflowId: string
}

/**
 * Hook to manage workflow-specific menu actions.
 */
export function useWorkflowMenu({ workflowId }: UseWorkflowMenuProps) {
  const { data: workflows = [] } = useWorkflows()
  const { mutate: deleteWorkflow } = useDeleteWorkflow()
  const { mutate: updateWorkflow } = useUpdateWorkflow()

  const currentWorkflow = workflows.find(w => w.id === workflowId)
  const canDelete = workflows.length > 1

  const menuItems = useMemo(() => [
    { 
      label: 'Open in new tab', 
      icon: ExternalLink, 
      onClick: () => window.open(`/workflows/${workflowId}`, '_blank') 
    },
    { 
      label: 'Rename', 
      icon: Edit2, 
      onClick: () => {} // Handled inline by the component
    },
    { 
      label: 'Change color', 
      icon: Palette, 
      hasSubmenu: true,
      onClick: () => {} 
    },
    { 
      label: 'Lock', 
      icon: Lock, 
      onClick: () => logger.info('Lock workflow', { workflowId }) 
    },
    { 
      label: 'Duplicate', 
      icon: Copy, 
      onClick: () => logger.info('Duplicate workflow', { workflowId }) 
    },
    { 
      label: 'Export', 
      icon: Download, 
      onClick: () => logger.info('Export workflow', { workflowId }) 
    },
    { 
      label: 'Delete', 
      icon: Trash2, 
      onClick: () => deleteWorkflow(workflowId), 
      variant: 'danger' as const,
      disabled: !canDelete
    },
  ], [workflowId, deleteWorkflow, canDelete])

  return { menuItems, currentWorkflow, updateWorkflow }
}
