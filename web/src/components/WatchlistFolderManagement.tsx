'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Folder, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { useSignalStore, WatchlistFolder } from '@/store/signalStore'

interface WatchlistFolderManagementProps {
  isOpen: boolean
  onClose: () => void
}

export default function WatchlistFolderManagement({ isOpen, onClose }: WatchlistFolderManagementProps) {
  const { watchlistFolders, createFolder, updateFolder, deleteFolder } = useSignalStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<WatchlistFolder | null>(null)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface rounded-xl border border-border p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Manage Folders</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-light rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Create Folder Button */}
          {!showCreateForm && !editingFolder && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full btn btn-secondary flex items-center justify-center gap-2 mb-4"
            >
              <Plus size={18} />
              Create New Folder
            </button>
          )}

          {/* Create Folder Form */}
          {showCreateForm && (
            <FolderForm
              onSubmit={async (name, color) => {
                await createFolder(name, color)
                setShowCreateForm(false)
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {/* Edit Folder Form */}
          {editingFolder && (
            <FolderForm
              folder={editingFolder}
              onSubmit={async (name, color) => {
                await updateFolder(editingFolder.id, name, color)
                setEditingFolder(null)
              }}
              onCancel={() => setEditingFolder(null)}
            />
          )}

          {/* Folders List */}
          {!showCreateForm && !editingFolder && (
            <div className="space-y-3">
              {watchlistFolders.length === 0 ? (
                <div className="text-center py-12">
                  <Folder size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No folders yet. Create one to get started.</p>
                </div>
              ) : (
                watchlistFolders.map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    onEdit={() => setEditingFolder(folder)}
                    onDelete={() => deleteFolder(folder.id)}
                  />
                ))
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface FolderItemProps {
  folder: WatchlistFolder
  onEdit: () => void
  onDelete: () => void
}

function FolderItem({ folder, onEdit, onDelete }: FolderItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div className="bg-surface-light rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: folder.color ? `${folder.color}20` : '#3B82F620',
            }}
          >
            <Folder
              size={20}
              style={{ color: folder.color || '#3B82F6' }}
            />
          </div>
          <div>
            <h3 className="font-semibold">{folder.name}</h3>
            <p className="text-sm text-gray-400">
              {folder.itemCount || 0} signal{folder.itemCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-surface rounded-lg transition-colors text-blue-500"
          >
            <Pencil size={16} />
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 hover:bg-surface rounded-lg transition-colors text-bearish"
            >
              <Trash2 size={16} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  onDelete()
                  setShowDeleteConfirm(false)
                }}
                className="px-3 py-1 bg-bearish text-white rounded text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-surface-light rounded text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface FolderFormProps {
  folder?: WatchlistFolder
  onSubmit: (name: string, color?: string) => void
  onCancel: () => void
}

function FolderForm({ folder, onSubmit, onCancel }: FolderFormProps) {
  const [name, setName] = useState(folder?.name || '')
  const [selectedColor, setSelectedColor] = useState(folder?.color || '#3B82F6')

  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim(), selectedColor)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-light rounded-lg border border-border p-4 mb-4">
      <h3 className="font-semibold mb-4">{folder ? 'Edit Folder' : 'Create Folder'}</h3>

      <div className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Folder Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter folder name"
            className="w-full bg-surface border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className="w-10 h-10 rounded-lg transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  opacity: selectedColor === color ? 1 : 0.5,
                  border: selectedColor === color ? '3px solid white' : 'none',
                }}
              >
                {selectedColor === color && <Check size={20} className="text-white mx-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 btn btn-primary disabled:opacity-50"
          >
            {folder ? 'Save Changes' : 'Create Folder'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
