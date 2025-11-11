"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-input gradient-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="absolute inset-[3px] rounded-[10px] bg-background"></span>
          <Sun className="relative z-[1] h-[1.2rem] w-[1.2rem] rotate-0 scale-100 text-foreground transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute z-[1] h-[1.2rem] w-[1.2rem] rotate-90 scale-0 text-foreground transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
// Theme toggle updated - Mon Sep  8 23:10:19 AWST 2025
