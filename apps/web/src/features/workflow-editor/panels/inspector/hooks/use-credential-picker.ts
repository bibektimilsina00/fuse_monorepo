import { useState, useMemo } from 'react'
import { useCredentials } from '@/hooks/credentials/queries'

export function useCredentialPicker(value: string, credentialType?: string) {
  const { data: credentials, isLoading } = useCredentials()
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredCredentials = useMemo(() => {
    return credentials?.filter(c => 
      !credentialType || c.type === credentialType
    ) || []
  }, [credentials, credentialType])

  const selectedCredential = useMemo(() => {
    return credentials?.find(c => c.id === value)
  }, [credentials, value])

  const toggleOpen = () => setIsOpen(!isOpen)
  const openModal = () => {
    setIsModalOpen(true)
    setIsOpen(false)
  }
  const closeModal = () => setIsModalOpen(false)

  return {
    filteredCredentials,
    selectedCredential,
    isLoading,
    isOpen,
    setIsOpen,
    toggleOpen,
    isModalOpen,
    openModal,
    closeModal
  }
}
