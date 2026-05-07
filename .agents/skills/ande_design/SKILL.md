---
name: ande_design
description: Visual design system guide for the Andecorp website. Use this skill when creating or modifying any section, component, page, or CSS styles. Documents the color palette, typography, CSS tokens, Bootstrap 5 usage patterns, interaction patterns, and style rules that must be followed throughout the frontend.
---

# Skill: Design System

## When to use this skill

Use this skill when:
- Creating or modifying any HTML/CSS section of the site.
- You need to know which colors, fonts, or classes to use.
- Adding a new component (button, card, banner, modal, form).
- Verifying that a proposed design is consistent with the existing site style.

## Agent Instructions

1. **Read the full reference document first:**
   `.agents\skills\ande_design\SKILL.md`

2. **Bootstrap 5 first — custom CSS second.**
   Always prefer Bootstrap 5 utility classes over writing new CSS rules.
   - Layout → `container`, `row`, `col-*`, `d-flex`, `gap-*`, `p-*`, `m-*`
   - Typography → `fw-bold`, `text-center`, `text-uppercase`, `fs-*`
   - Colors → use Bootstrap's `text-*` / `bg-*` only when the brand token is not needed
   - Components → `card`, `modal`, `btn`, `badge`, `alert`, `navbar`, `carousel`
   - Spacing → always use Bootstrap spacing scale (`p-3`, `mb-4`, etc.) before adding CSS padding/margin

3. **Write custom CSS only for:**
   - Applying brand CSS variables (`--blue`, `--yellow`, `--white`, `--gray`)
   - Overrides that Bootstrap utilities cannot achieve (e.g. `clip-path`, `drop-shadow`, `object-fit`)
   - New uniquely-styled components (e.g. animated buttons, SVG map regions)
   - Section-specific styles that don't map to any Bootstrap utility

4. **CSS tokens** — always use the variables defined in `css/main.css `:root`. Never use raw hex values in new components.

   | Token      | HEX       | Primary use                        |
   |------------|-----------|------------------------------------|
   | `--blue`   | `#14213D` | Dark backgrounds, text, borders    |
   | `--yellow` | `#FFB512` | Brand accent, buttons, hover state |
   | `--white`  | `#FFFFFF` | Text on dark, card backgrounds     |
   | `--gray`   | `#E5E5E5` | Global body background             |

5. **Typography:** Headings always use `'Anton', sans-serif` with `letter-spacing: 0.1em`. Body text uses the generic `sans-serif` stack.

6. **New CSS files:** Create a new numbered file in `css/layout/` (e.g. `15_newSection.css`) and import it in `css/main.css`. Do **not** use inline styles or `<style>` tags in HTML.

7. **Do not use** additional CSS frameworks, colors outside the palette, or fonts other than Anton.

