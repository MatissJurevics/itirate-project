"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("")

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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 rounded-3xl border border-gray-300 bg-white p-3 shadow-medium transition-all duration-300 focus-within:border-gray-900 focus-within:shadow-lg">
        <button
          type="button"
          className="shrink-0 size-9 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors bg-transparent"
        >
          <Paperclip className="h-5 w-5" />
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
            "shrink-0 rounded-xl bg-gradient-primary transition-all duration-300 hover:brightness-90",
            message.trim() && !disabled ? "scale-100 opacity-100" : "scale-90 opacity-50"
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
