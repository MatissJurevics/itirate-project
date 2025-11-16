"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  onFileUpload?: (fileUrl: string, fileName: string) => void
}

export default function ChatInput({ onSendMessage, disabled, onFileUpload }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message)
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate that it's a CSV file
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file")
      return
    }

    setIsUploading(true)

    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from('csv-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        toast.error("Failed to upload file: " + error.message)
        return
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('csv-files')
        .getPublicUrl(data.path)

      toast.success("File uploaded successfully!")
      onFileUpload?.(publicUrl, file.name)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error("Failed to upload file")
    } finally {
      setIsUploading(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileUpload}
        disabled={disabled || isUploading}
      />
      <div className="flex items-center gap-2 border border-gray-300 bg-white p-3 transition-all duration-300 focus-within:border-gray-900">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="shrink-0 size-9 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What type of dashboard would you like?"
          disabled={disabled}
          rows={1}
          className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent px-0 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 leading-tight shadow-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className={cn(
            "shrink-0 bg-gradient-primary transition-all duration-300 hover:brightness-90",
            message.trim() && !disabled ? "scale-100 opacity-100" : "scale-90 opacity-50"
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
