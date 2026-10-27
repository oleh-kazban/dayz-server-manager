import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  GripVertical,
  HardDrive,
  History,
  Info,
  Layers,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Power,
  RotateCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { PageContainer } from '@dsm/components';
import { Button, StatusTag, Tag, type TagColor, Toggle } from '@dsm/ui';

const LOG_LEVEL_COLORS: Record<string, TagColor> = {
  INFO: 'sky',
  SAVE: 'emerald',
  WARN: 'amber',
  ERROR: 'rose',
};

/* --------------------------------------------------------------------------
   DUMMY PRESENTATION DATA
   Zero business logic - pure presentation markup matching design specification
   -------------------------------------------------------------------------- */

const KPI_CARDS = [
  {
    title: 'Players online',
    value: '48 / 60',
    subtitle: '80% capacity · 12 more than yesterday',
    icon: Users,
    iconColor: 'text-[var(--color-primary)]',
  },
  {
    title: 'CPU usage',
    value: '18%',
    subtitle: 'AMD Ryzen 9 7950X · 16 cores',
    icon: Cpu,
    iconColor: 'text-emerald-500',
  },
  {
    title: 'Memory',
    value: '5.4 / 16 GB',
    subtitle: '33.8% used · 10.6 GB available',
    icon: HardDrive,
    iconColor: 'text-amber-500',
  },
  {
    title: 'Server FPS',
    value: '59.8',
    subtitle: 'Optimal · Average latency 38 ms',
    icon: Activity,
    iconColor: 'text-sky-500',
  },
];

const ONLINE_PLAYERS = [
  {
    name: 'Wolfpack',
    steamId: '76561198001233812',
    session: '2h 14m',
    ping: '32 ms',
    location: 'Stary Sobor',
  },
  {
    name: 'TheWanderer',
    steamId: '76561198004381204',
    session: '1h 36m',
    ping: '41 ms',
    location: 'Chernogorsk',
  },
  {
    name: 'Rook',
    steamId: '76561198007845126',
    session: '48m',
    ping: '68 ms',
    location: 'Elektrozavodsk',
  },
];

const WHITELIST_PLAYERS = [
  { name: 'Wolfpack · …3812', date: '20 Oct, 2026' },
  { name: 'Mila · …6408', date: '18 Oct, 2026' },
  { name: 'NorthStar · …9125', date: '16 Oct, 2026' },
];

const ACTIVE_BANS = [
  { name: 'Ghost_47 · Cheating', expires: 'Permanent' },
  { name: 'RedFox · Combat logging', expires: '22 Oct, 18:00' },
  { name: 'Kobra · Harassment', expires: '27 Oct, 14:00' },
];

const MODS = [
  {
    name: 'CF · Community Framework',
    workshopId: '1559212036',
    version: '1.0.468',
    status: 'Up to date',
    enabled: true,
  },
  {
    name: 'Community Online Tools',
    workshopId: '1564026768',
    version: '1.26.0',
    status: 'Up to date',
    enabled: true,
  },
  {
    name: 'DayZ Expansion',
    workshopId: '2116151222',
    version: '1.9.40',
    status: 'Update',
    enabled: true,
  },
  {
    name: 'DayZ Expansion · Core',
    workshopId: '2291785308',
    version: '1.9.40',
    status: 'Up to date',
    enabled: true,
  },
  {
    name: 'DayZ Expansion · Vehicles',
    workshopId: '2291785437',
    version: '1.9.40',
    status: 'Up to date',
    enabled: true,
  },
  {
    name: 'DayZ Expansion · Licensed',
    workshopId: '2116157322',
    version: '1.9.40',
    status: 'Up to date',
    enabled: true,
  },
];

const LOG_ENTRIES = [
  {
    time: '14:32:18',
    level: 'INFO',
    levelColor: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    source: 'Connection',
    message: 'Player "Wolfpack" connected (Steam: …3812)',
  },
  {
    time: '14:32:16',
    level: 'INFO',
    levelColor: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    source: 'BattlEye',
    message: 'Client verified · session authorized · 185.38.151.42',
  },
  {
    time: '14:31:52',
    level: 'SAVE',
    levelColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    source: 'Persistence',
    message: 'World persistence saved successfully (1.42s)',
  },
  {
    time: '14:30:42',
    level: 'WARN',
    levelColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    source: 'Network',
    message: 'Player "Rook" latency exceeded 180 ms (resolved at 14:31:02)',
  },
  {
    time: '14:28:09',
    level: 'ERROR',
    levelColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    source: 'Workshop',
    message: 'Expansion update download failed · retry scheduled in 5 min',
  },
  {
    time: '14:24:00',
    level: 'INFO',
    levelColor: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    source: 'Backup',
    message: 'Configuration backup complete → chernarus_2026-10-20_1424',
  },
  {
    time: '14:22:35',
    level: 'INFO',
    levelColor: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    source: 'Admin',
    message: 'Mila Varga added "NorthStar" to the whitelist',
  },
  {
    time: '14:18:02',
    level: 'INFO',
    levelColor: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    source: 'Scheduler',
    message: 'Scheduled restart at 18:00 · player warnings enabled',
  },
];

const BACKUP_ENTRIES = [
  {
    name: 'chernarus_2026-10-20_1424',
    createdBy: 'Alex Kovac',
    size: '4.8 MB',
  },
  {
    name: 'chernarus_2026-10-20_0600',
    createdBy: 'Scheduled task',
    size: '4.7 MB',
  },
  {
    name: 'chernarus_2026-10-19_1800',
    createdBy: 'Before restart',
    size: '4.7 MB',
  },
  {
    name: 'chernarus_2026-10-19_0600',
    createdBy: 'Scheduled task',
    size: '4.6 MB',
  },
];

const SCHEDULED_TASKS = [
  {
    title: 'Scheduled server restart',
    description: 'Warn players 15, 5 and 1 minute before restart',
    schedule: 'Every 6 hours',
    cron: '0 */6 * * *',
    nextRun: 'Today, 18:00',
    enabled: true,
  },
  {
    title: 'Configuration backup',
    description: 'Save configs · retain 14 daily restore points',
    schedule: 'Every day at 06:00',
    cron: '0 6 * * *',
    nextRun: 'Tomorrow, 06:00',
    enabled: true,
  },
  {
    title: 'Community announcement',
    description: 'Broadcast Discord link and server rules',
    schedule: 'Every 2 hours',
    cron: '0 */2 * * *',
    nextRun: 'Today, 16:00',
    enabled: true,
  },
  {
    title: 'Clean old server logs',
    description: 'Remove archived logs older than 30 days',
    schedule: 'Sundays at 04:00',
    cron: '0 4 * * 0',
    nextRun: 'Paused',
    enabled: false,
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Alex Kovac (you)',
    email: 'alex@outlive.gg',
    initials: 'AK',
    role: 'Owner',
    activeText: 'Active now',
    locked: true,
  },
  {
    name: 'Mila Varga',
    email: 'mila@outlive.gg',
    initials: 'MV',
    role: 'Administrator',
    activeText: '12 min ago',
  },
  {
    name: 'Jonas Toth',
    email: 'jonas@outlive.gg',
    initials: 'JT',
    role: 'Moderator',
    activeText: '1 hour ago',
  },
  {
    name: 'Eva Horak',
    email: 'eva@outlive.gg',
    initials: 'EH',
    role: 'Viewer',
    activeText: 'Invite pending',
  },
];

export function ServerManager() {
  return (
    <PageContainer>
      {/* ================================================================
          SECTION 1: PAGE INTRODUCTION & HERO SERVER BANNER
          ================================================================ */}
      <section aria-labelledby="server-mgmt-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              id="server-mgmt-heading"
              className="text-2xl sm:text-[27px] font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Server management
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5">
              A healthy world. A connected community. Everything under control.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>View audit trail</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Open console</span>
            </button>
          </div>
        </div>

        {/* Hero Server Banner */}
        <div className="relative rounded-2xl overflow-hidden min-h-[220px] p-6 sm:p-7 flex flex-col justify-between shadow-[var(--shadow-card)] border border-[#203b50]/20 bg-[#142534]">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: "url('/assets/images/misty-chernarus-bg.jpg')" }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(16, 29, 41, 0.92) 0%, rgba(20, 37, 52, 0.80) 50%, rgba(14, 25, 36, 0.94) 100%)',
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white tracking-wider">
                <span>DAYZ / DEDICATED SERVER</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-6 border-t border-white/10">
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

            <div className="text-xs text-slate-300">
              Next restart today at 18:00 ·{' '}
              <span className="text-amber-300 font-medium">3h 28m remaining</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 2: SERVER METRICS & TELEMETRY
          ================================================================ */}
      <section aria-labelledby="metrics-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="metrics-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Server metrics
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Live performance from your Frankfurt node. Updated every 15 seconds.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Healthy</span>
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors"
            >
              <span>Last 6 hours</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Export metrics</span>
            </button>
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.title}
                className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{kpi.title}</span>
                  <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
                  {kpi.value}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {kpi.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        {/* 3 Area Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Player Activity */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-main)]">
                Player activity
              </span>
              <span className="text-xs font-bold text-[var(--color-primary)]">48 online</span>
            </div>
            <div className="h-28 w-full pt-2">
              <svg viewBox="0 0 300 90" className="w-full h-full overflow-visible">
                <path
                  d="M0,70 Q40,65 75,55 T150,30 T225,45 T300,20 L300,90 L0,90 Z"
                  fill="url(#blue-gradient)"
                  opacity="0.25"
                />
                <path
                  d="M0,70 Q40,65 75,55 T150,30 T225,45 T300,20"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2.5"
                />
                <defs>
                  <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
              <span>08:30 · 14:30</span>
              <span>Peak 56 · 36 average</span>
            </div>
          </div>

          {/* CPU Utilization */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-main)]">
                CPU utilization
              </span>
              <span className="text-xs font-bold text-emerald-500">18%</span>
            </div>
            <div className="h-28 w-full pt-2">
              <svg viewBox="0 0 300 90" className="w-full h-full overflow-visible">
                <path
                  d="M0,80 Q50,75 80,60 T160,65 T240,50 T300,55 L300,90 L0,90 Z"
                  fill="url(#emerald-gradient)"
                  opacity="0.2"
                />
                <path
                  d="M0,80 Q50,75 80,60 T160,65 T240,50 T300,55"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
                <defs>
                  <linearGradient id="emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
              <span>08:30 · 14:30</span>
              <span>Peak 29% · 20% average</span>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-main)]">
                Memory usage
              </span>
              <span className="text-xs font-bold text-indigo-500">5.4 GB</span>
            </div>
            <div className="h-28 w-full pt-2">
              <svg viewBox="0 0 300 90" className="w-full h-full overflow-visible">
                <path
                  d="M0,60 Q60,58 120,55 T200,54 T300,52 L300,90 L0,90 Z"
                  fill="url(#indigo-gradient)"
                  opacity="0.2"
                />
                <path
                  d="M0,60 Q60,58 120,55 T200,54 T300,52"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />
                <defs>
                  <linearGradient id="indigo-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
              <span>08:30 · 14:30</span>
              <span>Peak 5.6 GB · 16 GB allocated</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 3: LIVE WORLD & LOOT MAP
          ================================================================ */}
      <section aria-labelledby="map-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="map-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Live world &amp; loot map
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Chernarus · 225 km² · See your community and the world they inhabit.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live · updated 2s ago</span>
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Map Canvas with Tactical Markers & Right Telemetry Drawer */}
        <div className="relative rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[#c7d5b8] dark:bg-[#192419] min-h-[460px] shadow-sm">
          {/* Topographic Background Simulation */}
          <div
            className="absolute inset-0 opacity-40 dark:opacity-25 bg-cover bg-center pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(132, 169, 140, 0.4) 0%, rgba(82, 121, 111, 0.6) 100%)',
            }}
          />

          {/* Tactical Town Names */}
          <div className="absolute inset-0 p-6 pointer-events-none select-none text-[11px] font-semibold text-slate-700/80 dark:text-slate-300/80">
            <div className="absolute top-16 left-28">Northwest airfield</div>
            <div className="absolute top-28 left-48">Vybor</div>
            <div className="absolute top-44 left-1/2">Stary Sobor</div>
            <div className="absolute top-32 right-36">Gorka</div>
            <div className="absolute top-48 right-20">Berezino</div>
            <div className="absolute bottom-24 left-24">Zelenogorsk</div>
            <div className="absolute bottom-16 left-1/2">Chernogorsk</div>
            <div className="absolute bottom-20 right-40">Elektrozavodsk</div>
          </div>

          {/* Simulated Tactical Markers */}
          <div className="absolute top-48 left-1/2 -translate-x-1/2">
            <StatusTag variant="solid" status="primary" shape="pill" ping className="shadow-lg">
              Wolfpack
            </StatusTag>
          </div>

          <div className="absolute bottom-20 left-1/2 -translate-x-12">
            <StatusTag variant="solid" status="success" shape="pill" className="shadow-md">
              TheWanderer
            </StatusTag>
          </div>

          <div className="absolute bottom-24 right-44">
            <StatusTag variant="solid" status="success" shape="pill" className="shadow-md">
              Rook
            </StatusTag>
          </div>

          {/* Map Footer Legend */}
          <div className="absolute bottom-4 left-4 flex items-center gap-4 px-3 py-1.5 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
              <span>Player</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Loot spawn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Base</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] border-l border-[var(--color-border)] pl-3">
              Positions visible to admins only
            </span>
          </div>

          {/* Right Floating Map Drawer: Layers & Players In View */}
          <div className="hidden lg:block absolute top-4 right-4 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md shadow-xl p-4 space-y-4">
            {/* Map Layers */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-main)]">
                <span>Map layers</span>
                <Layers className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Players (48 online)</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    aria-label="Toggle players layer"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Loot spawns (1,248)</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    aria-label="Toggle loot spawns layer"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Player bases (18)</span>
                  <input
                    type="checkbox"
                    aria-label="Toggle player bases layer"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-main)]">Players in view</span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  11 of 48
                </span>
              </div>

              <div className="space-y-1.5">
                {ONLINE_PLAYERS.map(p => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-xs transition-colors"
                  >
                    <div>
                      <div className="font-medium text-[var(--color-text-main)]">{p.name}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{p.location}</div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-500">{p.ping}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="w-full text-center text-xs font-medium text-[var(--color-primary)] hover:underline pt-1"
              >
                View Wolfpack&apos;s profile ↗
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 4: GENERAL SETTINGS
          ================================================================ */}
      <section aria-labelledby="general-settings-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="general-settings-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              General settings
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Make this world your own. Public details appear in the DayZ server browser.
            </p>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            All changes saved
          </span>
        </div>

        <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Form: Public Metadata */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="server-name"
                  className="text-xs font-medium text-[var(--color-text-main)]"
                >
                  Server name
                </label>
                <input
                  id="server-name"
                  type="text"
                  defaultValue="Chernarus Survival"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  A clear, recognizable name for your community. 17 / 64 characters
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="server-desc"
                  className="text-xs font-medium text-[var(--color-text-main)]"
                >
                  Server description
                </label>
                <textarea
                  id="server-desc"
                  rows={3}
                  defaultValue="An immersive Vanilla+ survival experience. First-person only, no safe zones, and a community built on fair play. Join us at discord.gg/outlive."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[var(--color-text-main)]">
                  Server tags
                </span>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {['1PP', 'Vanilla+', 'PvP', 'No safe zones'].map(tag => (
                    <Tag
                      key={tag}
                      variant="neutral"
                      onRemove={() => {}}
                      removeAriaLabel={`Remove ${tag}`}
                    >
                      {tag}
                    </Tag>
                  ))}
                  <Button variant="secondary" leftIcon={Plus}>
                    Add tag
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Form: Engine & Region Parameters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="map-select"
                    className="text-xs font-medium text-[var(--color-text-main)]"
                  >
                    Map
                  </label>
                  <select
                    id="map-select"
                    defaultValue="Chernarus+"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                  >
                    <option value="Chernarus+">Chernarus+</option>
                    <option value="Livonia">Livonia</option>
                    <option value="Sakhal">Sakhal</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="slots-select"
                    className="text-xs font-medium text-[var(--color-text-main)]"
                  >
                    Player slots
                  </label>
                  <select
                    id="slots-select"
                    defaultValue="60"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                  >
                    <option value="40">40</option>
                    <option value="60">60</option>
                    <option value="80">80</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="region-select"
                    className="text-xs font-medium text-[var(--color-text-main)]"
                  >
                    Region
                  </label>
                  <select
                    id="region-select"
                    defaultValue="Frankfurt, DE"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                  >
                    <option value="Frankfurt, DE">Frankfurt, DE</option>
                    <option value="London, UK">London, UK</option>
                    <option value="New York, US">New York, US</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="tz-select"
                    className="text-xs font-medium text-[var(--color-text-main)]"
                  >
                    Server time
                  </label>
                  <select
                    id="tz-select"
                    defaultValue="UTC +02:00"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                  >
                    <option value="UTC +02:00">UTC +02:00</option>
                    <option value="UTC +00:00">UTC +00:00</option>
                    <option value="UTC -05:00">UTC -05:00</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[var(--color-text-main)]">
                      Show in server browser
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      Let new survivors discover your world.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    aria-label="Show in server browser"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-[var(--color-text-main)]">
                      Password protection
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      Allow access with a shared password.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Password protection"
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
                <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <span>Name, description and tag changes take effect after the next restart.</span>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Last edited today at 14:24 by Alex Kovac
            </span>

            <div className="flex items-center gap-2.5 self-end">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Discard changes
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm"
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 5: TEAM & ACCESS
          ================================================================ */}
      <section aria-labelledby="team-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="team-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Team &amp; access
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Give the right people the right permissions. Access is scoped to Chernarus Survival.
            </p>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm self-start sm:self-auto"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <span>Role permissions</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members Table */}
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th scope="col" className="p-3 pl-4">
                    Member
                  </th>
                  <th scope="col" className="p-3">
                    Server role
                  </th>
                  <th scope="col" className="p-3">
                    Last active
                  </th>
                  <th scope="col" className="p-3 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {TEAM_MEMBERS.map(m => (
                  <tr
                    key={m.email}
                    className="hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold flex items-center justify-center text-[11px]">
                          {m.initials}
                        </div>
                        <div>
                          <div className="font-medium text-[var(--color-text-main)]">{m.name}</div>
                          <div className="text-[11px] text-[var(--color-text-muted)]">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-[var(--color-text-secondary)]">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--color-text-muted)]">{m.activeText}</td>
                    <td className="p-3 pr-4 text-right">
                      {m.locked ? (
                        <Shield className="w-3.5 h-3.5 text-[var(--color-text-muted)] inline-block" />
                      ) : (
                        <Button
                          variant="ghost"
                          aria-label={`Options for ${m.name}`}
                          leftIcon={MoreHorizontal}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invitation Card */}
          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-main)]">
              <UserPlus className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Add a team member</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="invite-email"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="survivor@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="invite-role"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Server role
                </label>
                <select
                  id="invite-role"
                  defaultValue="Moderator"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <p className="text-[10px] text-[var(--color-text-muted)] pt-0.5 leading-relaxed">
                  Can manage players, whitelist entries and bans. Cannot change configs or halt the
                  server.
                </p>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-colors mt-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send invitation</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <span>
            Administrator: full server access · Moderator: players &amp; logs · Viewer: read-only.
            Only the owner can manage billing or transfer ownership.
          </span>
        </div>
      </section>

      {/* ================================================================
          SECTION 6: PLAYER MANAGEMENT & MODERATION
          ================================================================ */}
      <section aria-labelledby="player-mgmt-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="player-mgmt-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Player management
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Keep your community welcoming and your server fair. All moderation actions are
              recorded.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Export players</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm"
            >
              <Send className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Send announcement</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              type="button"
              className="text-[var(--color-primary)] font-semibold flex items-center gap-1.5 pb-1 border-b-2 border-[var(--color-primary)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>48 online</span>
            </button>
            <button
              type="button"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] flex items-center gap-1.5"
            >
              <span>126 whitelisted</span>
            </button>
            <button
              type="button"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] flex items-center gap-1.5"
            >
              <span>8 active bans</span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] min-w-[220px]">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Search player or Steam ID…"
              className="bg-transparent border-none outline-none text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full"
            />
          </div>
        </div>

        {/* Online Players Table */}
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th scope="col" className="p-3 pl-4">
                  Online player
                </th>
                <th scope="col" className="p-3">
                  Steam ID
                </th>
                <th scope="col" className="p-3">
                  Session
                </th>
                <th scope="col" className="p-3">
                  Latency
                </th>
                <th scope="col" className="p-3">
                  Location
                </th>
                <th scope="col" className="p-3 pr-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {ONLINE_PLAYERS.map(player => (
                <tr
                  key={player.steamId}
                  className="hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="p-3 pl-4 font-semibold text-[var(--color-text-main)]">
                    {player.name}
                  </td>
                  <td className="p-3 font-mono text-[var(--color-text-muted)]">{player.steamId}</td>
                  <td className="p-3 text-[var(--color-text-secondary)]">{player.session}</td>
                  <td className="p-3 font-mono text-emerald-500">{player.ping}</td>
                  <td className="p-3 text-[var(--color-text-secondary)]">{player.location}</td>
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-[11px]">
                      <Button variant="text">Profile</Button>
                      <span className="text-[var(--color-border)]">·</span>
                      <Button variant="text" destructive>
                        Kick
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-3 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
            <span>Showing 3 of 48 online players</span>
            <Button variant="text" rightIcon={ArrowRight}>
              View all players
            </Button>
          </div>
        </div>

        {/* Dual Moderation Panels: Whitelist & Active Bans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Whitelist Panel */}
          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-[var(--color-text-main)]">
                  Whitelist
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[10px] text-[var(--color-text-muted)] font-mono">
                  126
                </span>
              </div>
              <Toggle
                label="Enforced"
                defaultChecked
                aria-label="Enforce whitelist"
                labelPosition="left"
              />
            </div>

            <div className="divide-y divide-[var(--color-border)] text-xs">
              {WHITELIST_PLAYERS.map(item => (
                <div key={item.name} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--color-text-main)]">{item.name}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{item.date}</div>
                  </div>
                  <Button variant="text" destructive>
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Add player by Steam ID"
                defaultValue="76561198012345678"
                className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
              />
              <Button variant="primary">Whitelist</Button>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Only whitelisted players can join while enforcement is enabled.
            </p>
          </div>

          {/* Active Bans Panel */}
          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-semibold text-[var(--color-text-main)]">
                  Active bans
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[10px] text-[var(--color-text-muted)] font-mono">
                  8
                </span>
              </div>
              <Button variant="text" rightIcon={ArrowUpRight}>
                View ban history
              </Button>
            </div>

            <div className="divide-y divide-[var(--color-border)] text-xs">
              {ACTIVE_BANS.map(ban => (
                <div key={ban.name} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--color-text-main)]">{ban.name}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">
                      Expires: {ban.expires}
                    </div>
                  </div>
                  <Button variant="text">Unban</Button>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Steam ID"
                  defaultValue="76561198…"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                />
                <select
                  defaultValue="7 days"
                  className="px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="24 hours">24 hours</option>
                  <option value="7 days">7 days</option>
                  <option value="Permanent">Permanent</option>
                </select>
                <Button variant="secondary" destructive>
                  Ban player
                </Button>
              </div>
              <input
                type="text"
                placeholder="Ban reason (required) · Describe violation for audit log…"
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 7: MODS MANAGEMENT (WORKSHOP)
          ================================================================ */}
      <section aria-labelledby="mods-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="mods-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Mods management
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Build your Vanilla+ experience. Dependencies are checked before installation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Tag variant="subtle" color="amber">
              1 update available
            </Tag>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm"
            >
              <RotateCw className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Check for updates</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mods Table */}
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs">
              <span className="font-semibold text-[var(--color-text-main)]">
                12 installed · 12 enabled
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 cursor-pointer">
                <span>Load order</span>
                <ArrowUp className="w-3 h-3" />
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th scope="col" className="p-3 pl-4">
                    Mod / Workshop ID
                  </th>
                  <th scope="col" className="p-3">
                    Version
                  </th>
                  <th scope="col" className="p-3">
                    Status
                  </th>
                  <th scope="col" className="p-3 pr-4 text-right">
                    Enabled
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {MODS.map(mod => (
                  <tr
                    key={mod.workshopId}
                    className="hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <GripVertical className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-grab" />
                        <div>
                          <div className="font-medium text-[var(--color-text-main)]">
                            {mod.name}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {mod.workshopId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[var(--color-text-secondary)]">
                      {mod.version}
                    </td>
                    <td className="p-3">
                      {mod.status === 'Update' ? (
                        <Tag variant="subtle" color="amber">
                          Update
                        </Tag>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Up to date
                        </span>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <input
                        type="checkbox"
                        defaultChecked={mod.enabled}
                        aria-label={`Toggle mod ${mod.name}`}
                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t border-[var(--color-border)] text-center text-xs">
              <Button variant="text" rightIcon={ArrowRight}>
                Show all 12 mods
              </Button>
            </div>
          </div>

          {/* Add a Mod Installer Card */}
          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-main)]">
              <Plus className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Add a mod</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="mod-url"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Steam Workshop URL or ID
                </label>
                <input
                  id="mod-url"
                  type="text"
                  placeholder="https://steamcommunity.com/…"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                />
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Paste a Workshop item URL or numeric ID.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="mod-load-type"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Load as
                </label>
                <select
                  id="mod-load-type"
                  defaultValue="Client + server mod"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="Client + server mod">Client + server mod</option>
                  <option value="Server-only mod">Server-only mod</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Install dependencies automatically
                </span>
                <input
                  type="checkbox"
                  defaultChecked
                  aria-label="Install dependencies automatically"
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                />
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-colors mt-2"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Find mod</span>
              </button>

              <p className="text-[10px] text-[var(--color-text-muted)] text-center pt-1">
                New mods and updates are staged until the next server restart.
              </p>

              <div className="pt-2 border-t border-[var(--color-border)] text-center">
                <a
                  href="/editor"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Types.xml Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 8: SERVER LOGS & EVENT STREAM
          ================================================================ */}
      <section aria-labelledby="logs-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="logs-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Server logs
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              The full story of your server, one event at a time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Toggle
              label="Auto-scroll"
              defaultChecked
              aria-label="Toggle log auto-scroll"
              labelPosition="left"
            />
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm"
            >
              <Pause className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Pause stream</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Export logs</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="px-2.5 py-1 rounded-md bg-[var(--color-primary)] text-white text-xs font-semibold"
            >
              All events 248
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-secondary)]"
            >
              Info 231
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs text-amber-500"
            >
              Warnings 16
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs text-rose-500"
            >
              Errors 1
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] min-w-[200px]">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Search logs…"
                className="bg-transparent border-none outline-none text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] w-full"
              />
            </div>
            <select
              defaultValue="All sources"
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-main)] focus:outline-none"
            >
              <option value="All sources">All sources</option>
              <option value="Connection">Connection</option>
              <option value="BattlEye">BattlEye</option>
              <option value="Workshop">Workshop</option>
            </select>
            <select
              defaultValue="Last hour"
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-main)] focus:outline-none"
            >
              <option value="Last hour">Last hour</option>
              <option value="Last 6 hours">Last 6 hours</option>
              <option value="Today">Today</option>
            </select>
          </div>
        </div>

        {/* Log Stream Output */}
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider font-sans">
                <th scope="col" className="p-2.5 pl-4 w-32">
                  Time (UTC +02)
                </th>
                <th scope="col" className="p-2.5 w-20">
                  Level
                </th>
                <th scope="col" className="p-2.5 w-32">
                  Source
                </th>
                <th scope="col" className="p-2.5 pr-4">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {LOG_ENTRIES.map((log, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="p-2.5 pl-4 text-[var(--color-text-muted)] text-[11px]">
                    {log.time}
                  </td>
                  <td className="p-2.5">
                    <Tag
                      variant="subtle"
                      color={LOG_LEVEL_COLORS[log.level] || 'sky'}
                      uppercase
                      mono
                    >
                      {log.level}
                    </Tag>
                  </td>
                  <td className="p-2.5 text-[var(--color-text-secondary)] font-sans text-xs">
                    {log.source}
                  </td>
                  <td className="p-2.5 pr-4 text-[var(--color-text-main)] font-sans text-xs">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live stream connected · 8 recent entries</span>
            </div>
            <span>Logs retained for 30 days · 24.8 MB today</span>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 9: CONFIGURATION BACKUPS
          ================================================================ */}
      <section aria-labelledby="backups-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="backups-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Configuration backups
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              A way back, whenever you need it. Back up server settings, economy files and mod
              configuration.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-secondary)] shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Upload backup</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create backup</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backups List */}
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-0">
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-[var(--color-text-main)]">
                  Latest backup verified
                </span>
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Today at 14:24 · 8 minutes ago
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th scope="col" className="p-3 pl-4">
                    Backup
                  </th>
                  <th scope="col" className="p-3">
                    Created by
                  </th>
                  <th scope="col" className="p-3">
                    Size
                  </th>
                  <th scope="col" className="p-3 pr-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {BACKUP_ENTRIES.map(b => (
                  <tr
                    key={b.name}
                    className="hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <td className="p-3 pl-4 font-mono font-medium text-[var(--color-text-main)]">
                      {b.name}
                    </td>
                    <td className="p-3 text-[var(--color-text-secondary)]">{b.createdBy}</td>
                    <td className="p-3 font-mono text-[var(--color-text-muted)]">{b.size}</td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-[11px]">
                        <Button variant="text">Download</Button>
                        <span className="text-[var(--color-border)]">·</span>
                        <Button variant="text">Restore</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>14 backups · 66.2 MB of 5 GB used</span>
              <Button variant="text" rightIcon={ArrowRight}>
                View full history
              </Button>
            </div>
          </div>

          {/* Restore Configuration Card */}
          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="text-xs font-semibold text-[var(--color-text-main)]">
              Restore a configuration
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="restore-point"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Restore point
                </label>
                <select
                  id="restore-point"
                  defaultValue="20 Oct, 2026 · 14:24"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="20 Oct, 2026 · 14:24">20 Oct, 2026 · 14:24</option>
                  <option value="20 Oct, 2026 · 06:00">20 Oct, 2026 · 06:00</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="restore-scope"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Restore scope
                </label>
                <select
                  id="restore-scope"
                  defaultValue="All configuration files"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="All configuration files">All configuration files</option>
                  <option value="types.xml only">types.xml only</option>
                  <option value="serverDZ.cfg only">serverDZ.cfg only</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Create safety backup first
                </span>
                <input
                  type="checkbox"
                  defaultChecked
                  aria-label="Create safety backup first"
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  Restoring replaces current configuration. The server must be stopped before
                  applying the restore.
                </span>
              </div>

              <button
                type="button"
                className="w-full py-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-text-main)] shadow-sm transition-colors"
              >
                Review restore
              </button>

              <p className="text-[10px] text-[var(--color-text-muted)] text-center">
                Retention: 14 days · Automatic backups at 06:00
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <span>
            Includes serverDZ.cfg, types.xml, events.xml and mod configs. World persistence is
            backed up separately.
          </span>
        </div>
      </section>

      {/* ================================================================
          SECTION 10: SCHEDULED TASKS
          ================================================================ */}
      <section aria-labelledby="tasks-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="tasks-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Scheduled tasks
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Put routine maintenance on autopilot. All schedules use the server timezone, UTC
              +02:00.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-medium self-start sm:self-auto">
            3 active · 1 paused
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th scope="col" className="p-3 pl-4">
                  Task
                </th>
                <th scope="col" className="p-3">
                  Schedule / Cron
                </th>
                <th scope="col" className="p-3">
                  Next run
                </th>
                <th scope="col" className="p-3">
                  Enabled
                </th>
                <th scope="col" className="p-3 pr-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {SCHEDULED_TASKS.map(task => (
                <tr
                  key={task.title}
                  className="hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="p-3 pl-4">
                    <div className="font-semibold text-[var(--color-text-main)]">{task.title}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      {task.description}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-[var(--color-text-secondary)]">{task.schedule}</div>
                    <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                      {task.cron}
                    </div>
                  </td>
                  <td className="p-3 font-medium text-[var(--color-text-secondary)]">
                    {task.nextRun}
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      defaultChecked={task.enabled}
                      aria-label={`Toggle task ${task.title}`}
                      className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                    />
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        aria-label={`Run ${task.title} now`}
                        leftIcon={Play}
                      />
                      <Button
                        variant="ghost"
                        aria-label={`Edit ${task.title}`}
                        leftIcon={Settings}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Task Builder Card */}
        <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-main)]">
            <Plus className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Create a scheduled task</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="task-name"
                className="text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Task name
              </label>
              <input
                id="task-name"
                type="text"
                defaultValue="Daily maintenance"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="task-action"
                className="text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Action
              </label>
              <select
                id="task-action"
                defaultValue="Create config backup"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
              >
                <option value="Create config backup">Create config backup</option>
                <option value="Restart server">Restart server</option>
                <option value="Broadcast announcement">Broadcast announcement</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="task-cron"
                className="text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Cron expression
              </label>
              <input
                id="task-cron"
                type="text"
                defaultValue="0 3 * * *"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs font-mono text-[var(--color-text-main)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="task-tz"
                className="text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Timezone
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="task-tz"
                  defaultValue="UTC +02:00"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="UTC +02:00">UTC +02:00</option>
                  <option value="UTC +00:00">UTC +00:00</option>
                </select>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shrink-0 shadow-sm transition-colors"
                >
                  Create task
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--color-text-muted)] pt-1 gap-2 border-t border-[var(--color-border)]">
            <span>Runs every day at 03:00 · Next run tomorrow, 21 Oct at 03:00</span>
            <button
              type="button"
              className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Cron syntax guide</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 11: CRITICAL SERVER CONTROLS
          ================================================================ */}
      <section aria-labelledby="controls-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="controls-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-main)]"
            >
              Server controls
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Planned maintenance, not surprises. Keep players informed before taking your world
              offline.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Server running</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restart Server */}
          <div className="p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-xs font-semibold text-[var(--color-text-main)]">
                Restart server
              </span>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Save the world, disconnect players and bring the server back online. Staged mod and
              config changes will be applied.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-1">
                <label
                  htmlFor="warning-countdown"
                  className="text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  Player warning
                </label>
                <select
                  id="warning-countdown"
                  defaultValue="5 minutes before restart"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                >
                  <option value="Immediate (no warning)">Immediate (no warning)</option>
                  <option value="5 minutes before restart">5 minutes before restart</option>
                  <option value="15 minutes before restart">15 minutes before restart</option>
                </select>
              </div>

              <button
                type="button"
                className="sm:mt-5 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Schedule restart
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="save-persistence-checkbox"
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
              />
              <label
                htmlFor="save-persistence-checkbox"
                className="text-xs text-[var(--color-text-secondary)] cursor-pointer"
              >
                Save world persistence before restarting
              </label>
            </div>
          </div>

          {/* Halt Server (High Risk) */}
          <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/[0.03] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Halt server
              </span>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Stop Chernarus Survival and disconnect all 48 players. Your world stays offline until
              you start the server again.
            </p>

            <div className="pt-2 space-y-2">
              <label
                htmlFor="confirm-server-halt"
                className="text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Type the server name to confirm
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="confirm-server-halt"
                  type="text"
                  placeholder="Chernarus Survival"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-main)] focus:outline-none"
                />
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                >
                  Halt server
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                Requires confirmation · World persistence is saved before shutdown
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <span>
            All power actions are logged. The next automatic restart is today at 18:00. Halting the
            server pauses scheduled restarts until it is started again.
          </span>
        </div>
      </section>
    </PageContainer>
  );
}
