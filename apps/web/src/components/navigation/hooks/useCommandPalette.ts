import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Workflow as WorkflowIcon, Folder as FolderIcon, Plus, Settings } from 'lucide-react'
import { useWorkflows } from '@/features/dashboard/hooks/use-workflows'
import { useFolders } from '@/features/dashboard/hooks/use-folders'
import { useUIStore } from '@/stores/ui-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { CanvasEngine } from '@/features/workflow-editor/utils/canvas-engine'
import { getIcon } from '@/features/workflow-editor/utils/icon-map'

/**
 * Hook to manage Command Palette logic: filtering, selection, and keyboard navigation.
 */
export function useCommandPalette() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isSearchOpen, setSearchOpen } = useUIStore()
  const { data: workflows = [] } = useWorkflows()
  const { data: folders = [] } = useFolders()
  const { addNode, nodeDefinitions } = useWorkflowStore()

  const [searchValue, setSearchValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const isEditor = location.pathname.startsWith('/workflows/') && location.pathname.length > 11

  const filteredResults = useMemo(() => {
    const query = searchValue.toLowerCase().trim()

    if (isEditor) {
      const items: any[] = []

      nodeDefinitions.forEach(node => {
        if (!query || node.name.toLowerCase().includes(query) || node.type.toLowerCase().includes(query)) {
          items.push({
            id: node.type,
            label: node.name,
            icon: getIcon(node.icon),
            bgColor: node.color,
            onClick: () => {
              // Add node to center or default position
              const newNode = CanvasEngine.createNode(node.type, { x: 400, y: 300 }, node)
              addNode(newNode)
            }
          })
        }
      })

      return items.length > 0 ? [{ title: 'Nodes', items }] : []
    }

    return [
      {
        title: 'Actions',
        items: [
          { id: 'create-workflow', label: 'Create New Workflow', icon: Plus, onClick: () => console.log('Create workflow') },
          { id: 'settings', label: 'Settings', icon: Settings, onClick: () => navigate('/settings') },
        ].filter(item => !query || item.label.toLowerCase().includes(query))
      },
      {
        title: 'Workflows',
        items: workflows
          .filter(w => !query || w.name.toLowerCase().includes(query))
          .map(w => ({
            id: w.id,
            label: w.name,
            icon: WorkflowIcon,
            onClick: () => navigate(`/workflows/${w.id}`)
          }))
      },
      {
        title: 'Folders',
        items: folders
          .filter(f => !query || f.name.toLowerCase().includes(query))
          .map(f => ({
            id: f.id,
            label: f.name,
            icon: FolderIcon,
            onClick: () => navigate(`/folders/${f.id}`)
          }))
      }
    ].filter(group => group.items.length > 0)
  }, [searchValue, workflows, folders, navigate, isEditor, addNode])

  const flatItems = useMemo(() => filteredResults.flatMap(g => g.items), [filteredResults])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].onClick()
        setSearchOpen(false)
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }, [flatItems, selectedIndex, setSearchOpen])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchValue])

  return {
    isSearchOpen,
    setSearchOpen,
    searchValue,
    setSearchValue,
    selectedIndex,
    filteredResults,
    handleKeyDown,
    flatItems
  }
}
