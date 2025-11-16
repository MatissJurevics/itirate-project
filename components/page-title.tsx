'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X } from 'lucide-react'

interface PageTitleProps {
  children: string
  onEdit?: (newTitle: string) => void | Promise<void>
  editable?: boolean
}

export function PageTitle({ children, onEdit, editable = false }: PageTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(children)
  const [isSaving, setIsSaving] = useState(false)

  const formattedTitle = children.replace(/\w\S*/g, (txt: string) =>
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  )

  const handleSave = async () => {
    if (editValue.trim() && editValue !== children && onEdit) {
      setIsSaving(true)
      try {
        await onEdit(editValue.trim())
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to save title:', error)
      } finally {
        setIsSaving(false)
      }
    } else {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(children)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="px-4 pt-6 pb-2">
      <div className="flex items-center gap-2 group h-15">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-5xl font-fancy bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 flex-1 leading-none"
              autoFocus
              disabled={isSaving}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              disabled={isSaving || !editValue.trim()}
              className="shrink-0"
            >
              <Check className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-fancy leading-none">
              {formattedTitle}
            </h1>
            {editable && onEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
      <div className="h-px bg-border mt-2 mb-4" />
    </div>
  )
}
