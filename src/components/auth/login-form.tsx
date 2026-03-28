"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { usersData } from "@/lib/static-data";
import { toast } from "sonner"; // If sonner is present, we'll try to use it else just ignore

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const target = event.target as typeof event.target & {
      email: { value: string };
      password: { value: string };
    };

    const email = target.email.value;
    const password = target.password.value;

    // Simulate network request
    setTimeout(() => {
      // Mock auth logic using static data
      const user = usersData.find(u => u.email === email && u.password === password);
      
      if (user) {
        // success -> Normally you'd signIn via NextAuth here.
        // Mock session using localStorage
        localStorage.setItem("sh_mock_user", JSON.stringify(user));
        
        if (typeof window !== "undefined" && (window as any).toast) {
           (window as any).toast.success("Login Berhasil");
        }
        
        router.push("/admin/dashboard");
      } else {
        setError("Email atau password tidak valid");
        setIsLoading(false);
      }
    }, 1000);
  }

  const fillDemo = (emailValue: string, passValue: string) => {
    const emailField = document.getElementById('email') as HTMLInputElement;
    const passField = document.getElementById('password') as HTMLInputElement;
    if (emailField && passField) {
      emailField.value = emailValue;
      passField.value = passValue;
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit}>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="nama@contoh.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              required
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              disabled={isLoading}
              required
              className="h-11"
            />
          </div>
          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-2.5 rounded-md text-center">
              {error}
            </div>
          )}
          <Button disabled={isLoading} type="submit" className="w-full h-11 font-semibold text-base">
            {isLoading && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            Masuk ke Sistem
          </Button>
        </div>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground font-medium">
            Atau gunakan kredensial demo
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Button variant="outline" type="button" className="h-9 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => fillDemo('admin@wri.org', 'admin123')}>
          SuperAdmin
        </Button>
        <Button variant="outline" type="button" className="h-9 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => fillDemo('admin@koperasi.id', 'koperasi123')}>
          Admin Koperasi
        </Button>
        <Button variant="outline" type="button" className="h-9 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => fillDemo('siti@field.org', 'field123')}>
          Field Officer
        </Button>
        <Button variant="outline" type="button" className="h-9 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => fillDemo('agus@stakeholder.com', 'stake123')}>
          Stakeholder
        </Button>
      </div>
    </div>
  );
}
