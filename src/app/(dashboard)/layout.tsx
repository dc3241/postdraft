"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import {
  LayoutDashboard,
  FileText,
  Database,
  Settings,
  LogOut,
  User,
  Sparkles,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { user: sessionUser } = await api.auth.session()
        if (!sessionUser) {
          router.push("/login")
          return
        }
        setUser(sessionUser as any)
      } catch {
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await api.auth.logout()
      toast.success("Logged out successfully")
      router.push("/login")
      router.refresh()
    } catch (error) {
      toast.error("Failed to logout")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/posts", label: "Posts", icon: FileText },
    { href: "/sources", label: "Sources", icon: Database },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-stone-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="border-b border-stone-200 p-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-stone-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span>PostDraft</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link key={item.href} href={item.href} className="block w-full">
                  <div
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Pro Tip Card */}
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 p-4 text-white">
              <div className="mb-2 text-sm font-semibold">💡 Pro Tip</div>
              <p className="text-xs leading-relaxed">
                Generate posts from trending topics to maximize engagement and reach.
              </p>
            </div>
          </div>

          {/* User Profile at Bottom */}
          <div className="border-t border-stone-200 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-stone-50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-stone-100 text-stone-700">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-stone-900">
                      {user?.full_name || user?.email || "User"}
                    </span>
                    {user?.email && user?.full_name && (
                      <span className="text-xs text-stone-600">
                        {user.email}
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
