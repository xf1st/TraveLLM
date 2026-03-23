"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

type Props = {
  content: string
  className?: string
  /** Dark panel (FAB / embedded dark) */
  variant?: "default" | "panel"
}

export function ChatAssistantMarkdown({ content, className, variant = "default" }: Props) {
  const linkClass =
    variant === "panel"
      ? "text-sky-300 underline underline-offset-2 break-all hover:text-sky-200"
      : "text-sky-600 dark:text-sky-400 underline underline-offset-2 break-all hover:text-sky-700 dark:hover:text-sky-300"

  const components: Components = {
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    ),
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="list-disc pl-4 mb-2 space-y-1 marker:text-muted-foreground">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-4 mb-2 space-y-1 marker:text-muted-foreground">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ children, className: codeClass }) => (
      <code
        className={cn(
          "rounded px-1 py-0.5 text-[12px] font-mono",
          variant === "panel"
            ? "bg-white/10 text-white/90"
            : "bg-muted text-foreground",
          codeClass
        )}
      >
        {children}
      </code>
    ),
    h1: ({ children }) => <p className="font-bold text-[1.05em] mb-1">{children}</p>,
    h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
    h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "border-l-2 pl-3 my-2 italic opacity-90",
          variant === "panel" ? "border-white/25" : "border-border"
        )}
      >
        {children}
      </blockquote>
    ),
  }

  return (
    <div
      className={cn(
        "text-[13px] leading-relaxed break-words [&_a]:break-all",
        variant === "panel" && "text-white/90",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
