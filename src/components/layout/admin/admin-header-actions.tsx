"use client"

import * as React from "react"
import { Moon, Sun, LogOut, User as UserIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AdminHeaderActions() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [lang, setLang] = React.useState<"ID" | "EN">("ID")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  function handleLogout() {
    localStorage.removeItem("sh_mock_user")
    router.push("/")
  }

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Theme Toggle - Matches Public Layout */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-9 w-9"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {mounted && theme === "light" ? (
          <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Language Toggle - Matches Public Layout */}
      <Button 
        variant="ghost" 
        className="w-10 h-9 px-0 font-bold text-muted-foreground hover:text-foreground rounded-full"
        onClick={() => setLang(lang === "ID" ? "EN" : "ID")}
      >
        {lang}
      </Button>

      <div className="w-px h-5 bg-border mx-1"></div>

      {/* Profile / User */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 rounded-full pl-2 pr-3 hover:bg-muted/60 transition-colors" />}>
          <Avatar className="h-6 w-6">
            <AvatarImage src="" alt="Admin User" />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">AD</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium leading-none hidden sm:block">Admin User</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Admin User</p>
                <p className="text-xs leading-none text-muted-foreground">admin@smallholderhub.com</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
