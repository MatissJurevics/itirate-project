'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const [prompt, setPrompt] = useState<string>('')
  const [csvUrl, setCsvUrl] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [tableName, setTableName] = useState<string>('')
  const [isConverting, setIsConverting] = useState(false)
  const conversionStartedRef = useRef(false)

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedData = sessionStorage.getItem('dashboardData')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        setPrompt(data.prompt || '')
        setCsvUrl(data.csvUrl || '')
        setFileName(data.fileName || '')

        // Convert CSV to table if we have a CSV URL and haven't already kicked off the conversion.
        if (data.csvUrl && data.bucketFileName && !conversionStartedRef.current) {
          conversionStartedRef.current = true
          convertCsvToTable(data.csvUrl, data.bucketFileName)
        }

        // Optional: Clear the data after reading it
        // sessionStorage.removeItem('dashboardData')
      } catch (error) {
        console.error('Error parsing dashboard data:', error)
      }
    }
  }, [])

  const convertCsvToTable = async (csvUrl: string, bucketFileName: string) => {
    setIsConverting(true)
    toast.info('Converting CSV to database table...')

    try {
      const response = await fetch('/api/csv-to-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvUrl: csvUrl,
          fileName: bucketFileName // Use bucket filename for table name
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('CSV to table error:', result.error)
        toast.error(`Failed to convert CSV: ${result.error}`)
        return
      }

      console.log('CSV to table success:', result)
      setTableName(result.tableName)
      toast.success(`Table "${result.tableName}" created with ${result.rowCount} rows`)

    } catch (error) {
      console.error('CSV conversion error:', error)
      toast.error(`Failed to convert CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background p-8">
      <div className="max-w-3xl w-full space-y-6">
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>

        {isConverting && (
          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-foreground">Converting CSV to database table...</span>
          </div>
        )}

        {prompt && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">User Prompt:</h2>
            <p className="text-lg text-muted-foreground bg-card p-4 rounded-lg border border-border">
              {prompt}
            </p>
          </div>
        )}

        {fileName && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Uploaded File:</h2>
            <p className="text-lg text-muted-foreground bg-card p-4 rounded-lg border border-border">
              {fileName}
            </p>
          </div>
        )}

        {tableName && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Database Table:</h2>
            <p className="text-lg text-muted-foreground bg-card p-4 rounded-lg border border-border">
              <span className="font-mono">csv_to_table.{tableName}</span>
            </p>
          </div>
        )}

        {csvUrl && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">CSV File URL:</h2>
            <p className="text-sm text-muted-foreground bg-card p-4 rounded-lg border border-border break-all">
              {csvUrl}
            </p>
          </div>
        )}

        {!prompt && !csvUrl && !isConverting && (
          <p className="text-lg text-muted-foreground text-center">
            Your procurement analytics will appear here.
          </p>
        )}
      </div>
    </div>
  )
}
