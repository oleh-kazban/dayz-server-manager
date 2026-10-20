import {
  Activity,
  Archive,
  ArrowUpCircle,
  ArrowUpRight,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode,
  Flag,
  Globe,
  HardDrive,
  LogOut,
  MessageSquare,
  Network,
  Radio,
  RefreshCw,
  RotateCw,
  Settings,
  ShieldCheck,
  Terminal,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { AppShell, PageContainer } from '@dsm/components/layout';

import { ThemeProvider } from './features/theme';

export function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <PageContainer>
          {/* ----------------------------------------------------------------
              SECTION 1: PAGE INTRODUCTION & HERO SERVER BANNER
              ---------------------------------------------------------------- */}
          <section aria-labelledby="overview-heading" className="space-y-5">
            {/* Page Header Introduction */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1
                  id="overview-heading"
                  className="text-2xl sm:text-[27px] font-semibold tracking-tight text-[var(--color-text-main)]"
                >
                  Server overview
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
                  Your world, at a glance. Everything is running smoothly.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm">
                  <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span>20 Oct, 2026</span>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Hero Server Banner (Chernarus Panorama) */}
            <div className="relative rounded-2xl overflow-hidden min-h-[226px] p-6 sm:p-7 flex flex-col justify-between shadow-[var(--shadow-card)] border border-[#203b50]/20 bg-[#142534]">
              {/* Chernarus Panorama Scrim & Wallpaper */}
              <div
                className="absolute inset-0 bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: "url('/assets/images/misty-chernarus-bg.jpg')" }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16, 29, 41, 0.90) 0%, rgba(20, 37, 52, 0.78) 50%, rgba(14, 25, 36, 0.92) 100%)',
                }}
              />

              {/* Banner Top Row */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white tracking-wider">
                    <span>DAYZ / DEDICATED SERVER</span>
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-success)] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                      Online
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-[32px] font-semibold text-white tracking-tight leading-tight">
                    Chernarus Survival
                  </h2>
                  <p className="text-xs sm:text-[13px] text-slate-300">
                    Outlive Project · 1PP · Vanilla+ · No safe zones
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white shrink-0 self-start">
                  <Globe className="w-3.5 h-3.5 text-slate-300" />
                  <span>Frankfurt, DE</span>
                </div>
              </div>

              {/* Banner Bottom Row */}
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-6 border-t border-white/10">
                {/* Connection Meta */}
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs text-slate-200">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>185.38.151.42:2302</span>
                    <button
                      type="button"
                      aria-label="Copy server address"
                      className="p-1 hover:text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Uptime 6d 14h 32m</span>
                  </div>
                  <div className="text-slate-300">DayZ 1.26</div>
                </div>

                {/* Quick Controls */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/95 hover:bg-white text-[var(--color-text-main)] text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Console</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/95 hover:bg-white text-[var(--color-text-main)] text-xs font-semibold shadow-sm transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Connect to server</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
          {/* ----------------------------------------------------------------
              SECTION 2: LIVE SERVER METRICS (12-COLUMN GRID)
              Col spans: 12 on mobile, 6 on tablet (sm), 3 on desktop (lg)
              ---------------------------------------------------------------- */}
          <section aria-label="Key Performance Indicators">
            <div className="grid grid-cols-12 gap-4 lg:gap-4">
              {/* Metric 1: Players Online */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex flex-col justify-between min-h-[114px]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Players online</span>
                  <Users className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-[27px] font-semibold text-[var(--color-text-main)] leading-none">
                        48
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">/ 60</span>
                    </div>
                    <div className="text-[11px] font-medium text-[var(--color-success)] mt-1.5 flex items-center gap-0.5">
                      <span>↗ 12 players from yesterday</span>
                    </div>
                  </div>
                  {/* Sparkline Graphic */}
                  <svg
                    className="w-[94px] h-[35px] overflow-visible"
                    viewBox="0 0 94 35"
                    fill="none"
                  >
                    <path
                      d="M0 30 Q 15 28 25 22 T 50 18 T 72 10 L 94 4"
                      stroke="#27a88c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Metric 2: Average Latency */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex flex-col justify-between min-h-[114px]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Average latency</span>
                  <Radio className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-[27px] font-semibold text-[var(--color-text-main)] leading-none">
                        38
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">ms</span>
                    </div>
                    <div className="text-[11px] font-medium text-[var(--color-success)] mt-1.5 flex items-center gap-0.5">
                      <span>↘ 6 ms from yesterday</span>
                    </div>
                  </div>
                  {/* Sparkline Graphic */}
                  <svg
                    className="w-[94px] h-[35px] overflow-visible"
                    viewBox="0 0 94 35"
                    fill="none"
                  >
                    <path
                      d="M0 6 Q 16 8 28 14 T 54 20 T 74 26 L 94 32"
                      stroke="#27a88c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Metric 3: Server FPS */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex flex-col justify-between min-h-[114px]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Server FPS</span>
                  <Activity className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-[27px] font-semibold text-[var(--color-text-main)] leading-none">
                        59.8
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">/ 60</span>
                    </div>
                    <div className="text-[11px] font-medium text-[var(--color-success)] mt-1.5">
                      Stable · Optimal performance
                    </div>
                  </div>
                  {/* Sparkline Graphic */}
                  <svg
                    className="w-[94px] h-[35px] overflow-visible"
                    viewBox="0 0 94 35"
                    fill="none"
                  >
                    <path
                      d="M0 24 L 12 18 L 24 26 L 36 12 L 48 20 L 60 8 L 72 16 L 84 10 L 94 12"
                      stroke="#27a88c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Metric 4: Unique Players */}
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex flex-col justify-between min-h-[114px]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>Unique players</span>
                  <UserCheck className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-[27px] font-semibold text-[var(--color-text-main)] leading-none">
                        1,284
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-[var(--color-success)] mt-1.5">
                      ↗ 8.2% in the last 7 days
                    </div>
                  </div>
                  {/* Sparkline Graphic */}
                  <svg
                    className="w-[94px] h-[35px] overflow-visible"
                    viewBox="0 0 94 35"
                    fill="none"
                  >
                    <path
                      d="M0 28 Q 18 28 32 22 T 60 16 T 78 10 L 94 5"
                      stroke="#27a88c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </section>
          {/* ----------------------------------------------------------------
              SECTION 3: PLAYER ANALYTICS (12-COLUMN GRID)
              Col spans: 8 cols (Player activity) + 4 cols (Regional distribution)
              ---------------------------------------------------------------- */}
          <section aria-label="Player Analytics">
            <div className="grid grid-cols-12 gap-5">
              {/* Card 1: Player Activity Chart (8 Cols) */}
              <div className="col-span-12 lg:col-span-8 figma-card p-5 flex flex-col justify-between min-h-[284px]">
                {/* Heading & Filter */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                      Player activity
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      A living world, around the clock
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary-border)] transition-colors cursor-pointer">
                    <span>Last 24 hours</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 text-xs text-[var(--color-text-muted)] mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-chart-blue)]" />
                    <span>Online players</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-chart-teal)]" />
                    <span>Unique players</span>
                  </div>
                </div>

                {/* SVG Area Chart */}
                <div className="relative mt-4">
                  <svg
                    viewBox="0 0 856 142"
                    className="w-full h-[142px] overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4279e8" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#4279e8" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#73c5b1" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#73c5b1" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Dashed Gridlines & Y-Axis Scale */}
                    <line
                      x1="28"
                      y1="10"
                      x2="856"
                      y2="10"
                      stroke="var(--color-chart-grid)"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="28"
                      y1="50"
                      x2="856"
                      y2="50"
                      stroke="var(--color-chart-grid)"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="28"
                      y1="90"
                      x2="856"
                      y2="90"
                      stroke="var(--color-chart-grid)"
                      strokeDasharray="4 4"
                    />
                    <line x1="28" y1="130" x2="856" y2="130" stroke="var(--color-chart-grid)" />

                    <text x="0" y="14" fill="#7a8aa0" fontSize="10" fontFamily="var(--font-sans)">
                      60
                    </text>
                    <text x="0" y="54" fill="#7a8aa0" fontSize="10" fontFamily="var(--font-sans)">
                      40
                    </text>
                    <text x="0" y="94" fill="#7a8aa0" fontSize="10" fontFamily="var(--font-sans)">
                      20
                    </text>
                    <text x="5" y="134" fill="#7a8aa0" fontSize="10" fontFamily="var(--font-sans)">
                      0
                    </text>

                    {/* Unique Players Fill + Curve */}
                    <path
                      d="M28 120 C 70 115, 120 125, 170 115 C 220 105, 270 120, 320 115 C 370 108, 420 125, 470 112 C 520 100, 570 120, 620 110 C 670 102, 720 118, 770 105 C 810 95, 830 110, 856 102 L 856 130 L 28 130 Z"
                      fill="url(#tealGradient)"
                    />
                    <path
                      d="M28 120 C 70 115, 120 125, 170 115 C 220 105, 270 120, 320 115 C 370 108, 420 125, 470 112 C 520 100, 570 120, 620 110 C 670 102, 720 118, 770 105 C 810 95, 830 110, 856 102"
                      stroke="#73c5b1"
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* Online Players Fill + Curve */}
                    <path
                      d="M28 100 C 70 95, 120 85, 170 80 C 220 75, 270 65, 320 55 C 370 48, 420 72, 470 45 C 520 38, 570 55, 620 42 C 670 38, 720 55, 770 48 C 810 44, 830 48, 856 36 L 856 130 L 28 130 Z"
                      fill="url(#blueGradient)"
                    />
                    <path
                      d="M28 100 C 70 95, 120 85, 170 80 C 220 75, 270 65, 320 55 C 370 48, 420 72, 470 45 C 520 38, 570 55, 620 42 C 670 38, 720 55, 770 48 C 810 44, 830 48, 856 36"
                      stroke="#4279e8"
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* Active Time Marker Line + Dot */}
                    <line
                      x1="770"
                      y1="10"
                      x2="770"
                      y2="130"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx="770"
                      cy="48"
                      r="4.5"
                      fill="#4279e8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </svg>

                  {/* Time Axis Labels */}
                  <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-mono pl-7 pt-2">
                    <span>00:00</span>
                    <span>04:00</span>
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>20:00</span>
                    <span>23:59</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Players by Region (4 Cols) */}
              <div className="col-span-12 lg:col-span-4 figma-card p-5 flex flex-col justify-between min-h-[284px]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                      Players by region
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Current player distribution
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] font-medium">Live</span>
                </div>

                {/* Donut and Legend Row */}
                <div className="flex items-center justify-around gap-4 py-2">
                  {/* SVG Donut */}
                  <div className="relative w-[140px] h-[140px] shrink-0">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                      {/* Segment 4: Other (6%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#d8e4f2"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray="238.76"
                        strokeDashoffset="0"
                      />
                      {/* Segment 3: Asia Pacific (13%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#7fcfc3"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray="238.76"
                        strokeDashoffset="14.3"
                      />
                      {/* Segment 2: North America (23%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#91b2f4"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray="238.76"
                        strokeDashoffset="45.3"
                      />
                      {/* Segment 1: Europe (58%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#4279e8"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray="238.76"
                        strokeDashoffset="100.2"
                      />
                    </svg>

                    {/* Donut Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                        48
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        players online
                      </span>
                    </div>
                  </div>

                  {/* Legend Breakdown */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4279e8]" />
                        <span className="text-[var(--color-text-secondary)]">Europe</span>
                      </div>
                      <span className="font-semibold text-[var(--color-text-main)]">58%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#91b2f4]" />
                        <span className="text-[var(--color-text-secondary)]">North America</span>
                      </div>
                      <span className="font-semibold text-[var(--color-text-main)]">23%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#7fcfc3]" />
                        <span className="text-[var(--color-text-secondary)]">Asia Pacific</span>
                      </div>
                      <span className="font-semibold text-[var(--color-text-main)]">13%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#d8e4f2]" />
                        <span className="text-[var(--color-text-secondary)]">Other</span>
                      </div>
                      <span className="font-semibold text-[var(--color-text-main)]">6%</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--color-text-muted)] text-left pt-2 border-t border-[var(--color-border-subtle)]">
                  Connected from 14 countries
                </div>
              </div>
            </div>
          </section>
          {/* ----------------------------------------------------------------
              SECTION 4: SERVER OPERATIONS (12-COLUMN GRID)
              Col spans: 6 cols (Performance) + 6 cols (Recent events)
              ---------------------------------------------------------------- */}
          <section aria-label="Server Operations">
            <div className="grid grid-cols-12 gap-5">
              {/* Card 1: Server Performance (6 Cols) */}
              <div className="col-span-12 lg:col-span-6 figma-card p-5 flex flex-col justify-between min-h-[248px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                    Server performance
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                    Healthy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center mt-2">
                  {/* Circular CPU Gauge (4 cols on sm) */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#edf3ff"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#27a88c"
                          strokeWidth="8"
                          strokeLinecap="round"
                          fill="transparent"
                          strokeDasharray="251.32"
                          strokeDashoffset="206"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold text-[var(--color-text-main)] leading-none">
                          18%
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          CPU usage
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] mt-1 font-mono">
                      AMD Ryzen 9 7950X
                    </span>
                  </div>

                  {/* Resource Usage Bars & Trend (8 cols on sm) */}
                  <div className="sm:col-span-8 space-y-3.5">
                    {/* Performance Micro Trend */}
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Live thread stability
                      </span>
                      <svg className="w-32 h-6" viewBox="0 0 120 20" fill="none">
                        <path
                          d="M0 12 L 15 8 L 28 14 L 42 6 L 56 16 L 70 8 L 84 12 L 98 6 L 120 10"
                          stroke="#4279e8"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Progress 1: Memory */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                          <HardDrive className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>Memory</span>
                        </div>
                        <span className="font-mono text-[var(--color-text-main)]">5.4 / 16 GB</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--color-primary)] w-[34%]" />
                      </div>
                    </div>

                    {/* Progress 2: Storage */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                          <Database className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>Storage</span>
                        </div>
                        <span className="font-mono text-[var(--color-text-main)]">42 / 200 GB</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--color-primary)] w-[21%]" />
                      </div>
                    </div>

                    {/* Progress 3: Network */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                          <Network className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>Network</span>
                        </div>
                        <span className="font-mono text-[var(--color-text-main)]">1.2 GB/h</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--color-primary)] w-[15%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Recent Events (6 Cols) */}
              <div className="col-span-12 lg:col-span-6 figma-card p-5 flex flex-col justify-between min-h-[248px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                    Recent events
                  </h3>
                  <a
                    href="#events"
                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    View all ↗
                  </a>
                </div>

                {/* Event Feed List */}
                <div className="space-y-3 mt-3">
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserPlus className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                      <span className="text-[var(--color-text-secondary)] truncate">
                        Wolfpack joined the server
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 font-mono">
                      2 min ago
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Archive className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                      <span className="text-[var(--color-text-secondary)] truncate">
                        Automatic backup completed
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 font-mono">
                      8 min ago
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Flag className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                      <span className="text-[var(--color-text-secondary)] truncate">
                        New base created in Novy Sobor
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 font-mono">
                      12 min ago
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LogOut className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                      <span className="text-[var(--color-text-secondary)] truncate">
                        TheWanderer disconnected
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 font-mono">
                      16 min ago
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                      <span className="text-[var(--color-text-secondary)] truncate">
                        BattlEye verification passed
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 font-mono">
                      24 min ago
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* ----------------------------------------------------------------
              SECTION 5: MAINTENANCE AND SHORTCUTS
              Col spans: 8 cols (Server logs) + 4 cols (Installed mods)
              Followed by 4 Quick Actions (3 cols each)
              ---------------------------------------------------------------- */}
          <section aria-label="Maintenance and Shortcuts" className="space-y-5">
            {/* Logs & Mods Row */}
            <div className="grid grid-cols-12 gap-5">
              {/* Server Logs (8 Cols) */}
              <div className="col-span-12 lg:col-span-8 figma-card p-5 space-y-3.5">
                {/* Header Controls */}
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                    Server logs
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span>Auto-scroll</span>
                      <div className="w-8 h-4 rounded-full bg-[var(--color-primary)] p-0.5 cursor-pointer flex justify-end">
                        <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-secondary)] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Severity Filters */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      Info
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      Warning
                    </button>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      Error
                    </button>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                    Live stream · 6 new entries
                  </span>
                </div>

                {/* Monospace Log Viewer Box */}
                <div className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] font-mono text-[11px] leading-[22px] overflow-x-auto space-y-1">
                  <div className="flex items-baseline gap-3 text-nowrap">
                    <span className="text-[var(--color-text-muted)]">14:32:18</span>
                    <span className="font-semibold text-[var(--color-primary)]">INFO</span>
                    <span className="text-[var(--color-text-secondary)]">
                      Player &quot;Wolfpack&quot; connected (Steam: ...3812)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 text-nowrap">
                    <span className="text-[var(--color-text-muted)]">14:32:16</span>
                    <span className="font-semibold text-[var(--color-primary)]">INFO</span>
                    <span className="text-[var(--color-text-secondary)]">
                      BattlEye client verified · Session authorized
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 text-nowrap">
                    <span className="text-[var(--color-text-muted)]">14:28:04</span>
                    <span className="font-semibold text-[var(--color-success)]">SAVE</span>
                    <span className="text-[var(--color-text-secondary)]">
                      World persistence saved successfully (1.42s)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 text-nowrap">
                    <span className="text-[var(--color-text-muted)]">14:24:00</span>
                    <span className="font-semibold text-[var(--color-primary)]">INFO</span>
                    <span className="text-[var(--color-text-secondary)]">
                      Backup complete → chernarus_2026-10-20_1424
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 text-nowrap">
                    <span className="text-[var(--color-text-muted)]">14:20:31</span>
                    <span className="font-semibold text-[var(--color-warning)]">WARN</span>
                    <span className="text-[var(--color-text-secondary)]">
                      Player &quot;Rook&quot; high latency detected (182 ms)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 text-nowrap">
                    <span className="text-[var(--color-text-muted)]">14:18:02</span>
                    <span className="font-semibold text-[var(--color-primary)]">INFO</span>
                    <span className="text-[var(--color-text-secondary)]">
                      Scheduled restart in 3h 42m · Players notified
                    </span>
                  </div>
                </div>
              </div>

              {/* Installed Mods (4 Cols) */}
              <div className="col-span-12 lg:col-span-4 figma-card p-5 flex flex-col justify-between min-h-[278px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[var(--color-text-main)]">
                    Installed mods
                  </h3>
                  <a
                    href="#mods"
                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Manage ↗
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-[var(--color-text-muted)] font-mono">12 active mods</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />1 update
                    available
                  </span>
                </div>

                {/* Mod List Items */}
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                          CF - Community Framework
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          v1.0.468
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                          Community Online Tools
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          v1.26.0
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Archive className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                          DayZ Expansion
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          v1.9.40
                        </span>
                      </div>
                    </div>
                    <ArrowUpCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts (4 Cards x 3 Cols) */}
            <div className="space-y-2.5 pt-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Quick actions</h3>
              <div className="grid grid-cols-12 gap-4 lg:gap-5">
                {/* Action 1: Create Backup */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex items-center justify-between hover:border-[var(--color-primary-border)] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                        Create backup
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                        Last backup 8 minutes ago
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                </div>

                {/* Action 2: Send Announcement */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex items-center justify-between hover:border-[var(--color-primary-border)] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                        Send announcement
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                        Broadcast to all 48 players
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                </div>

                {/* Action 3: Schedule Restart */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex items-center justify-between hover:border-[var(--color-primary-border)] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                        Schedule restart
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                        Next restart today at 18:00
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                </div>

                {/* Action 4: Configuration Files */}
                <div className="col-span-12 sm:col-span-6 lg:col-span-3 figma-card p-4 flex items-center justify-between hover:border-[var(--color-primary-border)] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                        Configuration files
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                        Manage your server settings
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                </div>
              </div>
            </div>
          </section>{' '}
        </PageContainer>
      </AppShell>
    </ThemeProvider>
  );
}
export default App;
