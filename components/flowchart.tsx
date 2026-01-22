"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { FlowchartNode } from "@/lib/pseudocode-interpreter"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface FlowchartProps {
  nodes: FlowchartNode[]
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 50
const NODE_SPACING_Y = 80

export function Flowchart({ nodes }: FlowchartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 })

  const drawNode = useCallback((
    ctx: CanvasRenderingContext2D,
    node: FlowchartNode,
    x: number,
    y: number,
    colors: { bg: string; border: string; text: string; decision: string; input: string; output: string }
  ) => {
    ctx.save()
    ctx.lineWidth = 2
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const halfWidth = NODE_WIDTH / 2
    const halfHeight = NODE_HEIGHT / 2

    // Different colors based on node type
    switch (node.type) {
      case 'start':
      case 'end':
        ctx.strokeStyle = '#10b981'
        ctx.fillStyle = '#10b981'
        ctx.beginPath()
        ctx.roundRect(x - halfWidth, y - halfHeight, NODE_WIDTH, NODE_HEIGHT, halfHeight)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px system-ui, sans-serif'
        ctx.fillText(node.text, x, y)
        break

      case 'process':
        ctx.strokeStyle = colors.border
        ctx.fillStyle = colors.bg
        ctx.beginPath()
        ctx.roundRect(x - halfWidth, y - halfHeight, NODE_WIDTH, NODE_HEIGHT, 8)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = colors.text
        break

      case 'decision':
        const diamondHeight = NODE_HEIGHT * 0.9
        const diamondWidth = NODE_WIDTH * 0.75
        ctx.strokeStyle = colors.decision
        ctx.fillStyle = colors.bg
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(x, y - diamondHeight)
        ctx.lineTo(x + diamondWidth, y)
        ctx.lineTo(x, y + diamondHeight)
        ctx.lineTo(x - diamondWidth, y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = colors.text
        break

      case 'input':
        const skew = 15
        ctx.strokeStyle = colors.input
        ctx.fillStyle = colors.bg
        ctx.beginPath()
        ctx.moveTo(x - halfWidth + skew, y - halfHeight)
        ctx.lineTo(x + halfWidth + skew, y - halfHeight)
        ctx.lineTo(x + halfWidth - skew, y + halfHeight)
        ctx.lineTo(x - halfWidth - skew, y + halfHeight)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = colors.text
        break

      case 'output':
        const skewOut = 15
        ctx.strokeStyle = colors.output
        ctx.fillStyle = colors.bg
        ctx.beginPath()
        ctx.moveTo(x - halfWidth - skewOut, y - halfHeight)
        ctx.lineTo(x + halfWidth - skewOut, y - halfHeight)
        ctx.lineTo(x + halfWidth + skewOut, y + halfHeight)
        ctx.lineTo(x - halfWidth + skewOut, y + halfHeight)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = colors.text
        break
    }

    // Draw text for non-terminal nodes
    if (node.type !== 'start' && node.type !== 'end') {
      ctx.font = '11px system-ui, sans-serif'
      let text = node.text
      const maxChars = node.type === 'decision' ? 24 : 20
      if (text.length > maxChars) {
        text = text.substring(0, maxChars - 2) + '...'
      }

      if (text.length > 12) {
        const words = text.split(' ')
        let line1 = ''
        let line2 = ''
        let onFirstLine = true

        for (const word of words) {
          if (onFirstLine && (line1 + ' ' + word).trim().length <= 12) {
            line1 = (line1 + ' ' + word).trim()
          } else {
            onFirstLine = false
            line2 = (line2 + ' ' + word).trim()
          }
        }

        if (line2) {
          ctx.fillText(line1, x, y - 7)
          ctx.fillText(line2.length > 12 ? line2.substring(0, 10) + '..' : line2, x, y + 7)
        } else {
          ctx.fillText(text, x, y)
        }
      } else {
        ctx.fillText(text, x, y)
      }
    }

    ctx.restore()
  }, [])

  const drawArrow = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string
  ) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    const angle = Math.atan2(toY - fromY, toX - fromX)
    const headLength = 10
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isDark = document.documentElement.classList.contains('dark')

    const colors = {
      bg: isDark ? '#1e293b' : '#ffffff',
      border: isDark ? '#3b82f6' : '#2563eb',
      text: isDark ? '#e2e8f0' : '#1e293b',
      arrow: isDark ? '#94a3b8' : '#64748b',
      canvas: isDark ? '#0f172a' : '#f1f5f9',
      decision: isDark ? '#f59e0b' : '#d97706',
      input: isDark ? '#8b5cf6' : '#7c3aed',
      output: isDark ? '#06b6d4' : '#0891b2'
    }

    // Calculate canvas dimensions
    const canvasHeight = nodes.length * NODE_SPACING_Y + 100
    const canvasWidth = NODE_WIDTH * 3

    canvas.width = canvasWidth * zoom
    canvas.height = canvasHeight * zoom

    canvas.style.width = `${canvasWidth * zoom}px`
    canvas.style.height = `${canvasHeight * zoom}px`

    ctx.scale(zoom, zoom)

    // Clear canvas
    ctx.fillStyle = colors.canvas
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw grid pattern
    ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0'
    ctx.lineWidth = 0.5
    for (let x = 0; x < canvasWidth; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }
    for (let y = 0; y < canvasHeight; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }

    // Calculate node positions
    const centerX = canvasWidth / 2
    const positions: Map<string, { x: number; y: number }> = new Map()

    nodes.forEach((node, index) => {
      positions.set(node.id, { x: centerX, y: 50 + index * NODE_SPACING_Y })
    })

    // Draw arrows
    nodes.forEach((node) => {
      const fromPos = positions.get(node.id)
      if (!fromPos) return

      node.children.forEach((childId) => {
        const toPos = positions.get(childId)
        if (!toPos) return

        let fromY = fromPos.y + NODE_HEIGHT / 2
        if (node.type === 'decision') {
          fromY = fromPos.y + NODE_HEIGHT * 0.9
        }
        const toY = toPos.y - NODE_HEIGHT / 2

        drawArrow(ctx, fromPos.x, fromY, toPos.x, toY, colors.arrow)
      })
    })

    // Draw nodes
    nodes.forEach((node) => {
      const pos = positions.get(node.id)
      if (!pos) return
      drawNode(ctx, node, pos.x, pos.y, colors)
    })
  }, [nodes, zoom, drawNode, drawArrow])

  useEffect(() => {
    draw()

    const observer = new MutationObserver(draw)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [draw])

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - scrollPos.x, y: e.clientY - scrollPos.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setScrollPos({ x: newX, y: newY })
    containerRef.current.scrollLeft = -newX
    containerRef.current.scrollTop = -newY
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 2))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5))
  const handleZoomReset = () => setZoom(1)

  if (nodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground text-sm">Ejecuta el código para ver el diagrama de flujo</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full flex flex-col rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-card border-b border-border">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Alejar"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Acercar"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomReset}
          className="p-1.5 rounded hover:bg-muted transition-colors ml-1"
          title="Restablecer zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500"></span> Inicio/Fin
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-blue-500"></span> Proceso
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rotate-45 border-2 border-amber-500"></span> Decisión
          </span>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/20 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="min-h-full min-w-full flex items-start justify-center p-4">
          <canvas
            ref={canvasRef}
            id="flowchart-canvas"
            className="rounded shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}

export function exportFlowchartAsImage(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.getElementById('flowchart-canvas') as HTMLCanvasElement
    if (!canvas) {
      resolve(null)
      return
    }

    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/png')
  })
}
