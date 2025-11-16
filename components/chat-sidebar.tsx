"use client"

import * as React from "react"
import { Send, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  csvId?: string
  initialPrompt?: string
}

export function ChatSidebar({ open, onOpenChange, csvId, initialPrompt }: ChatSidebarProps) {
  const [mounted, setMounted] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [initialPromptSent, setInitialPromptSent] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-send initial prompt when component mounts and csvId is available
  React.useEffect(() => {
    if (mounted && csvId && initialPrompt && !initialPromptSent && open) {
      setInitialPromptSent(true)
      sendMessage(initialPrompt)
    }
  }, [mounted, csvId, initialPrompt, initialPromptSent, open])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Create placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Prepare messages for API (convert to API format)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          csvId: csvId
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullContent += chunk

        // Update the assistant message with streaming content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Update assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    sendMessage(inputValue)
    setInputValue("")
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background border-l transition-all duration-300 ease-in-out overflow-hidden shrink-0",
        open ? "w-[24rem] opacity-100" : "w-0 opacity-0 border-0"
      )}
      style={{
        height: "100%",
      }}
    >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div>
          <h2 className="text-lg font-semibold">Chat Assistant</h2>
          {csvId && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              Dataset: {csvId}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            {csvId ? "Ask questions about your data..." : "No dataset loaded"}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted text-xs font-medium">
                AI
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "group relative max-w-[75%] px-4 py-2.5",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content || (isLoading && message.role === "assistant" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </span>
                    ) : message.content)}
                  </p>
                  <div className="mt-1.5 flex items-center justify-end">
                    <span className="text-xs opacity-60">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {message.timestamp.toLocaleString()}
              </TooltipContent>
            </Tooltip>
            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground text-xs font-medium">
                You
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Separator />
      <div className="px-4 py-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={csvId ? "Ask about your data..." : "Type your message..."}
            className="flex-1"
            disabled={isLoading || !csvId}
          />
          <Button onClick={handleSend} size="icon" disabled={isLoading || !csvId}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
