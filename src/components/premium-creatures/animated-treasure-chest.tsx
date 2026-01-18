"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedTreasureChest({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [sparklePositions, setSparklePositions] = useState([0, 2, 4])
  const [glintIntensity, setGlintIntensity] = useState([1, 0.5, 0.8])

  useEffect(() => {
    const maxPos = zoom === "far" ? 4 : zoom === "close" ? 10 : 7
    const sparkleInterval = setInterval(() => {
      setSparklePositions((prev) => prev.map(() => Math.floor(Math.random() * maxPos)))
      setGlintIntensity((prev) => prev.map(() => 0.3 + Math.random() * 0.7))
    }, 400)

    return () => clearInterval(sparkleInterval)
  }, [zoom])

  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-xl" : "text-lg"
  const goldCount = zoom === "far" ? 4 : zoom === "close" ? 10 : 7
  const goldChars = Array.from({ length: goldCount }, () => "$")

  const art = {
    far: { lid: "  [===]", base: "  [_$_]", sand: "  ~~~~~" },
    medium: { lid: "    .=======.", base: "   [|_coins_|]", sand: "   ~~~~~~~~~~" },
    close: { lid: "      .=============.", base: "     [|___coins_____|]", sand: "     ~~~~~~~~~~~~~~~~~~" },
  }

  return (
    <div className={`font-mono ${fontSize} select-none`}>
      {/* Floating sparkles */}
      <div className={`relative ${zoom === "close" ? "h-12" : "h-8"}`}>
        {sparklePositions.map((pos, i) => (
          <span
            key={i}
            className="absolute text-yellow-300 animate-twinkle"
            style={{
              left: `${10 + pos * (zoom === "close" ? 8 : 12)}%`,
              top: `${5 + i * (zoom === "close" ? 12 : 8)}px`,
              animationDelay: `${i * 0.2}s`,
              textShadow: `0 0 ${10 * glintIntensity[i]}px #fef08a, 0 0 ${20 * glintIntensity[i]}px #fef08a`,
              opacity: glintIntensity[i],
            }}
          >
            {["✦", "*", "·"][i % 3]}
          </span>
        ))}
      </div>

      {/* Lid */}
      <div className="text-amber-700" style={{ textShadow: "0 0 3px rgba(180, 83, 9, 0.4)" }}>
        {art[zoom].lid}
      </div>

      {/* Gold contents */}
      <div>
        <span className="text-amber-700" style={{ textShadow: "0 0 3px rgba(180, 83, 9, 0.4)" }}>
          {zoom === "far" ? "  [| " : zoom === "close" ? "     [| " : "   [| "}
        </span>
        {goldChars.map((char, i) => (
          <span
            key={i}
            className="transition-all duration-200"
            style={{
              color: sparklePositions.includes(i) ? "#fef08a" : "#f59e0b",
              textShadow: sparklePositions.includes(i)
                ? `0 0 8px #fef08a, 0 0 16px rgba(254, 240, 138, 0.6)`
                : "0 0 2px rgba(245, 158, 11, 0.3)",
            }}
          >
            {char}{i < goldChars.length - 1 ? " " : ""}
          </span>
        ))}
        <span className="text-amber-700" style={{ textShadow: "0 0 3px rgba(180, 83, 9, 0.4)" }}>
          {" |]"}
        </span>
      </div>

      {/* Base */}
      <div className="text-amber-700" style={{ textShadow: "0 0 3px rgba(180, 83, 9, 0.4)" }}>
        {art[zoom].base}
      </div>

      {/* Sand */}
      <div className="text-amber-200/50" style={{ textShadow: "0 0 2px rgba(253, 230, 138, 0.2)" }}>
        {art[zoom].sand}
      </div>

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .animate-twinkle { animation: twinkle 1s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
