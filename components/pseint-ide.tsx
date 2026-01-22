"use client"

import React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { CodeEditor } from "./code-editor"
import { Flowchart, exportFlowchartAsImage } from "./flowchart"
import { OutputConsole } from "./output-console"
import { InputModal } from "./input-modal"
import { Toolbar } from "./toolbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PseudocodeInterpreter, defaultCode } from "@/lib/pseudocode-interpreter"
import type { FlowchartNode, Variable } from "@/lib/pseudocode-interpreter"
import { VariablesPanel } from "./variables-panel"
import { Code2, GitBranch, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

const STORAGE_KEY = "pseudo-ide-saved-code"
const THEME_KEY = "pseudo-ide-theme"

export function PseIntIDE() {
  const [code, setCode] = useState(defaultCode)
  const [output, setOutput] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [flowchart, setFlowchart] = useState<FlowchartNode[]>([])
  const [variables, setVariables] = useState<Variable[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [activeTab, setActiveTab] = useState("editor")
  const [inputModalOpen, setInputModalOpen] = useState(false)
  const [inputPrompt, setInputPrompt] = useState("")
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFileName, setExportFileName] = useState("programa")
  const inputResolverRef = useRef<((value: string) => void) | null>(null)
  const interpreterRef = useRef<PseudocodeInterpreter | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === "dark") {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  // Load saved code from localStorage - clean any corrupted data
  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY)
    if (savedCode) {
      // Check if code contains HTML tags (corrupted)
      if (/<[^>]*>/.test(savedCode) || savedCode.includes('&lt;') || savedCode.includes('&gt;')) {
        // Data is corrupted, reset to default
        localStorage.removeItem(STORAGE_KEY)
        setCode(defaultCode)
        console.log('[v0] Corrupted localStorage data detected and cleaned')
      } else {
        setCode(savedCode)
      }
    }
  }, [])

  // Auto-save to localStorage when code changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only save if code is clean (no HTML)
      if (!/<[^>]*>/.test(code)) {
        localStorage.setItem(STORAGE_KEY, code)
      }
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [code])

  // Just pass through - the editor should only give us plain text
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const newValue = !prev
      if (newValue) {
        document.documentElement.classList.add("dark")
        localStorage.setItem(THEME_KEY, "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem(THEME_KEY, "light")
      }
      return newValue
    })
  }, [])

  const handleInput = useCallback((prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      inputResolverRef.current = resolve
      setInputPrompt(prompt)
      setInputModalOpen(true)
    })
  }, [])

  const handleInputSubmit = useCallback((value: string) => {
    setInputModalOpen(false)
    if (inputResolverRef.current) {
      inputResolverRef.current(value)
      inputResolverRef.current = null
    }
  }, [])

  const runCode = useCallback(async () => {
    setIsRunning(true)
    setOutput([])
    setErrors([])
    setFlowchart([])
    setVariables([])

    const interpreter = new PseudocodeInterpreter()
    interpreterRef.current = interpreter
    interpreter.setInputCallback(handleInput)
    interpreter.setVariableChangeCallback((vars) => setVariables([...vars]))

    try {
      const result = await interpreter.execute(code)
      setOutput(result.output)
      setErrors(result.errors)
      setFlowchart(result.flowchart)

      if (result.errors.length === 0) {
        toast({
          title: "Ejecución completada",
          description: "El programa se ejecutó correctamente",
        })
      }
    } catch (error) {
      setErrors([`Error de ejecución: ${error}`])
    } finally {
      setIsRunning(false)
    }
  }, [code, handleInput, toast])

  const stopExecution = useCallback(() => {
    setIsRunning(false)
    setInputModalOpen(false)
    inputResolverRef.current = null
    toast({
      title: "Ejecución detenida",
      description: "El programa fue interrumpido",
      variant: "destructive",
    })
  }, [toast])

  const saveCode = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, code)
    toast({
      title: "Código guardado",
      description: "Tu código ha sido guardado en el navegador",
    })
  }, [code, toast])

  const loadCode = useCallback(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY)
    if (savedCode) {
      setCode(savedCode)
      toast({
        title: "Código cargado",
        description: "Se ha restaurado tu código guardado",
      })
    } else {
      toast({
        title: "Sin datos guardados",
        description: "No hay código guardado previamente",
        variant: "destructive",
      })
    }
  }, [toast])

  const newFile = useCallback(() => {
    // Clear localStorage to remove any corrupted data
    localStorage.removeItem(STORAGE_KEY)
    setCode(defaultCode)
    setOutput([])
    setErrors([])
    setFlowchart([])
    toast({
      title: "Nuevo archivo",
      description: "Se ha creado un nuevo archivo con código de ejemplo",
    })
  }, [toast])

  const exportImage = useCallback(async () => {
    if (flowchart.length === 0) {
      toast({
        title: "Sin diagrama",
        description: "Primero ejecuta el código para generar el diagrama",
        variant: "destructive",
      })
      return
    }

    // Switch to flowchart tab if not already there
    setActiveTab("flowchart")
    
    // Wait for tab to render
    await new Promise((resolve) => setTimeout(resolve, 100))

    const blob = await exportFlowchartAsImage()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `diagrama-flujo-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Imagen descargada",
        description: "El diagrama de flujo se ha guardado como imagen PNG",
      })
    }
  }, [flowchart, toast])

  const clearConsole = useCallback(() => {
    setOutput([])
    setErrors([])
    toast({
      title: "Consola limpiada",
      description: "Se ha limpiado la consola de salida",
    })
  }, [toast])

  const exportFile = useCallback(() => {
    setExportFileName("programa")
    setExportModalOpen(true)
  }, [])

  const handleExportConfirm = useCallback(() => {
    try {
      const fileName = exportFileName.trim() || "programa"
      const dataUrl = "data:text/plain;charset=utf-8," + encodeURIComponent(code)
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `${fileName}.psc`
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setExportModalOpen(false)
      toast({
        title: "Archivo exportado",
        description: `El archivo "${fileName}.psc" se ha descargado correctamente`,
      })
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar el archivo",
        variant: "destructive",
      })
    }
  }, [code, exportFileName, toast])

  const importFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setCode(content)
        toast({
          title: "Archivo importado",
          description: `Se ha cargado el archivo "${file.name}"`,
        })
      }
    }
    reader.onerror = () => {
      toast({
        title: "Error al importar",
        description: "No se pudo leer el archivo",
        variant: "destructive",
      })
    }
    reader.readAsText(file)
    
    // Reset input to allow importing the same file again
    e.target.value = ""
  }, [toast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault()
        if (!isRunning) runCode()
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        saveCode()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isRunning, runCode, saveCode])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Code2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Pseudo Valentina Obando</h1>
            <p className="text-xs text-muted-foreground">Editor de Pseudocódigo</p>
          </div>
        </div>

        <Toolbar
          onRun={runCode}
          onStop={stopExecution}
          onSave={saveCode}
          onLoad={loadCode}
          onNew={newFile}
          onExportImage={exportImage}
          onExportFile={exportFile}
          onImportFile={importFile}
          onClear={clearConsole}
          isRunning={isRunning}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Editor & Flowchart */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <div className="border-b border-border bg-muted/30 px-4">
              <TabsList className="h-10 bg-transparent">
                <TabsTrigger
                  value="editor"
                  className="gap-2 data-[state=active]:bg-card"
                >
                  <Code2 className="h-4 w-4" />
                  Editor
                </TabsTrigger>
                <TabsTrigger
                  value="flowchart"
                  className="gap-2 data-[state=active]:bg-card"
                >
                  <GitBranch className="h-4 w-4" />
                  Diagrama de Flujo
                </TabsTrigger>
                <TabsTrigger
                  value="help"
                  className="gap-2 data-[state=active]:bg-card"
                >
                  <BookOpen className="h-4 w-4" />
                  Ayuda
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="mt-0 flex-1 p-4">
              <CodeEditor value={code} onChange={handleCodeChange} />
            </TabsContent>

            <TabsContent value="flowchart" className="mt-0 flex-1 p-4">
              {flowchart.length > 0 ? (
                <Flowchart nodes={flowchart} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                  <div className="text-center">
                    <GitBranch className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ejecuta el código para ver el diagrama de flujo
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="help" className="mt-0 flex-1 overflow-auto p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h2 className="text-lg font-semibold text-foreground">Guía de Pseudocódigo</h2>
                
                <h3 className="text-base font-medium text-foreground mt-4">Estructura Basica</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Algoritmo NombrePrograma
    // Tu codigo aqui
FinAlgoritmo`}
                </pre>
                <p className="text-xs text-muted-foreground mt-1">Tambien se acepta: Proceso/FinProceso</p>

                <h3 className="text-base font-medium text-foreground mt-4">Variables</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Definir numero Como Entero;
Definir nombre Como Cadena;
Definir decimal Como Real;
Definir bandera Como Logico;`}
                </pre>
                <p className="text-xs text-muted-foreground mt-1">El punto y coma al final es opcional</p>

                <h3 className="text-base font-medium text-foreground mt-4">Entrada/Salida</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Escribir "Mensaje"
Leer variable`}
                </pre>

                <h3 className="text-base font-medium text-foreground mt-4">Condicionales</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Si condicion Entonces
    // codigo si verdadero
SiNo
    // codigo si falso
FinSi`}
                </pre>
                <p className="text-xs text-muted-foreground mt-1">Se acepta con o sin punto y coma: Si edad {'>'} 18; Entonces</p>

                <h3 className="text-base font-medium text-foreground mt-4">Bucle Mientras</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Mientras condicion Hacer
    // código del bucle
FinMientras`}
                </pre>

                <h3 className="text-base font-medium text-foreground mt-4">Bucle Para</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Para i <- 1 Hasta 10 Con Paso 1
    // código del bucle
FinPara`}
                </pre>

                <h3 className="text-base font-medium text-foreground mt-4">Segun (Switch)</h3>
                <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
{`Segun variable Hacer
    1:
        // caso 1
    2, 3:
        // casos 2 y 3
    De Otro Modo:
        // caso por defecto
FinSegun`}
                </pre>
                <p className="text-xs text-muted-foreground mt-1">Los casos pueden tener múltiples valores separados por coma</p>

                <h3 className="text-base font-medium text-foreground mt-4">Operadores</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">{'<-'}</code> Asignación</li>
                  <li><code className="bg-muted px-1 rounded">+, -, *, /</code> Aritméticos</li>
                  <li><code className="bg-muted px-1 rounded">^</code> Potencia</li>
                  <li><code className="bg-muted px-1 rounded">MOD</code> Módulo</li>
                  <li><code className="bg-muted px-1 rounded">{'=, <>, <, >, <=, >='}</code> Comparación</li>
                  <li><code className="bg-muted px-1 rounded">Y, O, NO</code> Lógicos</li>
                </ul>

                <h3 className="text-base font-medium text-foreground mt-4">Atajos de Teclado</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-muted px-1 rounded">F5</code> Ejecutar</li>
                  <li><code className="bg-muted px-1 rounded">Ctrl+S</code> Guardar</li>
                  <li><code className="bg-muted px-1 rounded">Tab</code> Indentar</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Output & Variables */}
        <div className="w-96 flex-shrink-0 p-4 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <OutputConsole output={output} errors={errors} isRunning={isRunning} />
          </div>
          <div className="h-48">
            <VariablesPanel variables={variables} isRunning={isRunning} />
          </div>
        </div>
      </div>

      {/* Hidden file input for importing */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".psc,.txt"
        className="hidden"
      />

      {/* Input Modal */}
      <InputModal
        open={inputModalOpen}
        prompt={inputPrompt}
        onSubmit={handleInputSubmit}
      />

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar archivo</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              placeholder="Nombre del archivo"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleExportConfirm()}
            />
            <span className="text-muted-foreground">.psc</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExportConfirm}>
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
