'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function DashboardContent() {
  const searchParams = useSearchParams()
  const [prompt, setPrompt] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [tableName, setTableName] = useState<string>('')
  const [rowCount, setRowCount] = useState<number>(0)

  useEffect(() => {
    // Read from URL params
    setPrompt(searchParams.get('prompt') || '')
    setFileName(searchParams.get('fileName') || '')
    setTableName(searchParams.get('table') || '')
    setRowCount(parseInt(searchParams.get('rows') || '0', 10))
  }, [searchParams])

  return (
    <div className="flex h-screen items-center justify-center bg-background p-8">
      <div className="max-w-3xl w-full space-y-6">
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>

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
              {rowCount > 0 && (
                <span className="ml-2 text-sm">({rowCount.toLocaleString()} rows)</span>
              )}
            </p>
          </div>
        )}

        {!prompt && !fileName && !tableName && (
          <p className="text-lg text-muted-foreground text-center">
            Your procurement analytics will appear here.
          </p>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
