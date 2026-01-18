"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedViperFish({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [lureFlicker, setLureFlicker] = useState(true)
  const [teethGlint, setTeethGlint] = useState(0)
  const [bodyPulse, setBodyPulse] = useState(0)

  useEffect(() => {
    const flickerInterval = setInterval(() => {
      setLureFlicker((f) => (Math.random() > 0.3 ? !f : f))
    }, 100)

    const glintInterval = setInterval(() => {
      setTeethGlint((g) => (g + 1) % 5)
    }, 200)

    const pulseInterval = setInterval(() => {
      setBodyPulse((p) => (p + 1) % 20)
    }, 100)

    return () => {
      clearInterval(flickerInterval)
      clearInterval(glintInterval)
      clearInterval(pulseInterval)
    }
  }, [])

  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-xl" : "text-lg"
  const teethCount = zoom === "far" ? 3 : zoom === "close" ? 8 : 5
  const bodySegments = zoom === "far" ? 4 : zoom === "close" ? 12 : 8

  return (
    <div className={`font-mono ${fontSize} select-none`}>
      {/* Lure */}
      <div className={zoom === "close" ? "h-10" : "h-6"}>
        <span className="text-slate-600">{zoom === "close" ? "             " : "         "}</span>
        <span
          className={`transition-all duration-75 ${lureFlicker ? "text-green-300" : "text-green-400"}`}
          style={{
            textShadow: lureFlicker
              ? `0 0 ${zoom === "close" ? 18 : 12}px #86efac, 0 0 ${zoom === "close" ? 36 : 24}px #86efac, 0 0 ${zoom === "close" ? 54 : 36}px rgba(134, 239, 172, 0.5)`
              : "0 0 6px #86efac",
          }}
        >
          {zoom === "close" ? "✦" : "✦"}
        </span>
      </div>

      {/* Stalk */}
      <div>
        <span className="text-slate-600">{zoom === "close" ? "            " : "        "}</span>
        <span className="text-slate-500" style={{ textShadow: "0 0 2px rgba(100,116,139,0.3)" }}>
          {zoom === "close" ? "|" : "/"}
        </span>
      </div>
      {zoom === "close" && (
        <div>
          <span className="text-slate-600">{"           "}</span>
          <span className="text-slate-500">/</span>
        </div>
      )}

      {/* Head and body */}
      <div className="relative">
        <span className="text-slate-700">{zoom === "close" ? "     " : "   "}</span>
        <span className="text-slate-500">{"{"}</span>
        <span className="text-red-400" style={{ textShadow: `0 0 ${zoom === "close" ? 12 : 8}px rgba(248, 113, 113, 0.7)` }}>
          °
        </span>
        {/* Animated teeth */}
        {Array.from({ length: teethCount }).map((_, i) => (
          <span
            key={i}
            className="transition-all duration-100"
            style={{
              color: i === teethGlint % teethCount ? "#e2e8f0" : "#64748b",
              textShadow: i === teethGlint % teethCount ? "0 0 6px white, 0 0 12px white" : "none",
            }}
          >
            |
          </span>
        ))}
        <span className="text-slate-500">{">---"}</span>
        {/* Body with photophores */}
        {Array.from({ length: bodySegments }).map((_, i) => (
          <span
            key={i}
            className="transition-all duration-200"
            style={{
              color: (bodyPulse + i) % 4 === 0 ? "#a5f3fc" : "#475569",
              textShadow: (bodyPulse + i) % 4 === 0 ? "0 0 8px cyan, 0 0 16px rgba(0,255,255,0.4)" : "none",
            }}
          >
            -
          </span>
        ))}
        <span className="text-slate-500">{">"}</span>
      </div>

      {/* Lower jaw */}
      <div>
        <span className="text-slate-700">{zoom === "close" ? "      " : "    "}</span>
        <span className="text-slate-600" style={{ textShadow: "0 0 2px rgba(71,85,105,0.3)" }}>
          {Array.from({ length: teethCount + 2 }).map(() => "\\").join("")}
        </span>
        <span className="text-slate-700/50">
          {Array.from({ length: bodySegments - 2 }).map(() => "_").join("")}
          {")"}
        </span>
      </div>

      {/* Water disturbance */}
      <div className="text-blue-400/30" style={{ textShadow: "0 0 4px rgba(96,165,250,0.2)" }}>
        {zoom === "close" ? "           ~~~~~~~~~~~~~~~~~~~" : "         ~~~~~~~~~~~~~"}
      </div>
    </div>
  )
}
