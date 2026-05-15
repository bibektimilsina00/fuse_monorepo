import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Workflow as WorkflowIcon, Folder as FolderIcon, Plus, Settings } from 'lucide-react'
import { useWorkflows } from '@/features/dashboard/hooks/use-workflows'
import { useFolders } from '@/features/dashboard/hooks/use-folders'
import { useUIStore } from '@/stores/ui-store'

/**
 * Hook to manage Command Palette logic: filtering, selection, and keyboard navigation.
 */
export function useCommandPalette() {
  const navigate = useNavigate()
  const { isSearchOpen, setSearchOpen } = useUIStore()
  const { data: workflows = [] } = useWorkflows()
  const { data: folders = [] } = useFolders()
  
  const [searchValue, setSearchValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredResults = useMemo(() => {
    const query = searchValue.toLowerCase().trim()
    
    const results = [
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
            color: 'text-blue-400',
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
            color: 'text-amber-400',
            onClick: () => navigate(`/folders/${f.id}`)
          }))
      }
    ].filter(group => group.items.length > 0)

    return results
  }, [searchValue, workflows, folders, navigate])

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
    setSelectedIndex(0)
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
