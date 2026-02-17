"use client"

import * as React from "react"
import { Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle() {
  const [lang, setLang] = React.useState("EN")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-[60px]">
          <Globe className="mr-2 h-4 w-4" />
          {lang}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLang("EN")}>
          English (EN)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang("ID")}>
          Bahasa Indonesia (ID)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
