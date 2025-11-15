'use client'

import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [prompt, setPrompt] = useState<string>('')
  const [csvUrl, setCsvUrl] = useState<string>('')

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedData = sessionStorage.getItem('dashboardData')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        setPrompt(data.prompt || '')
        setCsvUrl(data.csvUrl || '')

        // Optional: Clear the data after reading it
        // sessionStorage.removeItem('dashboardData')
      } catch (error) {
        console.error('Error parsing dashboard data:', error)
      }
    }
  }, [])

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

        {csvUrl && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">CSV File URL:</h2>
            <p className="text-sm text-muted-foreground bg-card p-4 rounded-lg border border-border break-all">
              {csvUrl}
            </p>
          </div>
        )}

        {!prompt && !csvUrl && (
          <p className="text-lg text-muted-foreground text-center">
            Your procurement analytics will appear here.
          </p>
        )}
      </div>
    </div>
  )
}
