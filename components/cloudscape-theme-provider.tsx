"use client"

import { useEffect } from 'react'
import { applyTheme } from '@cloudscape-design/components/theming'
import { cloudscapeTheme } from '@/lib/cloudscape-theme'

export function CloudscapeThemeProvider() {
  useEffect(() => {
    const { reset } = applyTheme({ theme: cloudscapeTheme })
    
    // Cleanup function to reset theme on unmount
    return () => {
      reset()
    }
  }, [])

  return null
}
