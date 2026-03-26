"use client"

import { useEffect } from "react"

const SLOT_ID = "tp-drive-legal-anchor"

/** Типичная строка маркировки Drive / партнёров РФ (без флага `s` — совместимость с tsconfig) */
const LEGAL_LINE_RE = /Реклама[.\s]*[\s\S]*ИНН[:\s]*\d+/i

/**
 * Travelpayouts Drive вставляет маркировку рекламы (erid / «Реклама… ИНН…») в поток страницы.
 * Переносим найденные узлы в общий слот внизу layout — под основной контент, без налезания на FAB.
 */
function collectLegalLabelRoots(): HTMLElement[] {
  const matches: HTMLElement[] = []
  document.querySelectorAll("body *").forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.id === SLOT_ID || node.closest(`#${SLOT_ID}`)) return
    const t = node.textContent?.trim() ?? ""
    if (t.length < 12 || t.length > 800) return
    if (!LEGAL_LINE_RE.test(t)) return
    matches.push(node)
  })
  // Оставляем только «листья»: не переносим контейнер, если внутри уже есть отдельный узел с тем же текстом
  return matches.filter(
    (el) => !matches.some((other) => other !== el && el.contains(other)),
  )
}

export function DriveLegalLabelRelocator() {
  useEffect(() => {
    const slot = () => document.getElementById(SLOT_ID)
    const run = () => {
      const s = slot()
      if (!s) return
      for (const el of collectLegalLabelRoots()) {
        try {
          const style = window.getComputedStyle(el)
          if (style.position === "fixed" || style.position === "absolute") {
            el.style.position = "static"
            el.style.inset = "auto"
            el.style.right = "auto"
            el.style.bottom = "auto"
            el.style.left = "auto"
            el.style.transform = "none"
          }
          s.appendChild(el)
        } catch {
          /* ignore */
        }
      }
    }

    run()
    const id = window.setInterval(run, 1500)
    const mo = new MutationObserver(() => {
      run()
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      window.clearInterval(id)
      mo.disconnect()
    }
  }, [])

  return (
    <div
      id={SLOT_ID}
      className="w-full max-w-4xl mx-auto px-4 py-4 text-center text-[10px] leading-snug text-muted-foreground border-t border-border/40 mt-4 [&_a]:text-sky-600 dark:[&_a]:text-sky-400 [&_a]:underline"
      aria-label="Advertising disclosure"
    />
  )
}
