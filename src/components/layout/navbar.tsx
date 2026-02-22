"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/layout/mode-toggle"
import { LanguageToggle } from "@/components/layout/language-toggle"
import { Logo } from "@/components/ui/logo"

const navItems = [
  { name: "Home", href: "/" },
  { name: "Community", href: "/community" },
  { name: "Activity", href: "/activity" },
  { name: "Media", href: "/media" },
  { name: "Dashboard", href: "/dashboard" },
]

interface User {
  name: string;
  email: string;
  role?: string;
  region?: string;
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      setUser(null)
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setIsOpen(false)
    router.push('/')
  }

  const isDashboard = pathname?.startsWith('/dashboard')

  if (isDashboard) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors text-primary">
             <Logo className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">Smallholder Hub</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-foreground/80 ${
                pathname === item.href ? "text-foreground" : "text-foreground/60"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions (Theme, Lang, Auth) */}
        <div className="hidden md:flex items-center space-x-4">
          <ModeToggle />
          <LanguageToggle />
          <div className="flex items-center space-x-2 border-l pl-4">
            {mounted && user ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/shadcn.jpg" />
                  <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
                  Logout
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center space-x-2">
           <ModeToggle />
           <LanguageToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col space-y-4 mt-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-lg font-medium transition-colors hover:text-foreground/80 ${
                      pathname === item.href
                        ? "text-foreground"
                        : "text-foreground/60"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="h-px bg-border my-4" />
                {mounted && user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="/avatars/shadcn.jpg" />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left leading-tight">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-foreground/60 hover:text-foreground"
                  >
                    Login
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
