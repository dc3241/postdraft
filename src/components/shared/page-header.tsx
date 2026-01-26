import { Button } from "@/components/ui/button"
import { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
        {description && (
          <p className="mt-2 text-base text-stone-600">{description}</p>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-gradient-to-r from-orange-500 to-purple-600 text-white transition-all hover:shadow-lg"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}
