import React, { useState, useRef } from 'react'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import apiClient from '@/lib/api/client'

interface FileListFieldProps {
  value: string[] // List of asset IDs
  onChange: (value: string[]) => void
}

interface Asset {
  id: string
  name: string
  type: string
  size: number
  url: string
}

export const FileListField: React.FC<FileListFieldProps> = ({ value = [], onChange }) => {
  const [isUploading, setIsUploading] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([]) // Ideally fetch these by IDs
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', files[0])

      const response = await apiClient.post('/assets/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
      })

      if (response.status === 200 || response.status === 201) {
        const newAsset: Asset = response.data
        setAssets([...assets, newAsset])
        onChange([...value, newAsset.id])
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAsset = (id: string) => {
    const newAssets = assets.filter(a => a.id !== id)
    setAssets(newAssets)
    onChange(value.filter(v => v !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {assets.map((asset) => (
          <div 
            key={asset.id}
            className="flex items-center gap-2 bg-[#222] border border-[#333] rounded px-2 py-1.5 group animate-in zoom-in-95 duration-200"
          >
            <File size={14} className="text-blue-400" />
            <span className="text-[12px] text-white truncate max-w-[120px]">{asset.name}</span>
            <button 
              onClick={() => removeAsset(asset.id)}
              className="p-0.5 rounded hover:bg-[#444] text-[#666] hover:text-white transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full h-[36px] flex items-center justify-center gap-2 border-2 border-dashed border-[#333] hover:border-[#444] rounded-md text-[13px] text-[#888] hover:text-white transition-all"
      >
        {isUploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <Upload size={16} />
            <span>Upload Attachment</span>
          </>
        )}
      </button>
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
