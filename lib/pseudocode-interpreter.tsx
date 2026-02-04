export interface FlowchartNode {
  id: string
  type: 'start' | 'end' | 'process' | 'decision' | 'input' | 'output'
  text: string
  children: string[]
}

export interface ExecutionResult {
  output: string[]
  errors: string[]
  flowchart: FlowchartNode[]
}

export interface Variable {
  name: string
  type: string
  value: unknown
}

export class PseudocodeInterpreter {
  private variables: Map<string, Variable> = new Map()
  private output: string[] = []
  private errors: string[] = []
  private flowchart: FlowchartNode[] = []
  private nodeCounter = 0
  private inputCallback: ((prompt: string) => Promise<string>) | null = null
  private variableChangeCallback: ((variables: Variable[]) => void) | null = null
  private hasError = false

  setInputCallback(callback: (prompt: string) => Promise<string>) {
    this.inputCallback = callback
  }

  setVariableChangeCallback(callback: (variables: Variable[]) => void) {
    this.variableChangeCallback = callback
  }

  private notifyVariableChange() {
    if (this.variableChangeCallback) {
      this.variableChangeCallback(Array.from(this.variables.values()))
    }
  }

  async execute(code: string): Promise<ExecutionResult> {
    this.reset()
    
    // Preprocess: remove semicolons at end of lines, normalize syntax
    const lines = code.split('\n')
      .map(line => line.trim())
      .map(line => line.replace(/;$/g, '')) // Remove trailing semicolons
      .map(line => line.replace(/;\s*(Entonces|entonces)/gi, ' $1')) // Handle "Si x > 18; Entonces"
      .filter(line => line && !line.startsWith('//'))
    
    // Add start node
    this.addFlowchartNode('start', 'Inicio')
    
    let i = 0
    while (i < lines.length && !this.hasError) {
      try {
        i = await this.executeLine(lines, i)
      } catch (error) {
        this.errors.push(`Error en línea ${i + 1}: ${error}`)
        this.hasError = true
      }
    }
    
    // Add end node
    this.addFlowchartNode('end', 'Fin')
    
    // Connect nodes sequentially
    for (let j = 0; j < this.flowchart.length - 1; j++) {
      this.flowchart[j].children.push(this.flowchart[j + 1].id)
    }
    
    return {
      output: this.output,
      errors: this.errors,
      flowchart: this.flowchart
    }
  }

  private reset() {
    this.variables.clear()
    this.output = []
    this.errors = []
    this.flowchart = []
    this.nodeCounter = 0
    this.hasError = false
  }

  private addFlowchartNode(type: FlowchartNode['type'], text: string): string {
    const id = `node_${this.nodeCounter++}`
    this.flowchart.push({ id, type, text, children: [] })
    return id
  }

  private async executeLine(lines: string[], index: number): Promise<number> {
    const line = lines[index].toLowerCase()
    const originalLine = lines[index]
    
    // Skip algorithm definition
    if (line.startsWith('algoritmo') || line.startsWith('proceso')) {
      return index + 1
    }
    
    if (line.startsWith('finalgoritmo') || line.startsWith('finproceso')) {
      return index + 1
    }
    
    // Variable definition - support accented characters like ñ, á, é, etc.
    if (line.startsWith('definir')) {
      const match = originalLine.match(/definir\s+([\w\u00C0-\u024F]+)\s+como\s+(\w+)/i)
      if (match) {
        const [, name, type] = match
        this.variables.set(name.toLowerCase(), { name, type: type.toLowerCase(), value: this.getDefaultValue(type) })
        this.notifyVariableChange()
        this.addFlowchartNode('process', `Definir ${name} como ${type}`)
      }
      return index + 1
    }
    
    // Dimension (arrays)
    if (line.startsWith('dimension')) {
      const match = originalLine.match(/dimension\s+(\w+)\[(\d+)\]/i)
      if (match) {
        const [, name, size] = match
        this.variables.set(name.toLowerCase(), { name, type: 'arreglo', value: new Array(parseInt(size)).fill(0) })
        this.notifyVariableChange()
        this.addFlowchartNode('process', `Dimension ${name}[${size}]`)
      }
      return index + 1
    }
    
    // Input - support accented characters
    if (line.startsWith('leer')) {
      const match = originalLine.match(/leer\s+(.+)/i)
      if (match) {
        const varNames = match[1].split(',').map(v => v.trim().replace(/;$/, ''))
        for (const varName of varNames) {
          const existingVar = this.variables.get(varName.toLowerCase())
          if (!existingVar) {
            this.errors.push(`Error: La variable "${varName}" no ha sido definida. Use "Definir ${varName} Como Tipo" primero.`)
            this.hasError = true
            return index + 1
          }
          let value: string | number = ''
          if (this.inputCallback) {
            value = await this.inputCallback(`Ingrese valor para ${varName}:`)
          }
          if (existingVar.type === 'entero' || existingVar.type === 'real') {
            existingVar.value = parseFloat(value) || 0
          } else if (existingVar.type === 'logico') {
            existingVar.value = /^\s*verdadero\s*$/i.test(value)
          } else {
            existingVar.value = value
          }
          this.notifyVariableChange()
        }
        this.addFlowchartNode('input', `Leer ${match[1]}`)
      }
      return index + 1
    }
    
    // Output
    if (line.startsWith('escribir')) {
      const match = originalLine.match(/escribir\s+(.+)/i)
      if (match) {
        const result = this.evaluateExpression(match[1])
        this.output.push(String(result))
        this.addFlowchartNode('output', `Escribir ${match[1]}`)
      }
      return index + 1
    }
    
    // While loop
    if (line.startsWith('mientras')) {
      const match = originalLine.match(/mientras\s+(.+)\s+hacer/i)
      if (match) {
        const condition = match[1]
        this.addFlowchartNode('decision', `Mientras ${condition}`)
        
        // Find FinMientras
        let depth = 1
        let endIndex = index + 1
        while (endIndex < lines.length && depth > 0) {
          const checkLine = lines[endIndex].toLowerCase()
          if (checkLine.startsWith('mientras')) depth++
          if (checkLine.startsWith('finmientras')) depth--
          endIndex++
        }
        
        // Execute loop (limited iterations for safety)
        let iterations = 0
        const maxIterations = 100
        while (this.evaluateCondition(condition) && iterations < maxIterations && !this.hasError) {
          let j = index + 1
          while (j < endIndex - 1 && !this.hasError) {
            j = await this.executeLine(lines, j)
          }
          iterations++
        }
        
        return endIndex
      }
    }
    
    // For loop
    if (line.startsWith('para')) {
      const match = originalLine.match(/para\s+(\w+)\s*<-\s*(\d+)\s+hasta\s+(\d+)(?:\s+con\s+paso\s+(\d+))?/i)
      if (match) {
        const [, varName, startVal, endVal, stepVal = '1'] = match
        const start = parseInt(startVal)
        const end = parseInt(endVal)
        const step = parseInt(stepVal)
        
        this.addFlowchartNode('decision', `Para ${varName} <- ${start} Hasta ${end}`)
        
        // Find FinPara
        let depth = 1
        let endIndex = index + 1
        while (endIndex < lines.length && depth > 0) {
          const checkLine = lines[endIndex].toLowerCase()
          if (checkLine.startsWith('para')) depth++
          if (checkLine.startsWith('finpara')) depth--
          endIndex++
        }
        
        // Execute loop
        for (let v = start; v <= end && !this.hasError; v += step) {
          this.variables.set(varName.toLowerCase(), { name: varName, type: 'entero', value: v })
          this.notifyVariableChange()
          let j = index + 1
          while (j < endIndex - 1 && !this.hasError) {
            j = await this.executeLine(lines, j)
          }
        }
        
        return endIndex
      }
    }

    // Segun (switch-case) statement
    if (line.startsWith('segun')) {
      const match = originalLine.match(/segun\s+([\w\u00C0-\u024F]+)\s+hacer/i)
      if (match) {
        const varName = match[1]
        const variable = this.variables.get(varName.toLowerCase())

        if (!variable) {
          this.errors.push(`Error: La variable "${varName}" no ha sido definida.`)
          this.hasError = true
          return index + 1
        }

        const varValue = variable.value
        this.addFlowchartNode('decision', `Segun ${varName}`)

        // Find FinSegun and collect all cases
        let depth = 1
        let endIndex = index + 1
        const cases: { values: (string | number)[]; startLine: number; endLine: number }[] = []
        let defaultCase: { startLine: number; endLine: number } | null = null
        let currentCaseStart = -1
        let currentCaseValues: (string | number)[] = []

        while (endIndex < lines.length && depth > 0) {
          const checkLine = lines[endIndex].toLowerCase().trim()
          const checkOriginal = lines[endIndex].trim()

          if (checkLine.startsWith('segun')) depth++
          if (checkLine.startsWith('finsegun')) {
            depth--
            if (depth === 0 && currentCaseStart !== -1) {
              // Save the last case
              if (currentCaseValues.length > 0) {
                cases.push({ values: currentCaseValues, startLine: currentCaseStart, endLine: endIndex })
              } else if (defaultCase && defaultCase.startLine === currentCaseStart) {
                defaultCase.endLine = endIndex
              }
            }
          }

          if (depth === 1) {
            // Check for case pattern: "valor1, valor2:" or just "valor:"
            const caseMatch = checkOriginal.match(/^([\d\w\u00C0-\u024F\s,'"]+):$/i)
            if (caseMatch && !checkLine.startsWith('de otro modo')) {
              // Save previous case if exists
              if (currentCaseStart !== -1 && currentCaseValues.length > 0) {
                cases.push({ values: currentCaseValues, startLine: currentCaseStart, endLine: endIndex })
              }

              // Parse case values (can be comma-separated)
              const valuesStr = caseMatch[1]
              currentCaseValues = valuesStr.split(',').map(v => {
                const trimmed = v.trim()
                // Check if it's a string literal
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                    (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                  return trimmed.slice(1, -1)
                }
                // Check if it's a number
                const num = parseFloat(trimmed)
                if (!isNaN(num)) return num
                return trimmed
              })
              currentCaseStart = endIndex + 1
            }

            // Check for "De Otro Modo:" (default case)
            if (checkLine.startsWith('de otro modo')) {
              // Save previous case if exists
              if (currentCaseStart !== -1 && currentCaseValues.length > 0) {
                cases.push({ values: currentCaseValues, startLine: currentCaseStart, endLine: endIndex })
              }
              currentCaseValues = []
              defaultCase = { startLine: endIndex + 1, endLine: -1 }
              currentCaseStart = endIndex + 1
            }
          }

          endIndex++
        }

        // Find matching case and execute
        let executed = false
        for (const caseItem of cases) {
          const matches = caseItem.values.some(v => {
            if (typeof v === 'number' && typeof varValue === 'number') {
              return v === varValue
            }
            return String(v).toLowerCase() === String(varValue).toLowerCase()
          })

          if (matches) {
            this.addFlowchartNode('process', `Caso ${caseItem.values.join(', ')}`)
            let j = caseItem.startLine
            while (j < caseItem.endLine && !this.hasError) {
              j = await this.executeLine(lines, j)
            }
            executed = true
            break
          }
        }

        // Execute default case if no match found
        if (!executed && defaultCase && defaultCase.endLine !== -1) {
          this.addFlowchartNode('process', 'De Otro Modo')
          let j = defaultCase.startLine
          while (j < defaultCase.endLine && !this.hasError) {
            j = await this.executeLine(lines, j)
          }
        }

        return endIndex
      }
    }

    // If statement - handle "Si ... Entonces", "SiNo", and "SiNo Si ... Entonces" (else if)
    if (line.startsWith('si') && !line.startsWith('sino')) {
      // Match "Si condition Entonces" - condition can have operators like >, <, >=, etc.
      const match = originalLine.match(/si\s+(.+?)\s+entonces/i)
      if (match) {
        const condition = match[1].trim()
        const conditionResult = this.evaluateCondition(condition)
        this.addFlowchartNode('decision', `Si ${condition}`)
        
        // Find SiNo/Sino, SiNo Si, and FinSi
        let depth = 1
        let sinoIndex = -1
        let endIndex = index + 1
        
        while (endIndex < lines.length && depth > 0) {
          const checkLine = lines[endIndex].toLowerCase().trim()
          // Count nested Si statements (but not SiNo or SiNo Si)
          if (/^si\s+/.test(checkLine) && checkLine.includes('entonces')) depth++
          if (checkLine === 'finsi') depth--
          // Match "Sino" or "SiNo" or "SiNo Si" at depth 1 (only capture first one)
          if (depth === 1 && sinoIndex === -1 && (checkLine === 'sino' || /^sino\s+si\s+/.test(checkLine))) {
            sinoIndex = endIndex
          }
          endIndex++
        }
        
        if (conditionResult) {
          const execEnd = sinoIndex > 0 ? sinoIndex : endIndex - 1
          let j = index + 1
          while (j < execEnd && !this.hasError) {
            j = await this.executeLine(lines, j)
          }
        } else if (sinoIndex > 0) {
          // Check if it's "SiNo Si" (else if)
          const sinoLine = lines[sinoIndex].toLowerCase().trim()
          if (/^sino\s+si\s+/.test(sinoLine)) {
            // Execute the "SiNo Si" as if it were a new Si statement
            let j = sinoIndex
            while (j < endIndex - 1 && !this.hasError) {
              j = await this.executeLine(lines, j)
            }
          } else {
            // Regular SiNo
            let j = sinoIndex + 1
            while (j < endIndex - 1 && !this.hasError) {
              j = await this.executeLine(lines, j)
            }
          }
        }
        
        return endIndex
      }
    }

    // Handle "SiNo Si" (else if) as a standalone Si - check with regex for flexibility
    if (/^sino\s+si\s+/i.test(line)) {
      const match = originalLine.match(/sino\s+si\s+(.+?)\s+entonces/i)
      if (match) {
        const condition = match[1].trim()
        const conditionResult = this.evaluateCondition(condition)
        this.addFlowchartNode('decision', `SiNo Si ${condition}`)
        
        // Find next SiNo or FinSi at same level
        let depth = 1
        let sinoIndex = -1
        let endIndex = index + 1
        
        while (endIndex < lines.length && depth > 0) {
          const checkLine = lines[endIndex].toLowerCase().trim()
          if (/^si\s+/.test(checkLine) && checkLine.includes('entonces')) depth++
          if (checkLine === 'finsi') depth--
          if (depth === 1 && (checkLine === 'sino' || /^sino\s+si\s+/.test(checkLine))) {
            sinoIndex = endIndex
            break
          }
          endIndex++
        }
        
        // Find the actual FinSi
        let finsiIndex = index + 1
        let finsiDepth = 1
        while (finsiIndex < lines.length && finsiDepth > 0) {
          const checkLine = lines[finsiIndex].toLowerCase().trim()
          if (checkLine.startsWith('si ') && checkLine.includes('entonces')) finsiDepth++
          if (checkLine === 'finsi') finsiDepth--
          finsiIndex++
        }
        
        if (conditionResult) {
          const execEnd = sinoIndex > 0 ? sinoIndex : finsiIndex - 1
          let j = index + 1
          while (j < execEnd && !this.hasError) {
            j = await this.executeLine(lines, j)
          }
          return finsiIndex
        } else if (sinoIndex > 0) {
          // Move to next SiNo or SiNo Si
          return sinoIndex
        }
        
        return finsiIndex
      }
    }
    
    // Assignment - support accented characters
    if (line.includes('<-') || line.includes('=')) {
      const match = originalLine.match(/([\w\u00C0-\u024F]+(?:\[[\w\u00C0-\u024F]+\])?)\s*(?:<-|=)\s*(.+)/i)
      if (match) {
        const [, varName, expression] = match
        
        // Check for array assignment
        const arrayMatch = varName.match(/(\w+)\[(\w+)\]/)
        if (arrayMatch) {
          const [, arrName, indexExpr] = arrayMatch
          const arr = this.variables.get(arrName.toLowerCase())
          if (!arr) {
            this.errors.push(`Error: El arreglo "${arrName}" no ha sido definido. Use "Dimension ${arrName}[tamaño]" primero.`)
            this.hasError = true
            return index + 1
          }
          const idx = this.evaluateExpression(indexExpr)
          const value = this.evaluateExpression(expression)
          if (Array.isArray(arr.value)) {
            (arr.value as unknown[])[Number(idx)] = value
            this.notifyVariableChange()
          }
        } else {
          const existingVar = this.variables.get(varName.toLowerCase())
          if (!existingVar) {
            this.errors.push(`Error: La variable "${varName}" no ha sido definida. Use "Definir ${varName} Como Tipo" primero.`)
            this.hasError = true
            return index + 1
          }
          const value = this.evaluateExpression(expression)
          existingVar.value = value
          this.notifyVariableChange()
        }
        this.addFlowchartNode('process', `${varName} <- ${expression}`)
      }
    }
    
    return index + 1
  }

  private getDefaultValue(type: string): unknown {
    switch (type.toLowerCase()) {
      case 'entero':
      case 'real':
        return 0
      case 'caracter':
      case 'cadena':
        return ''
      case 'logico':
        return false
      default:
        return null
    }
  }

  private evaluateExpression(expr: string): unknown {
    // Handle string concatenation with variables: "texto", variable, "mas texto"
    if (expr.includes('"') || expr.includes("'")) {
      // Split by comma to handle concatenation
      const parts = this.splitByComma(expr)
      const results: string[] = []
      
      for (const part of parts) {
        const trimmed = part.trim()
        // Check if it's a string literal
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          // It's a string literal - keep as is (remove quotes)
          results.push(trimmed.slice(1, -1))
        } else {
          // It's a variable or expression - evaluate it
          const varValue = this.variables.get(trimmed.toLowerCase())
          if (varValue) {
            results.push(String(varValue.value))
          } else {
            // Check if it looks like a variable name (not a number) - support accented chars
            if (/^[a-zA-Z_\u00C0-\u024F][\w\u00C0-\u024F]*$/.test(trimmed) && !/^\d+$/.test(trimmed)) {
              this.errors.push(`Error: La variable "${trimmed}" no ha sido definida.`)
              this.hasError = true
              results.push(`[${trimmed}?]`)
            } else {
              // Try to evaluate as expression
              results.push(String(this.evaluateSimpleExpression(trimmed)))
            }
          }
        }
      }
      
      return results.join(' ')
    }
    
    return this.evaluateSimpleExpression(expr)
  }

  private splitByComma(expr: string): string[] {
    const parts: string[] = []
    let current = ''
    let inString = false
    let stringChar = ''
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i]
      
      if ((char === '"' || char === "'") && (i === 0 || expr[i-1] !== '\\')) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
        current += char
      } else if (char === ',' && !inString) {
        if (current.trim()) {
          parts.push(current.trim())
        }
        current = ''
      } else {
        current += char
      }
    }
    
    if (current.trim()) {
      parts.push(current.trim())
    }
    
    return parts
  }

  private evaluateSimpleExpression(expr: string): unknown {
    // Replace variables with their values - escape special regex chars in name
    let processedExpr = expr
    for (const [name, variable] of this.variables) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![\\w\\u00C0-\\u024F])${escapedName}(?![\\w\\u00C0-\\u024F])`, 'gi')
      processedExpr = processedExpr.replace(regex, String(variable.value))
    }
    
    // Handle mathematical functions
    processedExpr = processedExpr
      .replace(/raiz\s*\(\s*(.+?)\s*\)/gi, 'Math.sqrt($1)')
      .replace(/abs\s*\(\s*(.+?)\s*\)/gi, 'Math.abs($1)')
      .replace(/sen\s*\(\s*(.+?)\s*\)/gi, 'Math.sin($1)')
      .replace(/cos\s*\(\s*(.+?)\s*\)/gi, 'Math.cos($1)')
      .replace(/tan\s*\(\s*(.+?)\s*\)/gi, 'Math.tan($1)')
      .replace(/ln\s*\(\s*(.+?)\s*\)/gi, 'Math.log($1)')
      .replace(/exp\s*\(\s*(.+?)\s*\)/gi, 'Math.exp($1)')
      .replace(/trunc\s*\(\s*(.+?)\s*\)/gi, 'Math.trunc($1)')
      .replace(/redon\s*\(\s*(.+?)\s*\)/gi, 'Math.round($1)')
      .replace(/\^/g, '**')
      .replace(/mod/gi, '%')
      .replace(/\bVERDADERO\b/gi, 'true')
      .replace(/\bFALSO\b/gi, 'false')

    try {
      // Safe evaluation
      const result = new Function(`return ${processedExpr}`)()
      return result
    } catch {
      return processedExpr
    }
  }

  private evaluateCondition(condition: string): boolean {
    let processed = condition
    
    // Replace variables - escape special regex chars and support accented chars
    for (const [name, variable] of this.variables) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![\\w\\u00C0-\\u024F])${escapedName}(?![\\w\\u00C0-\\u024F])`, 'gi')
      processed = processed.replace(regex, JSON.stringify(variable.value))
    }
    
    // Replace operators - ORDER MATTERS! Replace multi-char operators first
    processed = processed
      .replace(/\bY\b/gi, '&&')
      .replace(/\bO\b/gi, '||')
      .replace(/\bNO\b/gi, '!')
      .replace(/<>/g, '!==')
      .replace(/>=/g, '>=')  // Keep >= as is
      .replace(/<=/g, '<=')  // Keep <= as is
      .replace(/(?<![<>!])=(?!=)/g, '===')  // Only replace single = that's not part of >=, <=, <>, or ==
      .replace(/VERDADERO/gi, 'true')
      .replace(/FALSO/gi, 'false')
    
    try {
      return Boolean(new Function(`return ${processed}`)())
    } catch {
      return false
    }
  }

  getVariables(): Map<string, Variable> {
    return this.variables
  }
}

export const defaultCode = `Algoritmo condicionales
    Definir edad Como Entero;
    Escribir "Digite su edad";
    Leer edad;

    Si edad > 18 Entonces
        Escribir "Usted es mayor de edad";
    SiNo
        Escribir "Usted es menor de edad";
    FinSi
FinAlgoritmo`
