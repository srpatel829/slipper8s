"use client"

import { useState, useEffect, useCallback } from "react"
import {
  MessageSquareText,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  User,
  Globe,
  Clock,
  Mail,
  ExternalLink,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FeedbackItem {
  id: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  message: string
  page: string | null
  createdAt: string
}

const PAGE_SIZE = 20

export default function FeedbackInboxPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        take: String(PAGE_SIZE),
      })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/feedback?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.feedbacks)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchFeedback()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this feedback message? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/feedback?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id))
        setTotal((prev) => prev - 1)
        if (expandedId === id) setExpandedId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquareText className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Feedback Inbox</h1>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs font-mono">
              {total}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          User-submitted feedback from the in-app feedback button.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages, users, pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Search
        </Button>
      </form>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <MessageSquareText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {search ? "No feedback matching your search" : "No feedback received yet"}
          </p>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => {
                setSearch("")
                setPage(0)
              }}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Feedback list — inbox style */}
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
            {feedbacks.map((fb) => {
              const isExpanded = expandedId === fb.id
              const isDeleting = deletingId === fb.id
              const isAnonymous = !fb.userName && !fb.userEmail

              return (
                <div
                  key={fb.id}
                  className={`transition-colors ${
                    isExpanded ? "bg-muted/20" : "hover:bg-muted/10"
                  }`}
                >
                  {/* Row summary — always visible */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 flex items-start gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                  >
                    {/* Avatar / icon */}
                    <div className="shrink-0 mt-0.5">
                      {fb.userName ? (
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {fb.userName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate">
                          {fb.userName ?? "Anonymous"}
                        </span>
                        {fb.page && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5 shrink-0 font-mono text-muted-foreground border-border/60"
                          >
                            {fb.page}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {fb.message}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                        {formatDate(fb.createdAt)}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 ml-11">
                      {/* Full message */}
                      <div className="bg-background/60 border border-border/40 rounded-lg p-4 mb-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {fb.message}
                        </p>
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatFullDate(fb.createdAt)}
                        </span>
                        {fb.userEmail && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            {fb.userEmail}
                          </span>
                        )}
                        {fb.page && (
                          <span className="flex items-center gap-1.5">
                            <Globe className="h-3 w-3" />
                            {fb.page}
                          </span>
                        )}
                        {isAnonymous && (
                          <span className="text-muted-foreground/50 italic">
                            Not logged in
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {fb.userEmail && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            asChild
                          >
                            <a href={`mailto:${fb.userEmail}?subject=Re: Your Slipper8s feedback`}>
                              <ExternalLink className="h-3 w-3" />
                              Reply via email
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(fb.id)
                          }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                  Prev
                </Button>
                <span className="tabular-nums">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
