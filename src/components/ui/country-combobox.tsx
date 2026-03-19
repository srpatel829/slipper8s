"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { COUNTRIES } from "@/lib/countries"

const TOP_COUNTRIES = ["United States"]
const OTHER_COUNTRIES = COUNTRIES.filter(c => !TOP_COUNTRIES.includes(c))

interface CountryComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CountryCombobox({ value, onChange, placeholder = "Select country...", className }: CountryComboboxProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between bg-muted/50 border-border font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandList className="max-h-64">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {TOP_COUNTRIES.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={() => {
                    onChange(c === value ? "" : c)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="All Countries">
              {OTHER_COUNTRIES.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={() => {
                    onChange(c === value ? "" : c)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
