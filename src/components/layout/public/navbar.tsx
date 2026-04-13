"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, Leaf } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
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
        <div className="mr-4 flex items-center md:mx-auto lg:mx-0 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex shrink-0 items-center justify-center text-[#166534] shadow-sm ring-1 ring-border/20">
              <Leaf className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-lg md:text-xl inline-block text-foreground tracking-tight">Smallholder HUB</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
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

            <div className="hidden md:block">
              <Link href="/login" className={buttonVariants({ variant: "default" })}>
                Login
              </Link>
            </div>

            {/* Mobile Nav Hamburger */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                  <div className="flex flex-col gap-6 pt-10">
                    <Link href="/" className="text-lg font-semibold hover:text-primary transition-colors">
                      Home
                    </Link>
                    <Link href="/community" className="text-lg font-semibold hover:text-primary transition-colors">
                      Community
                    </Link>
                    <Link href="/knowledge-management" className="text-lg font-semibold hover:text-primary transition-colors">
                      Knowledge Management
                    </Link>
                    <Link href="/login" className={buttonVariants({ variant: "default", className: "w-full justify-center" })}>
                      Login Admin
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
