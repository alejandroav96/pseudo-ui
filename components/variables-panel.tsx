"use client"

import type { Variable } from "@/lib/pseudocode-interpreter"

interface VariablesPanelProps {
  variables: Variable[]
  isRunning: boolean
}

export function VariablesPanel({ variables, isRunning }: VariablesPanelProps) {
  const formatValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return "null"
    if (type === "arreglo" && Array.isArray(value)) {
      return `[${value.join(", ")}]`
    }
    if (type === "cadena" || type === "caracter") {
      return `"${value}"`
    }
    if (type === "logico") {
      return value ? "VERDADERO" : "FALSO"
    }
    return String(value)
  }

  const getTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case "entero":
        return "text-blue-500"
      case "real":
        return "text-cyan-500"
      case "cadena":
      case "caracter":
        return "text-green-500"
      case "logico":
        return "text-purple-500"
      case "arreglo":
        return "text-amber-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="h-full flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <h3 className="text-sm font-medium">Variables</h3>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-green-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Ejecutando
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {variables.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              {isRunning ? "Sin variables definidas" : "Ejecuta el código para ver las variables"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {variables.map((variable) => (
              <div
                key={variable.name}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-mono uppercase ${getTypeColor(variable.type)}`}>
                    {variable.type.substring(0, 3)}
                  </span>
                  <span className="text-sm font-medium truncate">{variable.name}</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground ml-2 truncate max-w-[100px]">
                  {formatValue(variable.value, variable.type)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {variables.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground">
            {variables.length} variable{variables.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  )
}
