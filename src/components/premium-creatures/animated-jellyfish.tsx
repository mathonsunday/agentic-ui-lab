"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedJellyfish({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [pulsePhase, setPulsePhase] = useState(0)
  const [tentacleFrame, setTentacleFrame] = useState(0)

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 4)
    }, 500)

    const tentacleInterval = setInterval(() => {
      setTentacleFrame((t) => (t + 1) % 3)
    }, 300)

    return () => {
      clearInterval(pulseInterval)
      clearInterval(tentacleInterval)
    }
  }, [])

  const glowColors = [
    "rgba(192, 132, 252, 0.8)",
    "rgba(167, 139, 250, 0.9)",
    "rgba(196, 181, 253, 1)",
    "rgba(167, 139, 250, 0.9)",
  ]

  const artFrames = {
    far: {
      bells: [",-.", ",--.", ",---.", ",--,"],
      tentacles: [["|||"], ["/|\\"], ["\\|/"]],
    },
    medium: {
      bells: ["  ,---.  ", " ,-----, ", ",-------,", " ,-----, "],
      tentacles: [
        ["  |\\|/|  ", "   \\|/   ", "    ~    "],
        ["  /|\\|\\  ", "   /|\\   ", "    ~    "],
        ["  |/|\\|  ", "   |~|   ", "    ~    "],
      ],
    },
    close: {
      bells: ["    ,------.    ", "   ,--------.   ", "  ,----------.  ", "   ,--------.   "],
      tentacles: [
        ["    |\\|||/|    ", "     \\|||/     ", "      \\|/      ", "       ~       "],
        ["    /|\\|/|\\    ", "     /|||\\     ", "      /|\\      ", "       ~       "],
        ["    |/|||\\|    ", "     |\\|/|     ", "      |~|      ", "       ~       "],
      ],
    },
  }

  const art = artFrames[zoom]
  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-xl" : "text-lg"
  const bodyLine = zoom === "far" ? "(~~)" : zoom === "close" ? "    (~~~~~~~~)    " : "  (~~~)  "

  return (
    <div
      className={`font-mono ${fontSize} select-none transition-transform duration-500`}
      style={{ transform: `translateY(${Math.sin(pulsePhase * 0.8) * 3}px)` }}
    >
      <div
        className="text-purple-300 transition-all duration-300"
        style={{ textShadow: `0 0 15px ${glowColors[pulsePhase]}, 0 0 30px ${glowColors[pulsePhase]}` }}
      >
        {art.bells[pulsePhase]}
      </div>

      <div className="text-purple-400/80" style={{ textShadow: `0 0 10px rgba(192, 132, 252, 0.5)` }}>
        {bodyLine}
      </div>

      {art.tentacles[tentacleFrame].map((line, i) => (
        <div
          key={i}
          className="text-purple-300/60 transition-all duration-200"
          style={{
            textShadow: `0 0 ${8 - i * 2}px rgba(192, 132, 252, ${0.4 - i * 0.1})`,
            opacity: 1 - i * 0.15,
          }}
        >
          {line}
        </div>
      ))}

      <div className={`relative ${zoom === "close" ? "h-12" : "h-8"}`}>
        {[...Array(zoom === "close" ? 8 : zoom === "far" ? 3 : 5)].map((_, i) => (
          <span
            key={i}
            className="absolute text-purple-300/40 animate-sink"
            style={{
              left: `${20 + i * (zoom === "close" ? 8 : 10)}%`,
              animationDelay: `${i * 0.3}s`,
              textShadow: "0 0 6px rgba(192, 132, 252, 0.4)",
            }}
          >
            ·
          </span>
        ))}
      </div>

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes sink {
          0% { transform: translateY(0); opacity: 0.6; }
          100% { transform: translateY(30px); opacity: 0; }
        }
        .animate-sink { animation: sink 2s ease-in infinite; }
      `}</style>
    </div>
  )
}
