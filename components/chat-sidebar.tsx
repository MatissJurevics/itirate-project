"use client"

import * as React from "react"
import { Send, X, Loader2, BarChart3 } from "lucide-react"
import { WidgetContextBadge } from "@/components/widget-context-badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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

interface WidgetContext {
  widgetId: string
  title?: string
  type?: string
  highchartsConfig?: any
  data?: any
  categories?: string[]
}

interface ChatSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  csvId?: string
  initialPrompt?: string
  dashboardId?: string
  onChartGenerated?: () => void
  widgetContexts?: WidgetContext[]
  onRemoveWidgetContext?: (widgetId: string) => void
}

// Helper function to clean up AI message content
function cleanMessageContent(content: string): string {
  // Remove thinking blocks, tool calls, and other artifacts
  return content
    .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove <think> blocks
    .replace(/<chain_of_thought>[\s\S]*?<\/chain_of_thought>/g, '') // Remove chain of thought
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '') // Remove thinking blocks
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '') // Remove tool call blocks
    .replace(/\[Tool call:[\s\S]*?\]/g, '') // Remove tool call references
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim()
}

export function ChatSidebar({ open, onOpenChange, csvId, initialPrompt, dashboardId, onChartGenerated, widgetContexts = [], onRemoveWidgetContext }: ChatSidebarProps) {
  const [mounted, setMounted] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [initialPromptSent, setInitialPromptSent] = React.useState(false)
  const [historyLoaded, setHistoryLoaded] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleRemoveContext = (widgetId: string) => {
    if (onRemoveWidgetContext) {
      onRemoveWidgetContext(widgetId)
    }
  }

  // Persist open state to localStorage
  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem('chatSidebarOpen', JSON.stringify(open))
    }
  }, [open, mounted])

  // Load chat history from database when dashboard opens
  React.useEffect(() => {
    const loadChatHistory = async () => {
      if (!dashboardId || historyLoaded) return

      try {
        const response = await fetch(`/api/chat/history?dashboardId=${dashboardId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.messages && data.messages.length > 0) {
            const loadedMessages: Message[] = data.messages.map((msg: any) => ({
              id: msg.id,
              content: msg.role === "assistant" ? cleanMessageContent(msg.content) : msg.content,
              role: msg.role as "user" | "assistant",
              timestamp: new Date(msg.timestamp)
            }))
            setMessages(loadedMessages)
            setInitialPromptSent(true) // Don't send initial prompt if we have history
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      } finally {
        setHistoryLoaded(true)
      }
    }

    if (mounted && dashboardId) {
      loadChatHistory()
    }
  }, [mounted, dashboardId, historyLoaded])

  // Auto-send initial prompt when component mounts and csvId is available
  React.useEffect(() => {
    if (mounted && csvId && initialPrompt && !initialPromptSent && open && historyLoaded) {
      setInitialPromptSent(true)
      sendMessage(initialPrompt)
    }
  }, [mounted, csvId, initialPrompt, initialPromptSent, open, historyLoaded])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const saveMessageToDb = async (role: string, content: string) => {
    if (!dashboardId) return

    try {
      await fetch('/api/chat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId,
          messageRole: role,
          messageContent: content
        })
      })
    } catch (error) {
      console.error('Failed to save message to database:', error)
    }
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    // Capture current widget contexts before clearing
    const currentContexts = [...widgetContexts]

    // Prepend widget contexts if available
    let enhancedMessage = messageText
    let displayMessage = messageText

    if (currentContexts.length > 0) {
      const contextInfos = currentContexts.map((widget, idx) =>
        `[Widget ${idx + 1}: "${widget.title || 'Untitled'}" (${widget.type || 'chart'})]\n${JSON.stringify({
          type: widget.type,
          title: widget.title,
          highchartsConfig: widget.highchartsConfig,
          data: widget.data,
          categories: widget.categories
        }, null, 2)}`
      ).join('\n\n')
      enhancedMessage = `[Context: Referring to ${currentContexts.length} widget(s)]\n\n${contextInfos}\n\nUser Request: ${messageText}`

      // Add chart names to display message
      const chartNames = currentContexts.map(w => w.title || 'Untitled').join(', ')
      displayMessage = `${messageText}\n\n---\n*Included charts: ${chartNames}*`

      // Clear contexts after capturing them
      if (onRemoveWidgetContext) {
        currentContexts.forEach(widget => onRemoveWidgetContext(widget.widgetId))
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: displayMessage,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Save user message to database (with display message showing included charts)
    saveMessageToDb("user", displayMessage)

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
      // Prepare messages for API (convert to API format) - use enhanced message with context
      const apiMessages = [...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })), {
        role: "user",
        content: enhancedMessage
      }]

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          csvId: csvId,
          dashboardId: dashboardId
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

        // Update the assistant message with cleaned streaming content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: cleanMessageContent(fullContent) }
              : msg
          )
        )
      }

      // Save assistant message to database after streaming completes
      if (fullContent) {
        const cleanedContent = cleanMessageContent(fullContent)
        saveMessageToDb("assistant", cleanedContent)

        // Check if a chart was generated or updated (look for chart/widget-related keywords in response)
        const chartModified =
          (fullContent.includes("chart") || fullContent.includes("widget") || fullContent.includes("Widget")) &&
          (fullContent.includes("generated") || fullContent.includes("created") || fullContent.includes("saved") || fullContent.includes("updated") || fullContent.includes("Updated") || fullContent.includes("deleted") || fullContent.includes("Deleted"))

        if (chartModified && onChartGenerated) {
          // Small delay to ensure database write is complete
          setTimeout(() => {
            onChartGenerated()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      // Update assistant message with error
      const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorMessage }
            : msg
        )
      )
      saveMessageToDb("assistant", errorMessage)
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
        "fixed right-0 top-0 fixed top-0 right-0 bottom-0 flex flex-col bg-background border-l transition-all duration-300 ease-in-out overflow-hidden z-50 h-screen z-50",
        open ? "w-[24rem] opacity-100" : "w-0 opacity-0 border-0"
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 min-w-0">
        <h2 className="text-2xl font-fancy whitespace-nowrap">Procure AI</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      <Separator className="shrink-0" />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "group relative max-w-[75%] min-w-0 px-4 py-2.5 rounded-2xl overflow-hidden",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <div className="text-sm break-words leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                    {message.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ node, inline, className, children, ...props }: any) => {
                            return inline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-muted p-2 rounded text-xs overflow-x-auto" {...props}>
                                {children}
                              </code>
                            )
                          },
                          a: ({ node, children, ...props }: any) => (
                            <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : isLoading && message.role === "assistant" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </span>
                    ) : null}
                  </div>
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground text-xs font-medium rounded-full">
                You
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <Separator className="shrink-0" />
      <div className="px-4 py-3 space-y-2">
        {widgetContexts && widgetContexts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {widgetContexts.map((widget) => (
              <WidgetContextBadge
                key={widget.widgetId}
                widgetTitle={widget.title}
                widgetType={widget.type}
                onClear={() => handleRemoveContext(widget.widgetId)}
              />
            ))}
          </div>
        )}
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
