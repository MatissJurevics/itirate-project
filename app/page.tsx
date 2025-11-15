"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Loader2, PaperclipIcon, SendIcon, X, FileText } from 'lucide-react'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  type PromptInputMessage
} from "@/components/ai-elements/prompt-input"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleSubmit = async (message: PromptInputMessage) => {
    setIsLoading(true)

    let csvUrl = ''

    // Upload file if one is selected
    if (selectedFile) {
      setIsUploading(true)
      try {
        console.log('Starting file upload...', selectedFile.name, selectedFile.type, selectedFile.size)

        // Generate a unique file name
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        console.log('Uploading to:', filePath)

        // Upload file to Supabase storage
        const { data, error } = await supabase.storage
          .from('csv-files')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('Upload error:', error)
          toast.error(`Failed to upload file: ${error.message}`)
          setIsLoading(false)
          setIsUploading(false)
          return
        }

        console.log('Upload successful:', data)

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('csv-files')
          .getPublicUrl(data.path)

        csvUrl = publicUrl
        console.log('Public URL:', publicUrl)
        toast.success(`File uploaded successfully! ${selectedFile.name}`)

      } catch (error) {
        console.error('Upload error (catch):', error)
        toast.error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    // Extract the prompt text from the message
    const promptText = message.text || ''

    // Store data in sessionStorage for the dashboard
    sessionStorage.setItem('dashboardData', JSON.stringify({
      prompt: promptText,
      csvUrl: csvUrl,
      timestamp: Date.now()
    }))

    // Show loading screen for 5 seconds, then navigate to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 5000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate that it's a CSV file
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file")
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setSelectedFile(file)
    toast.success(`${file.name} ready to upload`)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-background">
      {/* Dot Matrix Background */}
      <div className="absolute h-full w-full bg-[radial-gradient(rgb(223_214_201)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      {/* Cursor Reactive Overlay */}
      <div
        className="absolute h-full w-full bg-[radial-gradient(rgb(202_232_203)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none transition-opacity duration-150"
        style={{
          maskImage: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`
        }}
      ></div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Centered Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Generating your dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Welcome Text */}
            <div className="text-center space-y-3 animate-fade-in">
              <h1 className="text-5xl font-bold text-foreground">Welcome to Procure</h1>
              <h3 className="text-xl text-center text-muted-foreground">
                Generate dynamic dashboards based on your procurement data.
              </h3>
            </div>

            {/* Input Area */}
            <div className="space-y-2">
              {selectedFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg border border-border">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm text-foreground flex-1">{selectedFile.name}</span>
                  <button
                    onClick={handleRemoveFile}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputBody>
                  <PromptInputTextarea
                    placeholder="What type of dashboard would you like?"
                    className="min-h-[24px] max-h-[200px] text-foreground placeholder:text-muted-foreground"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <PromptInputButton
                      onClick={() => fileInputRef.current?.click()}
                      className="text-muted-foreground hover:text-foreground bg-transparent"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <PaperclipIcon className="size-5" />
                      )}
                    </PromptInputButton>
                  </PromptInputTools>
                  <PromptInputSubmit className="bg-gradient-primary hover:brightness-90 rounded-xl">
                    <SendIcon className="size-4" />
                  </PromptInputSubmit>
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
