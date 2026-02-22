import { Metadata } from "next"
import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"
import { Logo } from "@/components/ui/logo"

export const metadata: Metadata = {
  title: "Login - Smallholder Hub",
  description: "Sign in to your account.",
}

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary/20 bg-[url('https://images.unsplash.com/photo-1595958043695-1e35fa8f01f0?q=80&w=2675&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
        
        <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20 backdrop-blur-sm">
             <Logo className="h-6 w-6 text-primary-foreground" />
          </div>
          MIS Smallholder Hub
        </div>

        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;This platform has deeply revolutionized the way we manage palm oil smallholder data, bringing transparency and efficiency to every step of our supply chain.&rdquo;
            </p>
            <footer className="text-sm">Agus Setiawan - Lead Agronomist</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8 flex pt-20 md:pt-0 h-full items-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center lg:hidden relative z-20 items-center pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
               <Logo className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              MIS Smallholder Hub
            </h1>
          </div>
          <LoginForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
