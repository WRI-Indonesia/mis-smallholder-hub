"use client";

import * as React from "react";
import { Moon, Sun, LogOut, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AdminHeaderActions() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-9 w-9"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {mounted && theme === "light" ? (
          <Moon className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem]" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-9 gap-2 rounded-full pl-2 pr-3 hover:bg-muted/60 transition-colors" />}>
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium leading-none hidden sm:block">{userName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push("/admin/profile")}>
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
