"use client"

import { useEffect, useState } from "react"

type Item = { id: string; code: string; name: string }

// Sticky numbered index for the solutions page; highlights the card currently in view.
export default function SolutionsIndex({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: "-96px 0px -55% 0px" },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [items])

  return (
    <nav className="sx-index">
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} className={i.id === active ? "on" : undefined}>
          <span className="ix-code">{i.code}</span>
          <span className="ix-name">{i.name}</span>
          <span className="ix-dot" />
        </a>
      ))}
    </nav>
  )
}
