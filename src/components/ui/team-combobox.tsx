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
import { D1_TEAMS_BY_CONFERENCE } from "@/lib/d1-teams"

interface TeamComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TeamCombobox({ value, onChange, placeholder = "Search teams...", className }: TeamComboboxProps) {
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
          <CommandInput placeholder="Search teams..." />
          <CommandList className="max-h-64">
            <CommandEmpty>No team found.</CommandEmpty>
            {D1_TEAMS_BY_CONFERENCE.map(({ conference, teams }) => (
              <CommandGroup key={conference} heading={conference}>
                {teams.map((team) => (
                  <CommandItem
                    key={`${conference}-${team}`}
                    value={`${team} ${conference}`}
                    onSelect={() => {
                      onChange(team === value ? "" : team)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === team ? "opacity-100" : "opacity-0")}
                    />
                    {team}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
