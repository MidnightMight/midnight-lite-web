# Midnight Lite — Personal Website

A personal website built from scratch to showcase side projects, interactive tools, and experiments. The site is both the product **and** the running documentation of its own creation.

🌐 **Live site:** [midnight-lite.com](https://midnight-lite.com)
🐙 **Repository:** [github.com/MidnightMight/midnight-lite-web](https://github.com/MidnightMight/midnight-lite-web)

---

## Overview

The site is split into two layers:

| Layer | Tech | Purpose |
|---|---|---|
| Content pages | HTML / CSS / vanilla JS | Fast, lightweight pages — Home, About, Projects, Services, Dev Log |
| Interactive apps | React + Vite (bundled by Netlify) | Data-heavy tools like the EUC Visualiser |

Hosting and CI/CD is handled by **Netlify** — every push to the main branch auto-deploys.

---

## Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript** — all main content pages
- **React 19** — interactive app components
- **Vite 6** — dev server and production bundler
- **React Leaflet** — map rendering in the EUC Visualiser
- **Recharts** — charting library for data visualisation
- **MUI (Material UI)** — UI component library
- **Mermaid.js** — Gantt / diagram rendering on project detail pages
- **PapaParse** — CSV parsing in the browser
- **Netlify** — hosting, CI/CD, custom redirects

---

## Site Map

```
/
├── index.html              — Home (hero, animated background, project carousel)
├── about.html              — About me
├── projects.html           — Projects grid with category filter & featured card
│   ├── project1.html       — Website Building from Scratch (this site)
│   ├── project2.html       — ESP32 Cam for Fun
│   └── project3.html       — Raspberry Pi Related
├── Services.html           — Interactive app launcher
├── euc-visualiser.html     — EUC World data visualiser (React/Vite app)
├── progress.html           — Dev Log: milestones, changelog, future plans
├── under-construction.html — Placeholder for in-progress pages
└── 404.html                — Custom 404 page
```

---

## Current Projects

| # | Project | Status | Category |
|---|---------|--------|----------|
| 1 | **Website Building from Scratch** | 🟢 Active | Web |
| 2 | **ESP32 Cam for Fun** | 🔨 In Progress | Hardware |
| 3 | **Raspberry Pi Related** | 🔨 In Progress | Hardware |

---

## Milestones

| Date | Milestone |
|------|-----------|
| 27 Mar 2026 | Agentic AI used to review code, create project pages, and write documentation. Dev Log page (`progress.html`) added to the site. |
| 27 Mar 2026 | Projects page rebuilt with category filter, featured card, and Gantt timelines |
| 26 Mar 2025 | EUC World data visualiser deployed (React + Vite + Leaflet + Recharts) |
| 20 Mar 2025 | Services page and About page added/remade |
| 1 Jan 2025 | Home page redesigned with parallax hero, animated background, and carousel |
| 1 Nov 2024 | Core site deployed to Netlify (Home, Projects, About) |
| 31 Jan 2024 | First prototype — single-page "Coming Soon" |

---

## Future Plans

- 🗺️ **Flight Radar / Live Flights Globe** — pull real-time flight data from the FlightAware AeroAPI or open-source ADS-B feeds and project aircraft positions onto an interactive 3D globe (e.g. with CesiumJS or Globe.gl)
- 🏠 **Smart Home Dashboard** — a web UI to monitor and control smart home sensors and devices (Raspberry Pi / MQTT-based)
- 📝 **Dev Log sub-pages** — per-entry devlog pages so individual updates can be shared and linked
- 🔍 **Search** — site-wide search bar on the Projects page
- 🌙 **Dark / Light mode toggle**
- 📸 **Real project photos** — replace placeholder Under Construction images with actual shots of the hardware builds

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the dev server (Vite)
npm run dev

# Production build
npm run build
```

Static HTML pages are served directly by Vite. The React app entry point is `src/euc-visualiser.jsx`, loaded from `euc-visualiser.html`.

---

## Deployment

Netlify watches the `main` branch. On every push it runs `npm run build` and publishes the `dist/` folder. A `[[redirects]]` rule in `netlify.toml` sends any unknown URL to the custom `404.html`.
