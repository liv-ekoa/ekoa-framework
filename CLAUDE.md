# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

## Stack

- **React 18** + **Vite 5** — SPA bundled with Vite
- **Tailwind CSS 3** — utility-first styling with custom design tokens
- **React Router 6** — client-side routing (`BrowserRouter`)
- **Lucide React** — icon library

## Custom design tokens (tailwind.config.js)

| Token | Value | Use |
|---|---|---|
| `cream` | `#F5F0E6` | page background |
| `forest` | `#1C3A2A` | headings, nav, dark buttons |
| `forest-600` | `#2D6644` | italic accent text, labels, icons |
| `forest-800` | `#152B1F` | hover states |

Fonts loaded from Google Fonts: **Playfair Display** (serif, headings + italic accents) and **Inter** (sans-serif, body).

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `src/pages/Home.jsx` | Full landing page with all sections |
| `/join` | `src/pages/Join.jsx` | Application form |

## Architecture

All content lives on a single scrolling home page. Nav links use anchor IDs (`#mission`, `#how-it-works`, `#network`, `#about`) for smooth-scroll navigation. The only separate route is `/join`.

```
src/
  App.jsx              BrowserRouter + route tree
  pages/
    Home.jsx           Hero, Problem, Solution, Quote, Join callout, About sections
    Join.jsx           Application form with success state
  components/
    Navbar.jsx         Sticky nav, logo SVG, anchor links + Join CTA
    Footer.jsx         Three-column footer, nav + get-involved links
```

## Deployment to GitHub Pages

For GitHub Pages, switch `BrowserRouter` → `HashRouter` in `src/App.jsx` and set `base` in `vite.config.js`:

```js
export default defineConfig({ base: '/repo-name/', plugins: [react()] })
```
