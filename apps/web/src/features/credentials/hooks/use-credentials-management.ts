import { useState, useMemo } from 'react'
import { useCredentials, useDeleteCredential } from '@/hooks/credentials/queries'

export function useCredentialsManagement() {
  const { data: credentials = [], isLoading, refetch } = useCredentials()
  const deleteCredential = useDeleteCredential()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCredentials = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return credentials.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      c.type.toLowerCase().includes(query)
    )
  }, [credentials, searchQuery])

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this integration? Nodes using it will fail.')) {
      await deleteCredential.mutateAsync(id)
    }
  }

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return {
    credentials: filteredCredentials,
    isLoading,
    isDeleting: deleteCredential.isPending,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    selectedService,
    setSelectedService,
    openModal,
    closeModal,
    handleDelete,
    refresh: refetch
  }
}
