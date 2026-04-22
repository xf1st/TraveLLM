import { useState, useEffect } from "react"

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(() =>
    typeof window !== "undefined" ? matchMedia(query).matches : false
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = matchMedia(query)
    result.addEventListener("change", onChange)

    return () => result.removeEventListener("change", onChange)
  }, [query])

  return value
}
