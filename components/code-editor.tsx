"use client"

import React, { useCallback, useRef, useEffect, useState } from "react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  lineNumbers?: boolean
}

const keywords = [
  "algoritmo", "finalgoritmo", "proceso", "finproceso",
  "definir", "como", "dimension",
  "leer", "escribir",
  "si", "entonces", "sino", "finsi",
  "mientras", "hacer", "finmientras",
  "para", "hasta", "con", "paso", "finpara",
  "segun", "finsegun",
  "funcion", "finfuncion", "subproceso", "finsubproceso",
  "entero", "real", "caracter", "cadena", "logico",
  "verdadero", "falso",
  "y", "o", "no", "mod",
]

// Inline styles for syntax highlighting
const styles = {
  keyword: "color: #3b82f6; font-weight: 600;",
  string: "color: #22c55e;",
  number: "color: #f97316;",
  comment: "color: #6b7280; font-style: italic;",
  operator: "color: #8b5cf6;",
}

// Build highlighted HTML for display only - completely separate from value
function buildHighlightedHtml(text: string): string {
  const lines = text.split("\n")
  
  return lines.map(line => {
    let result = ""
    let i = 0
    
    while (i < line.length) {
      // Check for comment
      if (line.slice(i, i + 2) === "//") {
        const comment = line.slice(i)
        result += `<span style="${styles.comment}">${escapeHtml(comment)}</span>`
        break
      }
      
      // Check for string
      if (line[i] === '"') {
        let end = line.indexOf('"', i + 1)
        if (end === -1) end = line.length - 1
        const str = line.slice(i, end + 1)
        result += `<span style="${styles.string}">${escapeHtml(str)}</span>`
        i = end + 1
        continue
      }
      
      // Check for word (keyword or identifier)
      if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ_]/.test(line[i])) {
        let word = ""
        while (i < line.length && /[a-zA-ZáéíóúÁÉÍÓÚñÑ_0-9]/.test(line[i])) {
          word += line[i]
          i++
        }
        if (keywords.includes(word.toLowerCase())) {
          result += `<span style="${styles.keyword}">${escapeHtml(word)}</span>`
        } else {
          result += escapeHtml(word)
        }
        continue
      }
      
      // Check for number
      if (/[0-9]/.test(line[i])) {
        let num = ""
        while (i < line.length && /[0-9.]/.test(line[i])) {
          num += line[i]
          i++
        }
        result += `<span style="${styles.number}">${escapeHtml(num)}</span>`
        continue
      }
      
      // Check for operators
      if (line.slice(i, i + 2) === "<-") {
        result += `<span style="${styles.operator}">&lt;-</span>`
        i += 2
        continue
      }
      
      if (line.slice(i, i + 2) === "<>" || line.slice(i, i + 2) === "<=" || line.slice(i, i + 2) === ">=") {
        result += `<span style="${styles.operator}">${escapeHtml(line.slice(i, i + 2))}</span>`
        i += 2
        continue
      }
      
      if ("<>=+-*/^".includes(line[i])) {
        result += `<span style="${styles.operator}">${escapeHtml(line[i])}</span>`
        i++
        continue
      }
      
      // Regular character
      result += escapeHtml(line[i])
      i++
    }
    
    return result
  }).join("\n")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function CodeEditor({ value, onChange, lineNumbers = true }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  // Update line count when value changes
  useEffect(() => {
    setLineCount(Math.max(1, value.split("\n").length))
  }, [value])

  // Handle text change - just pass plain text directly
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }, [onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + "    " + value.substring(end)
      onChange(newValue)
      
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      })
    }
  }, [value, onChange])

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Editor Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Line Numbers */}
        {lineNumbers && (
          <div
            ref={lineNumbersRef}
            className="flex-shrink-0 select-none overflow-hidden bg-muted/50 px-3 py-3 text-right font-mono text-sm text-muted-foreground border-r border-border"
            style={{ lineHeight: "1.5" }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="h-[21px]">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Editor Container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Syntax Highlight Overlay - visual only, no interaction */}
          <pre
            ref={highlightRef}
            className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-sm text-foreground"
            style={{ lineHeight: "1.5" }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(value) + "\n" }}
          />

          {/* Textarea - transparent text, visible caret */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-sm outline-none selection:bg-primary/30"
            style={{ 
              lineHeight: "1.5", 
              caretColor: "var(--foreground)",
              color: "transparent",
              WebkitTextFillColor: "transparent"
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}
