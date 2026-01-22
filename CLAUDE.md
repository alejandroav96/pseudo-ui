# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Pseudo Valentina Obando**, a Spanish-language pseudocode IDE inspired by PseInt. It allows users to write, execute, and visualize pseudocode with automatic flowchart generation.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Architecture

### Core Components

- **[pseint-ide.tsx](components/pseint-ide.tsx)** - Main IDE orchestrator. Manages code state, execution flow, theme, file operations, and coordinates all child components.

- **[pseudocode-interpreter.tsx](lib/pseudocode-interpreter.tsx)** - The interpreter engine. Parses and executes Spanish pseudocode, generates flowchart nodes, and handles async input via callbacks. Exports `PseudocodeInterpreter` class and `FlowchartNode` types.

- **[flowchart.tsx](components/flowchart.tsx)** - Canvas-based flowchart renderer with zoom controls. Draws nodes (start/end, process, decision, input/output) with arrows. Exports `exportFlowchartAsImage()` for PNG downloads.

### Key Patterns

**Pseudocode Execution Flow:**
1. `PseIntIDE` creates `PseudocodeInterpreter` instance
2. Sets input callback for `Leer` statements (opens modal, returns Promise)
3. Calls `interpreter.execute(code)` which returns `{output, errors, flowchart}`
4. Results displayed in console and flowchart tabs

**State Persistence:**
- Code saved to `localStorage` under `pseudo-ide-saved-code` (debounced 1s)
- Theme saved to `pseudo-ide-theme`
- Corrupted data (HTML in code) is auto-cleaned on load

### Pseudocode Syntax (Spanish)

The interpreter supports PseInt-compatible syntax:
- `Algoritmo`/`FinAlgoritmo` or `Proceso`/`FinProceso` for program blocks
- `Definir variable Como Tipo` (Entero, Real, Cadena, Logico)
- `Leer`/`Escribir` for I/O
- `Si`/`SiNo`/`FinSi`, `Mientras`/`FinMientras`, `Para`/`FinPara` for control flow
- `<-` for assignment, `Y`/`O`/`NO` for logical operators

## Tech Stack

- Next.js 16 with App Router (React 19)
- TypeScript with strict mode
- Tailwind CSS 4 with CSS variables (oklch colors)
- shadcn/ui components (new-york style, configured in [components.json](components.json))

## Path Aliases

`@/*` maps to project root (e.g., `@/components`, `@/lib`, `@/hooks`)
