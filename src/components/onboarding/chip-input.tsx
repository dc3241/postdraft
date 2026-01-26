"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  maxItems?: number
  maxLength?: number
  className?: string
  disabled?: boolean
}

export function ChipInput({
  value,
  onChange,
  placeholder = "Add item...",
  maxItems = 10,
  maxLength = 200,
  className,
  disabled,
}: ChipInputProps) {
  const [inputValue, setInputValue] = React.useState("")

  const handleAdd = (item: string) => {
    const trimmed = item.trim()
    if (!trimmed) return
    if (value.length >= maxItems) return
    if (trimmed.length > (maxLength || 200)) return
    if (value.includes(trimmed)) return

    onChange([...value, trimmed])
    setInputValue("")
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      handleAdd(inputValue)
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      handleRemove(value.length - 1)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-stone-200 rounded-lg bg-white">
        {value.map((item, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-900 rounded-md text-sm"
          >
            <span>{item}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="hover:bg-stone-200 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {value.length < maxItems && !disabled && (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue) handleAdd(inputValue)
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="border-0 shadow-none focus-visible:ring-0 h-auto min-w-[120px] flex-1"
            maxLength={maxLength}
            disabled={disabled}
          />
        )}
      </div>
      {value.length >= maxItems && (
        <p className="text-xs text-stone-500">
          Maximum {maxItems} items reached
        </p>
      )}
    </div>
  )
}
