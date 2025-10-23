# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start the development server with hot reload (Vite)
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint on the codebase

### Installation
- `npm install` - Install all dependencies

## Architecture Overview

This is a React-based Trading Control Panel application built with:
- **Vite** as the build tool
- **TypeScript** for type safety
- **React Router** for client-side routing
- **shadcn/ui** components (Radix UI + Tailwind CSS)
- **Tanstack Query** for server state management
- **React Hook Form + Zod** for forms and validation
- **Recharts** for data visualization

### Key Architectural Patterns

1. **Component Structure**:
   - UI primitives in `src/components/ui/` (shadcn/ui components)
   - Trading-specific components in `src/components/` (TradingLayout, TradingOverview, SystemHealthDashboard, etc.)
   - Pages in `src/pages/`

2. **Routing Structure**:
   - All routes are wrapped in `TradingLayout` component
   - Main routes: `/` (System Health), `/trading`, `/positions`, `/model`, `/risk`, `/config`, `/analytics`
   - Catch-all route for 404 handling

3. **State Management**:
   - React Query (`@tanstack/react-query`) for server state
   - Local state with React hooks
   - Form state with React Hook Form

4. **Styling Approach**:
   - Tailwind CSS for utility classes
   - CSS variables for theming (defined in `src/index.css`)
   - Component variants using `class-variance-authority`

5. **Path Aliasing**:
   - `@/` maps to `./src/` directory (configured in tsconfig.json and vite.config.ts)

### TypeScript Configuration

The project uses relaxed TypeScript settings:
- `noImplicitAny: false` - Allows implicit any types
- `strictNullChecks: false` - Disabled strict null checking
- `noUnusedParameters: false` - Allows unused parameters
- `noUnusedLocals: false` - Allows unused local variables