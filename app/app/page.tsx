"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip } from "lucide-react"
import { useRef, ChangeEvent, useEffect } from "react"


export default function Page() {


  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
      </header>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
            <h1 className="text-2xl font-medium text-foreground">
              What can I do for you today?
            </h1>
            <form
              className="flex flex-col gap-3 w-full"
              onSubmit={e => { e.preventDefault(); /* handle submit here */ }}
            >
              <div className="relative flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Ask anything"
                  className="h-14 text-base rounded-xl pr-12"
                />
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="*/*"
                  multiple={false}
                />
                <label
                  htmlFor="file-upload"
                  className="absolute right-2 cursor-pointer"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hover:bg-accent"
                    aria-label="Attach file"
                    tabIndex={-1}
                  >
                    <Paperclip className="size-5" />
                  </Button>
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
