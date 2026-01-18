"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedBioluminescentFish({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [frame, setFrame] = useState(0)
  const [glowIntensity, setGlowIntensity] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 3)
      setGlowIntensity(0.6 + Math.random() * 0.8)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  const fishFrames = {
    far: [`><>{*}><>`, `><>{✦}><>`, `><>{★}><>`],
    medium: [`<°)))><{*}><(((°>`, `<°)))><{✦}><(((°>`, `<°)))><{★}><(((°>`],
    close: [
      `    .·*·.\n  <°)))>411\n    ><{*}><\n  <(((°>411\n    '·*·'`,
      `    .·✦·.\n  <°)))>411\n    ><{✦}><\n  <(((°>411\n    '·✦·'`,
      `    .·★·.\n  <°)))>411\n    ><{★}><\n  <(((°>411\n    '·★·'`,
    ],
  }

  const particles = {
    far: [{ x: 10, y: -5, delay: 0 }, { x: 40, y: -8, delay: 0.5 }],
    medium: [
      { x: 20, y: -10, delay: 0 },
      { x: 60, y: -5, delay: 0.3 },
      { x: 100, y: -12, delay: 0.6 },
      { x: 140, y: -8, delay: 0.9 },
      { x: 180, y: -15, delay: 1.2 },
    ],
    close: [
      { x: 30, y: -15, delay: 0 },
      { x: 70, y: -10, delay: 0.2 },
      { x: 110, y: -20, delay: 0.4 },
      { x: 150, y: -12, delay: 0.6 },
      { x: 190, y: -18, delay: 0.8 },
      { x: 50, y: -25, delay: 1.0 },
      { x: 130, y: -8, delay: 1.2 },
    ],
  }

  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-xl" : "text-lg"

  return (
    <div className={`relative font-mono ${fontSize} select-none`}>
      {particles[zoom].map((p, i) => (
        <span
          key={i}
          className="absolute text-cyan-300 animate-float"
          style={{
            left: p.x,
            top: p.y,
            animationDelay: `${p.delay}s`,
            textShadow: "0 0 8px cyan, 0 0 16px cyan",
          }}
        >
          {["·", "*", "✦"][i % 3]}
        </span>
      ))}

      <div className="relative whitespace-pre">
        {fishFrames[zoom][frame].split("").map((char, i) => {
          const isGlow = ["{", "*", "✦", "★", "}", "·", "'", "."].includes(char)
          const isFish = ["<", ">", "°", "(", ")"].includes(char)

          return (
            <span
              key={i}
              className={`inline-block transition-all duration-300 ${
                isGlow ? "text-cyan-300" : isFish ? "text-blue-400" : "text-slate-300"
              }`}
              style={{
                textShadow: isGlow
                  ? `0 0 ${10 * glowIntensity}px cyan, 0 0 ${20 * glowIntensity}px cyan, 0 0 ${30 * glowIntensity}px rgba(0, 255, 255, 0.5)`
                  : isFish
                    ? "0 0 4px rgba(96, 165, 250, 0.5)"
                    : "none",
                transform: isGlow ? `scale(${0.9 + glowIntensity * 0.2})` : "none",
              }}
            >
              {char}
            </span>
          )
        })}
      </div>

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(5px); opacity: 1; }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
