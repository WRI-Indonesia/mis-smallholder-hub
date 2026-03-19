"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState("ID");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-sm">
      <div className="container flex h-16 items-center mx-auto px-4 md:px-6">
        <div className="mr-8 flex items-center md:mx-auto lg:mx-0">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl inline-block text-primary">Smallholder HUB</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex space-x-4 mr-4">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/community" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Community
            </Link>
            <Link href="/knowledge-management" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Knowledge Management
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {mounted && theme === "light" ? (
                <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-10 px-0 font-bold text-muted-foreground hover:text-foreground"
              onClick={() => setLang(lang === "ID" ? "EN" : "ID")}
            >
              {lang}
            </Button>

            <Link href="/admin/dashboard" className={buttonVariants({ variant: "default" })}>
              Login
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
