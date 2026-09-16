# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Firma Digital Pro
**Generated:** 2026-08-09 06:56:03 · **Actualizado:** 2026-09-16 (identidad LENA)
**Category:** E-signature / Document Workflow
**Design Dials:** Variance 5/10 (Balanced / Modern) | Motion 5/10 (Standard) | Density 7/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | Tailwind token |
|------|-----|----------------|
| Primary (petróleo del logo) | `#006389` | `primary` |
| Primary hover | `#00516F` | `primary-hover` |
| Primary deep (fondos oscuros) | `#00425C` | `primary-deep` |
| Primary light (cian del logo) | `#3BC6EE` | `primary-light` |
| Primary soft (fondos de ícono / activo) | `#E3F4FA` | `primary-soft` |
| Accent/CTA (lima del logo, texto oscuro) | `#B9D86D` / texto `#0B3346` | `accent` / `accent-foreground` |
| Background | `#F4F9FB` | `background` |
| Surface | `#FFFFFF` | `surface` |
| Foreground | `#0B3346` | `foreground` |
| Muted / Muted foreground | `#E8F1F5` / `#4F7382` | `muted` / `muted-foreground` |
| Border | `#D5E5EC` | `border` |
| Success / soft | `#3F7D20` / `#EEF6DC` | `success` / `success-soft` |
| Warning / soft | `#B45309` / `#FEF3C7` | `warning` / `warning-soft` |
| Info / soft | `#00516F` / `#E3F4FA` | `info` / `info-soft` |
| Destructive / soft | `#DC2626` / `#FEE2E2` | `destructive` / `destructive-soft` |

**Color Notes:** Paleta extraída del logotipo LENA (petróleo #006389, cian #3BC6EE, lima #B9D86D). Todos los pares texto/fondo verificados ≥ 4.5:1 (WCAG AA). Los estados usan tokens semánticos (`success`, `warning`, `info`, `destructive`) — nunca colores sueltos de Tailwind. Logos en `frontend/public/`: `lena-logo.png` (completo), `lena-mark.png` (sin lema, para el sidebar), `lena-logo-white.png` (fondos oscuros), `favicon.png`.

### Typography

- **Heading Font:** Plus Jakarta Sans (geométrica, afín al logotipo)
- **Body Font:** Inter
- **Mood:** corporate, trustworthy, accessible, readable, professional, clean
- **Google Fonts:** [Plus Jakarta Sans + Inter](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 7/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #B9D86D;
  color: #0B3346;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #006389;
  border: 2px solid #006389;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #EFF6FF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #006389;
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 198, 238, 0.25);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Soft UI Evolution

**Keywords:** Evolved soft UI, better contrast, modern aesthetics, subtle depth, accessibility-focused, improved shadows, hybrid

**Best For:** Modern enterprise apps, SaaS platforms, health/wellness, modern business tools, professional, hybrid

**Key Effects:** Improved shadows (softer than flat, clearer than neumorphism), modern (200-300ms), focus visible, WCAG AA/AAA

### Page Pattern

**Pattern Name:** Enterprise Gateway

- **Conversion Strategy:** Path selection (I am a...). Mega menu navigation. Trust signals prominent.
- **CTA Placement:** Contact Sales (Primary) + Login (Secondary)
- **Section Order:** 1. Hero (Video/Mission), 2. Solutions by Industry, 3. Solutions by Role, 4. Client Logos, 5. Contact Sales

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Flat design without depth
- ❌ Text-heavy pages

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
