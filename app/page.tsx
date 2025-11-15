"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Loader2, PaperclipIcon, SendIcon } from 'lucide-react'
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

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0
  })

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

  const handleSubmit = async (_message: PromptInputMessage) => {
    setIsLoading(true)

    // Show loading screen for 5 seconds, then navigate to dashboard
    setTimeout(() => {
      router.push("/dashboard")
    }, 5000)
  }

  return (
    <><header className="flex h-16 shrink-0 items-center gap-2 px-4">
    <SidebarTrigger className="-ml-1" />
    <Separator
      orientation="vertical"
      className="mr-2 data-[orientation=vertical]:h-4"
    />
  </header>
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
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputBody>
                  <PromptInputTextarea
                    placeholder="What type of dashboard would you like?"
                    className="min-h-[24px] max-h-[200px] text-foreground placeholder:text-muted-foreground"
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <PromptInputButton className="text-muted-foreground hover:text-foreground bg-transparent">
                      <PaperclipIcon className="size-5" />
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
    </div></>
  )
}
