import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Leaf } from "lucide-react";

export const metadata: Metadata = {
  title: "Login - Smallholder HUB",
  description: "Login untuk masuk ke sistem manajemen",
};

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left pane: branding/image side */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center gap-2 font-extrabold text-2xl tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-white flex shrink-0 items-center justify-center text-[#166534] shadow-md">
            <Leaf className="w-6 h-6" strokeWidth={2.5} />
          </div>
          Smallholder HUB
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-4">
            <p className="text-xl font-medium leading-relaxed">
              "Memberdayakan petani sawit swadaya untuk produksi kelapa sawit berkelanjutan dan kehidupan yang lebih baik."
            </p>
            <footer className="text-sm font-semibold opacity-80">Sawit Swadaya Program - WRI Indonesia</footer>
          </blockquote>
        </div>
      </div>
      
      {/* Right pane: form side */}
      <div className="p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
          <div className="flex flex-col space-y-2 text-center lg:hidden items-center justify-center mb-6">
             <div className="w-12 h-12 rounded-xl bg-primary flex shrink-0 items-center justify-center text-white shadow-md">
                <Leaf className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-2">Smallholder HUB</h1>
          </div>
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Selamat Datang Kembali
            </h1>
            <p className="text-sm text-muted-foreground">
              Masukkan email dan kredensial Anda untuk masuk ke sistem
            </p>
          </div>
          <LoginForm />
          <p className="px-8 text-center text-sm text-muted-foreground mt-4">
            <Link href="/" className="hover:text-primary font-medium underline-offset-4 hover:underline transition-all">
              Kembali ke Beranda Utama
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
