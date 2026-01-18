"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedAnglerfish({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [lureGlow, setLureGlow] = useState(1)
  const [lureSwing, setLureSwing] = useState(0)

  useEffect(() => {
    const glowInterval = setInterval(() => {
      setLureGlow(0.4 + Math.random() * 1)
    }, 150)

    const swingInterval = setInterval(() => {
      setLureSwing((s) => (s + 1) % 3)
    }, 600)

    return () => {
      clearInterval(glowInterval)
      clearInterval(swingInterval)
    }
  }, [])

  const lurePositions = ["  ", " ", ""]

  const artFrames = {
    far: () => (
      <div className="relative">
        <span className="text-yellow-300" style={{ textShadow: `0 0 ${15 * lureGlow}px #fef08a, 0 0 ${30 * lureGlow}px #fef08a` }}>
          {lurePositions[lureSwing]}*
        </span>
        <br />
        <span className="text-slate-500">{"\\(°0>=="}</span>
      </div>
    ),
    medium: () => (
      <div className="relative">
        <div className="h-6">
          <span className="text-yellow-300 transition-all" style={{
            textShadow: `0 0 ${15 * lureGlow}px #fef08a, 0 0 ${30 * lureGlow}px #fef08a, 0 0 ${45 * lureGlow}px rgba(254, 240, 138, 0.6)`,
            marginLeft: `${lureSwing * 4}px`,
          }}>
            {lurePositions[lureSwing]}*
          </span>
        </div>
        <div className="text-slate-500" style={{ textShadow: "0 0 2px rgba(100,100,120,0.5)" }}>{"        \\"}</div>
        <div className="relative">
          <span className="text-red-400" style={{ textShadow: "0 0 6px rgba(248, 113, 113, 0.6)" }}>{"   (°"}</span>
          <span className="text-slate-400">{"0"}</span>
          <span className="text-slate-500">{"===={"}</span>
          <span className="text-slate-600">{"^^^^"}</span>
          <span className="text-slate-500">{"}"}</span>
        </div>
        <div>
          <span className="text-slate-300" style={{ textShadow: "0 0 4px rgba(200,200,220,0.4)" }}>{"    \\|||/"}</span>
        </div>
      </div>
    ),
    close: () => (
      <div className="relative">
        <div className="h-8">
          <span className="text-yellow-300 transition-all text-2xl" style={{
            textShadow: `0 0 ${20 * lureGlow}px #fef08a, 0 0 ${40 * lureGlow}px #fef08a, 0 0 ${60 * lureGlow}px rgba(254, 240, 138, 0.7)`,
            marginLeft: `${lureSwing * 6}px`,
          }}>
            {lurePositions[lureSwing]}✦
          </span>
        </div>
        <div className="text-slate-500 text-lg" style={{ textShadow: "0 0 3px rgba(100,100,120,0.5)" }}>{"          \\"}</div>
        <div className="text-slate-500 text-lg">{"           \\"}</div>
        <div className="relative text-lg">
          <span className="text-red-400" style={{ textShadow: "0 0 10px rgba(248, 113, 113, 0.8)" }}>{"    (°"}</span>
          <span className="text-cyan-300" style={{ textShadow: "0 0 8px cyan" }}>{"O"}</span>
          <span className="text-slate-500">{"======{"}</span>
          <span className="text-slate-600" style={{ textShadow: "0 0 2px rgba(80,80,100,0.4)" }}>{"^^^^^^^"}</span>
          <span className="text-slate-500">{"}"}</span>
        </div>
        <div className="text-lg">
          <span className="text-slate-200" style={{ textShadow: "0 0 6px rgba(200,200,220,0.5)" }}>{"     \\|||||/"}</span>
        </div>
        <div className="text-lg">
          <span className="text-slate-400">{"      \\|||/"}</span>
        </div>
      </div>
    ),
  }

  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-base" : "text-lg"

  return (
    <div className={`relative font-mono ${fontSize} select-none`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(zoom === "close" ? 12 : zoom === "far" ? 4 : 8)].map((_, i) => (
          <span
            key={i}
            className="absolute text-yellow-200/40 animate-drift"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + (i % 2)}s`,
            }}
          >
            ·
          </span>
        ))}
      </div>

      {artFrames[zoom]()}

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); opacity: 0.2; }
          50% { transform: translate(10px, -15px); opacity: 0.6; }
        }
        .animate-drift { animation: drift 4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
