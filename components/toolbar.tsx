"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Play,
  Square,
  Save,
  FolderOpen,
  FileText,
  Moon,
  Sun,
  ImageIcon,
  Trash2,
  Upload,
  Download,
} from "lucide-react"

interface ToolbarProps {
  onRun: () => void
  onStop: () => void
  onSave: () => void
  onLoad: () => void
  onNew: () => void
  onExportImage: () => void
  onExportFile: () => void
  onImportFile: () => void
  onClear: () => void
  isRunning: boolean
  isDark: boolean
  onToggleTheme: () => void
}

export function Toolbar({
  onRun,
  onStop,
  onSave,
  onLoad,
  onNew,
  onExportImage,
  onExportFile,
  onImportFile,
  onClear,
  isRunning,
  isDark,
  onToggleTheme,
}: ToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        <div className="flex items-center gap-1 border-r border-border pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRun}
                disabled={isRunning}
                className="h-8 w-8 p-0 hover:bg-accent/20 hover:text-accent"
              >
                <Play className="h-4 w-4" />
                <span className="sr-only">Ejecutar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ejecutar (F5)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                disabled={!isRunning}
                className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
              >
                <Square className="h-4 w-4" />
                <span className="sr-only">Detener</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Detener</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 border-r border-border pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNew}
                className="h-8 w-8 p-0"
              >
                <FileText className="h-4 w-4" />
                <span className="sr-only">Nuevo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nuevo archivo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                className="h-8 w-8 p-0"
              >
                <Save className="h-4 w-4" />
                <span className="sr-only">Guardar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Guardar (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoad}
                className="h-8 w-8 p-0"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="sr-only">Cargar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cargar guardado</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 border-r border-border pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportFile}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Exportar archivo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar archivo (.psc)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onImportFile}
                className="h-8 w-8 p-0"
              >
                <Upload className="h-4 w-4" />
                <span className="sr-only">Importar archivo</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Importar archivo (.psc)</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 border-r border-border pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportImage}
                className="h-8 w-8 p-0"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="sr-only">Exportar diagrama</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descargar diagrama</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Limpiar consola</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpiar consola</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              className="h-8 w-8 p-0"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Cambiar tema</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? "Modo claro" : "Modo oscuro"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
