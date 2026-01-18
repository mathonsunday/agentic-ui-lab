"use client"

import { useEffect, useState } from "react"

type ZoomLevel = "far" | "medium" | "close"

export function AnimatedDeepSeaDiver({ zoom = "medium" }: { zoom?: ZoomLevel }) {
  const [bubbleFrame, setBubbleFrame] = useState(0)
  const [helmetGlow, setHelmetGlow] = useState(0.8)
  const [lightBeam, setLightBeam] = useState(true)

  useEffect(() => {
    const bubbleInterval = setInterval(() => {
      setBubbleFrame((b) => (b + 1) % 4)
    }, 500)

    const glowInterval = setInterval(() => {
      setHelmetGlow(0.6 + Math.random() * 0.4)
    }, 200)

    const lightInterval = setInterval(() => {
      setLightBeam(() => Math.random() > 0.2)
    }, 150)

    return () => {
      clearInterval(bubbleInterval)
      clearInterval(glowInterval)
      clearInterval(lightInterval)
    }
  }, [])

  const bubbles = [
    ["   o", "  O ", " o  ", "O   "],
    ["  o ", "   O", "o   ", " O  "],
    [" o  ", "o   ", "   O", "  o "],
  ]

  const fontSize = zoom === "far" ? "text-sm" : zoom === "close" ? "text-xl" : "text-lg"
  const bubbleCount = zoom === "far" ? 2 : zoom === "close" ? 4 : 3

  const artFrames = {
    far: () => (
      <>
        <div className="relative">
          <span className="text-yellow-300" style={{ textShadow: `0 0 ${8 * helmetGlow}px #fef08a` }}>{"[¤]"}</span>
        </div>
        <div className="text-amber-700">{"/o o\\"}</div>
        <div className="text-amber-800">{"|===|"}</div>
        <div className="text-slate-600">{" O O"}</div>
      </>
    ),
    medium: () => (
      <>
        <div className="relative">
          <span className="text-slate-500">{"    "}</span>
          <span className="text-yellow-300" style={{ textShadow: `0 0 ${12 * helmetGlow}px #fef08a, 0 0 ${24 * helmetGlow}px #fef08a` }}>
            {"[¤¤¤]"}
          </span>
        </div>
        {lightBeam && (
          <div className="absolute text-yellow-200/20 text-xs whitespace-pre" style={{ top: "0", left: "120px", textShadow: "0 0 10px rgba(254, 240, 138, 0.3)", transform: "rotate(-15deg)" }}>
            {"///"}
          </div>
        )}
        <div>
          <span className="text-slate-600">{"   "}</span>
          <span className="text-amber-700">/</span>
          <span className="text-slate-700">{"{"}</span>
          <span className="text-cyan-300" style={{ textShadow: "0 0 8px cyan" }}>o</span>
          <span className="text-slate-500"> </span>
          <span className="text-cyan-300" style={{ textShadow: "0 0 8px cyan" }}>o</span>
          <span className="text-slate-700">{"}"}</span>
          <span className="text-amber-700">\</span>
        </div>
        <div className="text-amber-800" style={{ textShadow: "0 0 2px rgba(146, 64, 14, 0.3)" }}>{"  |=|===|=|"}</div>
        <div className="text-amber-700/80">{"   \\|_|_|/"}</div>
        <div className="text-slate-600">{"    O   O"}</div>
        <div className="text-amber-200/30">{"  ~~~···~~~"}</div>
      </>
    ),
    close: () => (
      <>
        <div className="relative">
          <span className="text-slate-500">{"      "}</span>
          <span className="text-yellow-300 text-2xl" style={{ textShadow: `0 0 ${18 * helmetGlow}px #fef08a, 0 0 ${36 * helmetGlow}px #fef08a, 0 0 ${54 * helmetGlow}px rgba(254, 240, 138, 0.4)` }}>
            {"[¤¤¤¤¤]"}
          </span>
        </div>
        {lightBeam && (
          <div className="absolute text-yellow-200/30 text-sm whitespace-pre" style={{ top: "5px", left: "200px", textShadow: "0 0 15px rgba(254, 240, 138, 0.4)", transform: "rotate(-15deg)" }}>
            {"////"}
          </div>
        )}
        <div className="text-lg">
          <span className="text-slate-600">{"     "}</span>
          <span className="text-amber-700">/</span>
          <span className="text-slate-700">{"{"}</span>
          <span className="text-cyan-300" style={{ textShadow: "0 0 12px cyan, 0 0 24px rgba(0,255,255,0.5)" }}>O</span>
          <span className="text-slate-500">{"   "}</span>
          <span className="text-cyan-300" style={{ textShadow: "0 0 12px cyan, 0 0 24px rgba(0,255,255,0.5)" }}>O</span>
          <span className="text-slate-700">{"}"}</span>
          <span className="text-amber-700">\</span>
        </div>
        <div className="text-lg">
          <span className="text-amber-700">{"    /"}</span>
          <span className="text-slate-600">{"|"}</span>
          <span className="text-amber-700">{"~~~~~~"}</span>
          <span className="text-slate-600">{"|"}</span>
          <span className="text-amber-700">{"\\"}</span>
        </div>
        <div className="text-amber-800 text-lg" style={{ textShadow: "0 0 3px rgba(146, 64, 14, 0.4)" }}>{"    |=|=====|=|"}</div>
        <div className="text-amber-700/80 text-lg">{"     \\|__|__|/"}</div>
        <div className="text-slate-600 text-lg">{"      O     O"}</div>
        <div className="text-amber-200/30">{"    ~~~~~···~~~~~"}</div>
      </>
    ),
  }

  return (
    <div className={`font-mono ${fontSize} select-none relative`}>
      {/* Rising bubbles */}
      <div className={`absolute -top-4 right-0 w-16 ${zoom === "close" ? "h-28" : "h-20"}`}>
        {bubbles.slice(0, bubbleCount).map((track, trackIdx) => (
          <span
            key={trackIdx}
            className="absolute text-blue-300/60 animate-bubble"
            style={{
              right: `${trackIdx * 15}px`,
              animationDelay: `${trackIdx * 0.3}s`,
              textShadow: "0 0 6px rgba(147, 197, 253, 0.5)",
            }}
          >
            {track[bubbleFrame]}
          </span>
        ))}
      </div>

      {artFrames[zoom]()}

      {/* @ts-ignore */}
      <style jsx>{`
        @keyframes bubble {
          0% { transform: translateY(60px); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        .animate-bubble { animation: bubble 2.5s ease-out infinite; }
      `}</style>
    </div>
  )
}
