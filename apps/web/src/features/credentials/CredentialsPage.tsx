import { useState } from 'react'
import { Plus, Trash2, Key, Shield, ExternalLink, Search, RefreshCw } from 'lucide-react'
import { useCredentials, useDeleteCredential } from '@/hooks/credentials/queries'
import AddCredentialModal from './AddCredentialModal'

export default function CredentialsPage() {
  const { data: credentials, isLoading, refetch } = useCredentials()
  const deleteCredential = useDeleteCredential()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCredentials = credentials?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credential? Nodes using it will fail.')) {
      await deleteCredential.mutateAsync(id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credentials</h1>
            <p className="text-slate-500 text-sm mt-1">Securely manage your API keys and OAuth connections.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
            >
              <Plus size={18} />
              Add Credential
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Loading credentials...</p>
          </div>
        ) : filteredCredentials?.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
              <Key size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No credentials found</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
              {searchQuery ? "We couldn't find any credentials matching your search." : "Start by adding an API key or connecting an OAuth service."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center gap-1"
              >
                Create your first one <Plus size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCredentials?.map((cred) => (
              <div
                key={cred.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    {cred.type.includes('oauth') ? <Globe size={24} /> : <Shield size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      {cred.name}
                      {cred.type.includes('oauth') && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">
                          OAuth
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {cred.type.replace(/_/g, ' ').toUpperCase()} · Added {new Date(cred.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(cred.id)}
                    disabled={deleteCredential.isPending}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete credential"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddCredentialModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

function Globe({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
