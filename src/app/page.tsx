import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-purple-50 p-24">
      <div className="space-y-6 text-center">
        {/* Logo/Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 shadow-lg">
            <Sparkles className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-6xl font-bold text-stone-900">PostDraft</h1>
        </div>
        <p className="max-w-2xl text-xl text-stone-600">
          Discover trending topics and generate social media posts in your unique voice.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-purple-600 px-8 text-white hover:scale-[1.02] hover:shadow-lg transition-all"
          >
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300"
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

