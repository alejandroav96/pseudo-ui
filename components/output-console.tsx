"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle2, Terminal } from "lucide-react"

interface OutputConsoleProps {
  output: string[]
  errors: string[]
  isRunning: boolean
}

export function OutputConsole({ output, errors, isRunning }: OutputConsoleProps) {
  const hasContent = output.length > 0 || errors.length > 0

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Consola de Salida</span>
        {isRunning && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            Ejecutando...
          </span>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {!hasContent && !isRunning ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Ejecuta el código para ver la salida aquí</p>
          </div>
        ) : (
          <div className="space-y-2 font-mono text-sm">
            {output.map((line, index) => (
              <div key={`out-${index}`} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <span className="text-foreground whitespace-pre-wrap">{line}</span>
              </div>
            ))}
            
            {errors.map((error, index) => (
              <div key={`err-${index}`} className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                <span className="text-destructive whitespace-pre-wrap">{error}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
