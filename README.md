# Portfolio Site

A Next.js portfolio website with a fixed left panel, scrollable slides, and draggable widgets.

## Features

- Fixed 370px left panel with about section and timeline
- Scrollable slides feed (100vh each) with scroll snap
- First slide embeds a Spline 3D scene
- Draggable widgets:
  - Spotify Now Playing (mock)
  - Heart Rate tracker with animated numbers
  - World Time (New York & Paris) with animated clocks
- Widget positions persist to localStorage
- Clean UI using Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- @number-flow/react for number animations
- Spline 3D viewer

## Project Structure

```
app/
  layout.tsx          # Root layout
  page.tsx            # Main page with layout
  globals.css         # Global styles

components/
  left/
    LeftPanel.tsx     # Fixed left panel with about & timeline
  slides/
    Slides.tsx        # Slides container
    Slide.tsx         # Individual slide wrapper
    SplineSlide.tsx   # Spline 3D embed
  widgets/
    WidgetCanvas.tsx  # Widget overlay container
    Draggable.tsx     # Draggable wrapper component
    WidgetChrome.tsx  # Widget styling wrapper
    SpotifyMock.tsx   # Spotify widget
    HeartRate.tsx     # Heart rate widget
    WorldTime.tsx     # World time widget

lib/
  persist.ts          # localStorage utilities
```

