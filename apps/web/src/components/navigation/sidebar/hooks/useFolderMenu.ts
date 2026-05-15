import { useMemo } from 'react'
import { Edit2, Trash2, CirclePlus, FolderPlus, Lock, Copy, Download } from 'lucide-react'
import { useDeleteFolder, useFolders, useUpdateFolder } from '@/features/dashboard/hooks/use-folders'
import { useWorkflows } from '@/features/dashboard/hooks/use-workflows'
import { logger } from '@/lib/logger'

interface UseFolderMenuProps {
  folderId: string
}

/**
 * Hook to manage folder-specific menu actions.
 */
export function useFolderMenu({ folderId }: UseFolderMenuProps) {
  const { data: workflows = [] } = useWorkflows()
  const { data: folders = [] } = useFolders()
  const { mutate: deleteFolder } = useDeleteFolder()
  const { mutate: updateFolder } = useUpdateFolder()

  const canDelete = useMemo(() => {
    // 1. Identify all folder IDs that will be deleted (this folder + children)
    const getFolderAndChildren = (id: string): string[] => {
      const children = folders.filter(f => f.parent_id === id)
      return [id, ...children.flatMap(c => getFolderAndChildren(c.id))]
    }
    const targetFolderIds = getFolderAndChildren(folderId)

    // 2. Count workflows that WON'T be deleted
    const remainingWorkflows = workflows.filter(w => !w.folder_id || !targetFolderIds.includes(w.folder_id))

    // 3. Must have at least one workflow remaining
    return remainingWorkflows.length >= 1
  }, [folderId, workflows, folders])

  const menuItems = useMemo(() => [
    {
      label: 'Rename',
      icon: Edit2,
      onClick: () => {} // Handled inline by the component
    },
    {
      label: 'Create workflow',
      icon: CirclePlus,
      onClick: () => logger.info('Create workflow in folder', { folderId })
    },
    {
      label: 'Create folder',
      icon: FolderPlus,
      onClick: () => logger.info('Create folder in folder', { folderId })
    },
    {
      label: 'Lock',
      icon: Lock,
      onClick: () => logger.info('Lock folder', { folderId })
    },
    {
      label: 'Duplicate',
      icon: Copy,
      onClick: () => logger.info('Duplicate folder', { folderId }),
      disabled: true
    },
    {
      label: 'Export',
      icon: Download,
      onClick: () => logger.info('Export folder', { folderId }),
      disabled: true
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => deleteFolder(folderId),
      variant: 'danger' as const,
      disabled: !canDelete
    },
  ], [folderId, deleteFolder, canDelete])

  return { menuItems }
}
