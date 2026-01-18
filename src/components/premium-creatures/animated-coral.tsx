"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedCoral({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [swayOffset, setSwayOffset] = useState(0)
  const [polypsGlow, setPolypsGlow] = useState([false, true, false, true, false, true, false])

  useEffect(() => {
    const swayInterval = setInterval(() => {
      setSwayOffset((s) => (s + 1) % 4)
    }, 800)

    const glowInterval = setInterval(() => {
      setPolypsGlow((prev) => prev.map(() => Math.random() > 0.5))
    }, 600)

    return () => {
      clearInterval(swayInterval)
      clearInterval(glowInterval)
    }
  }, [])

  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-xl" : "text-lg"
  
  const art = {
    far: {
      sway: [" \\|/~\\|/", "  \\|/~\\|/", " \\|/~\\|/ ", "\\|/~\\|/  "],
      polyps: ["{*}", "{@}", "{*}"],
      base: " /|\\~/|\\",
      sand: "~~~~~~~~~",
    },
    medium: {
      sway: [" \\|/_.~._\\|/_.~._\\|/", "  \\|/_.~._\\|/_.~._\\|/", " \\|/_.~._\\|/_.~._\\|/ ", "\\|/_.~._\\|/_.~._\\|/  "],
      polyps: ["{*}", "{@}", "{*}", "{@}", "{*}"],
      base: " /|\\~'~'/|\\~'~'/|\\",
      sand: "~~~~~~~~~~~~~~~~~~~~",
    },
    close: {
      sway: ["  \\|/__.~.__\\|/__.~.__\\|/__.~.__\\|/", "   \\|/__.~.__\\|/__.~.__\\|/__.~.__\\|/", "  \\|/__.~.__\\|/__.~.__\\|/__.~.__\\|/ ", " \\|/__.~.__\\|/__.~.__\\|/__.~.__\\|/  "],
      polyps: ["{*}", "{@}", "{*}", "{@}", "{*}", "{@}", "{*}"],
      base: "  /|\\~~'~~'/|\\~~'~~'/|\\~~'~~'/|\\",
      sand: "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    },
  }

  const current = art[zoom]
  const particleCount = zoom === "far" ? 4 : zoom === "close" ? 10 : 6

  return (
    <div className={`font-mono ${fontSize} select-none`}>
      {/* Floating particles */}
      <div className={`relative ${zoom === "close" ? "h-10" : "h-6"}`}>
        {Array.from({ length: particleCount }).map((_, i) => (
          <span
            key={i}
            className="absolute text-orange-200/40 animate-rise"
            style={{
              left: `${5 + i * (90 / particleCount)}%`,
              animationDelay: `${i * 0.4}s`,
              textShadow: "0 0 4px rgba(254, 215, 170, 0.3)",
            }}
          >
            °
          </span>
        ))}
      </div>

      {/* Swaying fronds */}
      <div
        className="text-orange-400 transition-all duration-500"
        style={{ textShadow: "0 0 4px rgba(251, 146, 60, 0.4)" }}
      >
        {current.sway[swayOffset]}
      </div>

      {/* Polyps */}
      <div>
        {current.polyps.map((polyp, i) => (
          <span
            key={i}
            className="transition-all duration-300"
            style={{
              color: polypsGlow[i] ? (i % 2 === 0 ? "#fcd34d" : "#fb923c") : "#c2410c",
              textShadow: polypsGlow[i]
                ? `0 0 10px ${i % 2 === 0 ? "#fcd34d" : "#fb923c"}, 0 0 20px ${i % 2 === 0 ? "rgba(252, 211, 77, 0.5)" : "rgba(251, 146, 60, 0.5)"}`
                : "none",
            }}
          >
            {polyp}
            {i < current.polyps.length - 1 ? "=" : ""}
          </span>
        ))}
      </div>

      {/* Base fronds */}
      <div className="text-orange-500/70" style={{ textShadow: "0 0 3px rgba(249, 115, 22, 0.3)" }}>
        {current.base}
      </div>

      {/* Sand */}
      <div className="text-amber-200/40">{current.sand}</div>

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes rise {
          0% { transform: translateY(20px); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-10px); opacity: 0; }
        }
        .animate-rise { animation: rise 3s ease-out infinite; }
      `}</style>
    </div>
  )
}
