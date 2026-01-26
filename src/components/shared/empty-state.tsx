import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  iconColor?: "orange" | "purple" | "blue"
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = "orange",
}: EmptyStateProps) {
  const gradientClasses = {
    orange: "bg-gradient-to-br from-orange-500 to-orange-600",
    purple: "bg-gradient-to-br from-purple-500 to-purple-600",
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
  }

  return (
    <div className="py-12 text-center">
      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${gradientClasses[iconColor]}`}>
        <Icon className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm text-stone-600">{description}</p>
      {action && (
        <Button
          className="mt-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
