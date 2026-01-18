# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Black POS Frontend - Built with React 19, TypeScript, Vite 7, and shadcn/ui components.

### Guidelines

- Write clean and readable code. Always focus on maintainabillity and easy-of-read. Focus on CLEAN principles, always keeping components small and focused
- Utilize nomes de componentes e variáveis em português 

## Tech Stack

- React 19 with TypeScript 5.9
- Vite 7 as build tool
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- shadcn/ui with "radix-nova" style and Remixicon icons
- JetBrains Mono as the primary font

## Architecture

### Path Aliases

The `@/` alias maps to `./src/` directory. Use this for all imports:
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

### UI Components

Components use shadcn/ui conventions:
- UI primitives in `src/components/ui/`
- Built on Base UI (formerly Radix) primitives
- Styled with `class-variance-authority` for variants
- Use `cn()` from `@/lib/utils` for merging Tailwind classes

### Styling

- Global styles and CSS variables defined in `src/index.css`
- Uses OKLCH color space for theme colors
- Light/dark mode via `.dark` class with CSS variables
- Tailwind theme customizations in `@theme inline` block
