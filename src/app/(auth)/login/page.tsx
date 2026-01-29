"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    console.log("✅ Login form submitted with data:", data)
    setIsLoading(true)
    console.log("⏳ Loading state set to true")
    try {
      console.log("📡 Calling API login...")
      await api.auth.login(data.email, data.password)
      console.log("✅ Login successful")
      toast.success("Logged in successfully!")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("❌ Login error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to login")
    } finally {
      setIsLoading(false)
      console.log("⏸️ Loading state set to false")
    }
  }

  const onError = (errors: any) => {
    console.log("⚠️ Form validation errors:", errors)
    const firstError = Object.values(errors)[0] as any
    if (firstError?.message) {
      toast.error(firstError.message)
    } else {
      toast.error("Please fix the form errors before submitting")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
        {/* Logo/Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">PostDraft</h1>
          <p className="text-sm text-stone-600 text-center mt-2">
            Discover trending topics and generate social media posts in your unique voice.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold text-stone-900">Welcome back</h2>
          <p className="text-sm text-stone-600">
            Enter your email and password to sign in
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-stone-700 mb-2">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="px-4 py-3 placeholder:text-stone-400"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-stone-700 mb-2">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              className="px-4 py-3"
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all hover:scale-[1.02]" 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-stone-200">
          <div className="text-center text-sm text-stone-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-orange-500 hover:text-orange-600 hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
