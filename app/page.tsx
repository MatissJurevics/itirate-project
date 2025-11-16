"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Loader2, PaperclipIcon, SendIcon, X, FileText } from 'lucide-react'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
import { toast } from "sonner"
import Papa from 'papaparse'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0
  })
  const [isMounted, setIsMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMounted(true)
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
    setLoadingStatus('Preparing...')

    const promptText = message.text || ''
    let tableName = ''
    let rowCount = 0

    // Process CSV file if one is selected
    if (selectedFile) {
      try {
        setLoadingStatus('Parsing CSV file...')
        console.log('Parsing CSV file...', selectedFile.name, selectedFile.size)

        // Generate unique table name
        tableName = `csv_${Date.now()}_${Math.random().toString(36).substring(7)}`

        // Parse CSV with streaming for large files
        const parseResult = await new Promise<Papa.ParseResult<Record<string, any>>>((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          })
        })

        if (parseResult.errors.length > 0) {
          console.error('CSV parsing errors:', parseResult.errors)
          toast.error(`CSV parsing error: ${parseResult.errors[0].message}`)
          setIsLoading(false)
          return
        }

        const csvData = parseResult.data
        const csvColumns = parseResult.meta.fields || []
        rowCount = csvData.length

        console.log(`Parsed ${rowCount} rows with columns:`, csvColumns)
        toast.success(`Parsed ${rowCount} rows from ${selectedFile.name}`)

        // Step 1: Create the table with sample data for type inference
        setLoadingStatus('Creating database table...')
        const sampleData = csvData.slice(0, 10) // First 10 rows for type inference

        const createResponse = await fetch('/api/csv-to-table/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName,
            columns: csvColumns,
            sampleData
          })
        })

        const createResult = await createResponse.json()
        if (!createResponse.ok) {
          throw new Error(createResult.error || 'Failed to create table')
        }

        toast.success(`Table "${tableName}" created`)

        // Step 2: Insert data in chunks
        const chunkSize = 1000 // Rows per chunk
        const totalChunks = Math.ceil(csvData.length / chunkSize)

        for (let i = 0; i < csvData.length; i += chunkSize) {
          const chunkIndex = Math.floor(i / chunkSize) + 1
          setLoadingStatus(`Inserting data... (${chunkIndex}/${totalChunks})`)

          const chunk = csvData.slice(i, i + chunkSize)

          const insertResponse = await fetch('/api/csv-to-table/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableName,
              rows: chunk,
              columns: csvColumns
            })
          })

          const insertResult = await insertResponse.json()
          if (!insertResponse.ok) {
            throw new Error(insertResult.error || 'Failed to insert data')
          }

          console.log(`Inserted chunk ${chunkIndex}/${totalChunks}`)
        }

        toast.success(`Inserted ${rowCount} rows into ${tableName}`)

      } catch (error) {
        console.error('CSV processing error:', error)
        toast.error(`Failed to process CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
        setLoadingStatus('')
        return
      }
    }

    setLoadingStatus('Creating dashboard...')

    // Create a dashboard entry in Supabase
    let dashboardId = ''
    try {
      const dashboardResponse = await fetch('/api/dashboard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: promptText || 'New Dashboard',
          csvTableName: tableName,
          fileName: selectedFile?.name || '',
          rowCount: rowCount,
          initialPrompt: promptText
        })
      })

      const dashboardResult = await dashboardResponse.json()
      if (!dashboardResponse.ok) {
        throw new Error(dashboardResult.error || 'Failed to create dashboard')
      }

      dashboardId = dashboardResult.id
      toast.success('Dashboard created')
    } catch (error) {
      console.error('Dashboard creation error:', error)
      toast.error(`Failed to create dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsLoading(false)
      setLoadingStatus('')
      return
    }

    setLoadingStatus('Redirecting to app...')

    // Navigate to app with dashboard ID (all metadata is stored in database)
    router.push(`/app/${dashboardId}`)
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
    <><header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
    </header>
      <div className="relative flex items-center justify-center overflow-hidden bg-background" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Dot Matrix Background */}
        <div className="absolute h-full w-full bg-[radial-gradient(rgb(223_214_201)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Cursor Reactive Overlay */}
        <div
          className="absolute h-full w-full bg-[radial-gradient(rgb(202_232_203)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none transition-opacity duration-150"
          style={{
            opacity: isMounted ? 1 : 0,
            maskImage: isMounted ? `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)` : undefined,
            WebkitMaskImage: isMounted ? `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)` : undefined
          }}
          suppressHydrationWarning
        ></div>

        {/* Centered Content */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">{loadingStatus || 'Processing...'}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Welcome Text */}
              <div className="text-center space-y-3 animate-fade-in">
                <h1 className="text-7xl text-foreground font-fancy">Procurement Made <span className="italic font-normal">Painless</span></h1>
                <h3 className="text-xl text-center text-muted-foreground">
                  Get accurate and simple insights into your data.
                </h3>
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                {selectedFile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 border border-border">
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
                        disabled={isLoading}
                      >
                        <PaperclipIcon className="size-5" />
                      </PromptInputButton>
                    </PromptInputTools>
                    <PromptInputSubmit className="bg-gradient-primary hover:brightness-90">
                      <SendIcon className="size-4" />
                    </PromptInputSubmit>
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          )}
        </div>
      </div></>
  )
}
