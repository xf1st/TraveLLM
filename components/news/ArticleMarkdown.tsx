import ReactMarkdown from "react-markdown"

/** Strip duplicate title — page already renders <h1> */
export function stripLeadingMarkdownH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\r?\n+/, "").trim()
}

export function ArticleMarkdown({ content }: { content: string }) {
  const body = stripLeadingMarkdownH1(content)
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h2 className="mt-10 scroll-mt-24 text-2xl font-black tracking-tight text-foreground first:mt-0">
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h3 className="mt-8 text-xl font-bold text-foreground">{children}</h3>
        ),
        h3: ({ children }) => (
          <h4 className="mt-6 text-lg font-semibold text-foreground">{children}</h4>
        ),
        p: ({ children }) => <p className="my-4 leading-relaxed text-muted-foreground">{children}</p>,
        ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-muted-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-muted-foreground">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline-offset-4 hover:underline"
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-10 border-border/60" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{children}</blockquote>
        ),
      }}
    >
      {body}
    </ReactMarkdown>
  )
}
