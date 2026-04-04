"use client"

import React from "react"
import { cn } from "@/lib/utils"

function trimUrlTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/, "")
}

export function LinkifyMessage({
  text,
  className,
  linkClassName,
}: {
  text: string
  className?: string
  linkClassName?: string
}) {
  const re = /(https?:\/\/[^\s<>"']+)/g
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index))
    }
    const raw = m[1]
    const href = trimUrlTrailingPunctuation(raw)
    // Safety: only allow http/https (regex already guarantees this, but be explicit)
    if (!/^https?:\/\//i.test(href)) {
      parts.push(raw)
      last = m.index + raw.length
      continue
    }
    parts.push(
      <a
        key={k++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "underline underline-offset-2 break-all text-sky-600 dark:text-sky-400 hover:text-sky-700",
          linkClassName
        )}
      >
        {href}
      </a>
    )
    last = m.index + raw.length
  }
  if (last < text.length) {
    parts.push(text.slice(last))
  }
  return <div className={cn("whitespace-pre-wrap break-words", className)}>{parts}</div>
}
