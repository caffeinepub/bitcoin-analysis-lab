import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnticipationAnalysis,
  Event as BtcEvent,
  ContextAnalysis,
  EventStats,
  PricePoint,
} from "./backend.d";
import { EventType } from "./backend.d";
import { useActor } from "./hooks/useActor";

// ─── color maps ──────────────────────────────────────────────
const EVENT_COLORS: Record<string, string> = {
  [EventType.halving]: "#F59E0B",
  [EventType.crisis]: "#EF4444",
  [EventType.fedEvent]: "#3B82F6",
  [EventType.macro]: "#8B5CF6",
};

const EVENT_LABELS: Record<string, string> = {
  [EventType.halving]: "Halving",
  [EventType.crisis]: "Crise",
  [EventType.fedEvent]: "Fed",
  [EventType.macro]: "Macro",
};

type FilterType = "all" | EventType;
type PeriodFilter = "1A" | "2A" | "3A" | "Tudo";

// ─── nav links ───────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Visão Geral", id: "visao-geral" },
  { label: "Gráficos", id: "graficos" },
  { label: "Histórico", id: "historico" },
  { label: "Eventos", id: "eventos" },
];

// ─── Cycle comparison data ───────────────────────────────────
const CYCLE_COLORS = {
  ciclo1: "#F59E0B",
  ciclo2: "#22C55E",
  ciclo3: "#3B82F6",
  ciclo4: "#EF4444",
};

const HALVING_INFO = [
  { date: new Date("2012-11-28"), price: 12.35 },
  { date: new Date("2016-07-09"), price: 650.0 },
  { date: new Date("2020-05-11"), price: 8821.0 },
  { date: new Date("2024-04-20"), price: 64000.0 },
];

type CyclePoint = {
  day: number;
  ciclo1?: number | null;
  ciclo2?: number | null;
  ciclo3?: number | null;
  ciclo4?: number | null;
};

function calculateCycleData(priceData: PricePoint[]): CyclePoint[] {
  const cycleKeys = ["ciclo1", "ciclo2", "ciclo3", "ciclo4"] as const;
  const cycleEnd = new Date("2028-03-01");
  const dayMap = new Map<number, CyclePoint>();

  for (const point of priceData) {
    const [year, month] = point.date.split("-").map(Number);
    const pointDate = new Date(year, month - 1, 15);

    for (const [idx, halving] of HALVING_INFO.entries()) {
      const nextHalving = HALVING_INFO[idx + 1];
      const end = nextHalving ? nextHalving.date : cycleEnd;

      if (pointDate >= halving.date && pointDate < end) {
        const daysAfterHalving = Math.floor(
          (pointDate.getTime() - halving.date.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const pctGain =
          Math.round(((point.price - halving.price) / halving.price) * 1000) /
          10;
        const key = cycleKeys[idx];

        if (!dayMap.has(daysAfterHalving)) {
          dayMap.set(daysAfterHalving, { day: daysAfterHalving });
        }
        dayMap.get(daysAfterHalving)![key] = pctGain;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
}

const BTC_ATH = 73835; // ATH de Março 2024
const LAST_HALVING_DATE = new Date("2024-04-20");
const CICLO4_CURRENT_DAY = Math.floor(
  (Date.now() - LAST_HALVING_DATE.getTime()) / (1000 * 60 * 60 * 24),
);
const CICLO4_TOTAL_DAYS = 1460;
const CICLO4_PROGRESS_PCT = Math.round(
  (CICLO4_CURRENT_DAY / CICLO4_TOTAL_DAYS) * 100,
);

// ─── helpers ─────────────────────────────────────────────────
function formatPriceFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string): string {
  const [year, month] = d.split("-");
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const m = Number.parseInt(month) - 1;
  return `${months[m] ?? ""} ${year}`;
}

function yAxisTickFormatter(value: number): string {
  if (value >= 100000) return `$${(value / 1000).toFixed(0)}k`;
  if (value >= 10000) return `$${(value / 1000).toFixed(0)}k`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

function cycleYAxisFormatter(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k%`;
  return `${value}%`;
}

// ─── ClickableEventLabel ─────────────────────────────────────
function ClickableEventLabel({
  evt,
  color,
  onSelect,
  viewBox,
}: {
  evt: BtcEvent;
  color: string;
  onSelect: (e: BtcEvent) => void;
  viewBox?: any;
}) {
  if (!viewBox) return null;
  const x = viewBox.x as number;
  const y = viewBox.y as number;
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") onSelect(evt);
  };
  return (
    <>
      <g
        transform={`translate(${x},${y})`}
        style={{ cursor: "pointer" }}
        onClick={() => onSelect(evt)}
        onKeyDown={handleKey}
        tabIndex={0}
        aria-label={evt.title}
        data-ocid="chart.event.button"
      >
        <rect
          x={-12}
          y={-18}
          width={24}
          height={16}
          rx={3}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={0.5}
        />
        <text
          x={0}
          y={-6}
          textAnchor="middle"
          fill={color}
          fontSize={9}
          fontWeight={600}
        >
          {EVENT_LABELS[evt.eventType] ?? ""}
        </text>
      </g>
    </>
  );
}

// ─── EventDot component ──────────────────────────────────────
function EventDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0 mt-0.5"
      style={{ width: 10, height: 10, backgroundColor: color }}
    />
  );
}

// ─── custom tooltip ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold" style={{ color: "#4F8BFF" }}>
        {formatPriceFull(payload[0]?.value)}
      </p>
    </div>
  );
}

// ─── Cycle tooltip ───────────────────────────────────────────
function CycleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-card text-sm min-w-[160px]">
      <p className="text-muted-foreground mb-2 text-xs">Dia {label}</p>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-4 mb-1"
        >
          <span className="text-xs" style={{ color: p.color }}>
            {p.name}
          </span>
          <span className="font-semibold text-xs" style={{ color: p.color }}>
            {p.value != null ? `+${p.value.toLocaleString("pt-BR")}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  loading,
  badge,
}: {
  label: string;
  value: string;
  color: string;
  loading: boolean;
  badge?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {badge && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
          >
            {badge}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <span className="text-2xl font-bold" style={{ color }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

type SortCol = "date" | "title" | "priceAtEvent" | "priceImpactPercent";
type SortDir = "asc" | "desc";

const SKELETON_SIDEBAR = ["s1", "s2", "s3", "s4", "s5", "s6"];
const SKELETON_CHART = ["c1", "c2", "c3", "c4", "c5"];

// ─── Period filter helper ─────────────────────────────────────
function getPeriodCutoff(period: PeriodFilter): string | null {
  if (period === "Tudo") return null;
  const months = period === "1A" ? 12 : period === "2A" ? 24 : 36;
  const now = new Date("2026-04-01");
  now.setMonth(now.getMonth() - months);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const { actor, isFetching } = useActor();
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [events, setEvents] = useState<BtcEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [contextAnalysis, setContextAnalysis] =
    useState<ContextAnalysis | null>(null);
  const [anticipationAnalysis, setAnticipationAnalysis] =
    useState<AnticipationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [currentBtcPrice, setCurrentBtcPrice] = useState<number | null>(null);

  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedEvent, setSelectedEvent] = useState<BtcEvent | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("Tudo");

  // Table state
  const [tableFilter, setTableFilter] = useState<FilterType>("all");
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Fetch live BTC price from Binance
  useEffect(() => {
    const fetchBinancePrice = () => {
      fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
        .then((res) => res.json())
        .then((data) => {
          const price = Number.parseFloat(data.price);
          if (!Number.isNaN(price)) setCurrentBtcPrice(price);
        })
        .catch((err) => console.error("Binance price fetch failed:", err));
    };
    fetchBinancePrice();
    const interval = setInterval(fetchBinancePrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!actor || isFetching) return;
    setLoading(true);
    Promise.all([
      actor.getPriceWindow("2012-01", "2024-12"),
      actor.getEvents(),
      actor.getEventStats(),
      actor.analyzeCurrentContext(),
      actor.analyzeAnticipation(),
    ])
      .then(([prices, evts, evtStats, ctx, anticipation]) => {
        setPriceData(prices);
        setEvents(evts);
        setStats(evtStats);
        setContextAnalysis(ctx);
        setAnticipationAnalysis(anticipation);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Backend error:", err);
        setBackendError(String(err));
        setLoading(false);
      });
  }, [actor, isFetching]);

  const latestPrice =
    priceData.length > 0 ? priceData[priceData.length - 1].price : 0;

  const filteredEvents =
    filter === "all" ? events : events.filter((e) => e.eventType === filter);

  const allChartData = priceData.map((p) => ({ date: p.date, price: p.price }));

  const calculatedCycleData = useMemo(
    () => calculateCycleData(priceData),
    [priceData],
  );

  const chartData = useMemo(() => {
    const cutoff = getPeriodCutoff(periodFilter);
    if (!cutoff) return allChartData;
    return allChartData.filter((p) => p.date >= cutoff);
  }, [allChartData, periodFilter]);

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: "Todos", value: "all" },
    { label: "Halvings", value: EventType.halving },
    { label: "Crises", value: EventType.crisis },
    { label: "Fed", value: EventType.fedEvent },
    { label: "Macro", value: EventType.macro },
  ];

  const periodButtons: { label: string; value: PeriodFilter }[] = [
    { label: "1A", value: "1A" },
    { label: "2A", value: "2A" },
    { label: "3A", value: "3A" },
    { label: "Tudo", value: "Tudo" },
  ];

  const visibleEvents = useMemo(() => {
    const cutoff = getPeriodCutoff(periodFilter);
    return events.filter((e) => {
      const eYear = Number.parseInt(e.date.split("-")[0]);
      if (eYear < 2012 || eYear > 2024) return false;
      if (cutoff && e.date < cutoff) return false;
      return true;
    });
  }, [events, periodFilter]);

  // Sorted & filtered table data
  const tableData = useMemo(() => {
    let rows =
      tableFilter === "all"
        ? [...events]
        : events.filter((e) => e.eventType === tableFilter);
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortCol === "date") cmp = a.date.localeCompare(b.date);
      else if (sortCol === "title") cmp = a.title.localeCompare(b.title);
      else if (sortCol === "priceAtEvent")
        cmp = a.priceAtEvent - b.priceAtEvent;
      else if (sortCol === "priceImpactPercent")
        cmp = a.priceImpactPercent - b.priceImpactPercent;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [events, tableFilter, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col)
      return <ChevronsUpDown className="inline w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="inline w-3 h-3 ml-1" />
    ) : (
      <ChevronDown className="inline w-3 h-3 ml-1" />
    );
  }

  const dynamicDaysSinceHalving = CICLO4_CURRENT_DAY;
  const dynamicPercentFromATH =
    currentBtcPrice != null
      ? ((currentBtcPrice - BTC_ATH) / BTC_ATH) * 100
      : null;

  return (
    <div className="min-h-screen bg-background font-sans">
      {backendError && (
        <div className="bg-red-900/80 border border-red-500 text-red-200 text-xs px-4 py-2 text-center">
          Erro ao conectar com o backend: {backendError}
        </div>
      )}
      {/* ── Header ── */}
      <header className="border-b border-border bg-card shadow-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold" style={{ color: "#F59E0B" }}>
              ₿
            </span>
            <span className="text-sm font-bold tracking-widest text-foreground">
              BTC ANALYTICS
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                type="button"
                key={link.id}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 p-0"
                onClick={() =>
                  document
                    .getElementById(link.id)
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                data-ocid={`nav.${link.id}.link`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Hero row ── */}
        <div
          id="visao-geral"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Análise de Preços do Bitcoin
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Laboratório de Análise Histórica
            </p>
          </div>
          {loading ? (
            <Skeleton className="h-10 w-40" data-ocid="hero.loading_state" />
          ) : (
            <div
              className="flex items-center gap-2 rounded-lg border px-4 py-2 shadow-card"
              style={{
                borderColor: "#F59E0B",
                background: "rgba(245,158,11,0.08)",
              }}
            >
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Último preço
              </span>
              <span className="text-lg font-bold" style={{ color: "#F59E0B" }}>
                {formatPriceFull(latestPrice)}
              </span>
            </div>
          )}
        </div>

        {/* ── Main 2-col grid ── */}
        <div
          id="graficos"
          className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 mb-6"
        >
          {/* ── Sidebar ── */}
          <aside
            className="rounded-lg border border-border bg-card shadow-card flex flex-col"
            data-ocid="events.panel"
          >
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Histórico de Eventos
              </h2>
            </div>
            {/* Filter pills */}
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {filterButtons.map((btn) => (
                <button
                  type="button"
                  key={btn.value}
                  onClick={() => setFilter(btn.value)}
                  className="text-xs px-3 py-1 rounded-full border transition-colors"
                  style={
                    filter === btn.value
                      ? {
                          background: "#F59E0B",
                          borderColor: "#F59E0B",
                          color: "#0B1016",
                          fontWeight: 600,
                        }
                      : {
                          background: "transparent",
                          borderColor: "oklch(0.21 0.028 240)",
                          color: "oklch(0.68 0.03 240)",
                        }
                  }
                  data-ocid={`events.${btn.value}.tab`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            {/* Event list */}
            <ScrollArea className="flex-1 px-3 pb-4" style={{ maxHeight: 500 }}>
              {loading ? (
                <div
                  className="space-y-3 px-1"
                  data-ocid="events.loading_state"
                >
                  {SKELETON_SIDEBAR.map((k) => (
                    <Skeleton key={k} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div
                  className="py-8 text-center text-muted-foreground text-sm"
                  data-ocid="events.empty_state"
                >
                  Nenhum evento encontrado.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEvents.map((evt, idx) => (
                    <button
                      type="button"
                      key={Number(evt.id)}
                      className="w-full flex items-start gap-3 rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors text-left bg-transparent border-0"
                      onClick={() => setSelectedEvent(evt)}
                      data-ocid={`events.item.${idx + 1}`}
                    >
                      <EventDot
                        color={EVENT_COLORS[evt.eventType] ?? "#9AA8B8"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight truncate">
                          {evt.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(evt.date)}
                        </p>
                      </div>
                      <Badge
                        className="text-xs flex-shrink-0 border-0"
                        style={{
                          background:
                            evt.priceImpactPercent >= 0
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            evt.priceImpactPercent >= 0 ? "#22C55E" : "#EF4444",
                        }}
                      >
                        {evt.priceImpactPercent >= 0 ? "+" : ""}
                        {evt.priceImpactPercent.toFixed(0)}%
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* ── Price Chart ── */}
          <section
            className="rounded-lg border border-border bg-card shadow-card p-5"
            data-ocid="chart.panel"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Evolução do Preço do Bitcoin (2012–2024)
              </h2>
              {/* Period filter buttons */}
              <div className="flex gap-1.5" data-ocid="chart.period.tab">
                {periodButtons.map((btn) => (
                  <button
                    type="button"
                    key={btn.value}
                    onClick={() => setPeriodFilter(btn.value)}
                    className="text-xs px-3 py-1 rounded border transition-colors font-medium"
                    style={
                      periodFilter === btn.value
                        ? {
                            background: "#F59E0B",
                            borderColor: "#F59E0B",
                            color: "#0B1016",
                          }
                        : {
                            background: "transparent",
                            borderColor: "oklch(0.21 0.028 240)",
                            color: "oklch(0.68 0.03 240)",
                          }
                    }
                    data-ocid={`chart.${btn.value}.toggle`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div
                className="h-96 flex flex-col gap-3 justify-end"
                data-ocid="chart.loading_state"
              >
                {SKELETON_CHART.map((k, i) => (
                  <Skeleton
                    key={k}
                    className="w-full"
                    style={{ height: `${20 + i * 14}%` }}
                  />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 24, right: 16, left: 8, bottom: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e2d3e"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9AA8B8", fontSize: 11 }}
                    axisLine={{ stroke: "#1e2d3e" }}
                    tickLine={false}
                    tickFormatter={(val: string) => val.split("-")[0]}
                    interval={
                      periodFilter === "1A"
                        ? 1
                        : periodFilter === "2A"
                          ? 3
                          : periodFilter === "3A"
                            ? 5
                            : 11
                    }
                  />
                  <YAxis
                    scale="log"
                    domain={[100, 200000]}
                    tick={{ fill: "#9AA8B8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={yAxisTickFormatter}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: 16,
                      fontSize: 12,
                      color: "#9AA8B8",
                    }}
                    formatter={(value) =>
                      value === "price" ? "Preço BTC" : value
                    }
                  />
                  {visibleEvents.map((evt) => (
                    <ReferenceLine
                      key={Number(evt.id)}
                      x={evt.date}
                      stroke={EVENT_COLORS[evt.eventType] ?? "#9AA8B8"}
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      strokeOpacity={0.7}
                      label={
                        <ClickableEventLabel
                          evt={evt}
                          color={EVENT_COLORS[evt.eventType] ?? "#9AA8B8"}
                          onSelect={setSelectedEvent}
                        />
                      }
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#4F8BFF"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#4F8BFF",
                      stroke: "#0B1016",
                      strokeWidth: 2,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {/* Legend for event colors */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-0.5"
                  style={{ background: "#4F8BFF", display: "inline-block" }}
                />
                <span className="text-xs text-muted-foreground">Preço BTC</span>
              </div>
              {Object.entries(EVENT_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <EventDot color={EVENT_COLORS[type]} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total de Eventos"
            value={stats ? String(Number(stats.totalEvents)) : "—"}
            color="#E8EEF6"
            loading={loading}
          />
          <StatCard
            label="Halvings"
            value={stats ? String(Number(stats.halvings)) : "—"}
            color="#F59E0B"
            loading={loading}
          />
          <StatCard
            label="Crises"
            value={stats ? String(Number(stats.crises)) : "—"}
            color="#EF4444"
            loading={loading}
          />
          <StatCard
            label="Eventos Fed"
            value={stats ? String(Number(stats.fedEvents)) : "—"}
            color="#3B82F6"
            loading={loading}
          />
        </div>

        {/* ── Cycle Progress Indicator ── */}
        <section
          className="rounded-lg border border-border bg-card shadow-card p-5 mb-6"
          data-ocid="cycle.progress.panel"
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-5">
            Progresso do Ciclo Atual (Ciclo 4 — 2024)
          </h2>

          {/* Progress bar */}
          <div
            className="w-full rounded-full overflow-hidden mb-3"
            style={{ height: 12, background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${CICLO4_PROGRESS_PCT}%`,
                background:
                  "linear-gradient(90deg, #D97706 0%, #F59E0B 60%, #FCD34D 100%)",
                boxShadow: "0 0 10px rgba(245,158,11,0.5)",
              }}
            />
          </div>

          {/* Labels */}
          <div className="flex justify-between text-xs text-muted-foreground mb-4">
            <span>Halving (Abr 2024)</span>
            <span className="font-semibold" style={{ color: "#F59E0B" }}>
              Hoje — Dia {CICLO4_CURRENT_DAY}
            </span>
            <span>Próximo Halving (~2028)</span>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-3 gap-3 rounded-md p-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Dias decorridos
              </p>
              <p className="text-lg font-bold" style={{ color: "#F59E0B" }}>
                {CICLO4_CURRENT_DAY.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground mb-1">
                Dias restantes
              </p>
              <p className="text-lg font-bold text-foreground">
                {(CICLO4_TOTAL_DAYS - CICLO4_CURRENT_DAY).toLocaleString(
                  "pt-BR",
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Progresso</p>
              <p className="text-lg font-bold" style={{ color: "#22C55E" }}>
                {CICLO4_PROGRESS_PCT}%
              </p>
            </div>
          </div>
        </section>

        {/* ── Cycle Comparison Chart ── */}
        <section
          className="rounded-lg border border-border bg-card shadow-card p-5 mb-6"
          data-ocid="cycles.panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Comparação de Ciclos Pós-Halving
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Variação % acumulada desde cada halving
              </p>
            </div>
            {/* Cycle legend */}
            <div className="flex flex-wrap gap-4">
              {(
                [
                  {
                    key: "ciclo1",
                    label: "Ciclo 1 (2012)",
                    color: CYCLE_COLORS.ciclo1,
                  },
                  {
                    key: "ciclo2",
                    label: "Ciclo 2 (2016)",
                    color: CYCLE_COLORS.ciclo2,
                  },
                  {
                    key: "ciclo3",
                    label: "Ciclo 3 (2020)",
                    color: CYCLE_COLORS.ciclo3,
                  },
                  {
                    key: "ciclo4",
                    label: "Ciclo 4 (2024)",
                    color: CYCLE_COLORS.ciclo4,
                  },
                ] as const
              ).map((c) => (
                <div key={c.key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-5 h-0.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={calculatedCycleData}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2d3e"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "#9AA8B8", fontSize: 11 }}
                axisLine={{ stroke: "#1e2d3e" }}
                tickLine={false}
                label={{
                  value: "Dias desde o Halving",
                  position: "insideBottom",
                  offset: -4,
                  fill: "#9AA8B8",
                  fontSize: 11,
                }}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                tick={{ fill: "#9AA8B8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={cycleYAxisFormatter}
                width={55}
                label={{
                  value: "Variação %",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fill: "#9AA8B8",
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CycleTooltip />} />
              <ReferenceLine
                x={CICLO4_CURRENT_DAY}
                stroke="#EF4444"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                strokeOpacity={0.8}
                label={{
                  value: "Hoje",
                  position: "top",
                  fill: "#EF4444",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Line
                type="monotone"
                dataKey="ciclo1"
                name="Ciclo 1"
                stroke={CYCLE_COLORS.ciclo1}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, stroke: "#0B1016", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="ciclo2"
                name="Ciclo 2"
                stroke={CYCLE_COLORS.ciclo2}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, stroke: "#0B1016", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="ciclo3"
                name="Ciclo 3"
                stroke={CYCLE_COLORS.ciclo3}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, stroke: "#0B1016", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="ciclo4"
                name="Ciclo 4"
                stroke={CYCLE_COLORS.ciclo4}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 5, stroke: "#0B1016", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* ── Events Table ── */}
        <section
          id="historico"
          className="rounded-lg border border-border bg-card shadow-card p-5 mb-8"
          data-ocid="table.panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Tabela de Eventos Históricos
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {tableData.length} evento{tableData.length !== 1 ? "s" : ""}{" "}
                encontrado{tableData.length !== 1 ? "s" : ""}
              </p>
            </div>
            {/* Table filter pills */}
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((btn) => (
                <button
                  type="button"
                  key={btn.value}
                  onClick={() => setTableFilter(btn.value)}
                  className="text-xs px-3 py-1 rounded-full border transition-colors"
                  style={
                    tableFilter === btn.value
                      ? {
                          background: "#F59E0B",
                          borderColor: "#F59E0B",
                          color: "#0B1016",
                          fontWeight: 600,
                        }
                      : {
                          background: "transparent",
                          borderColor: "oklch(0.21 0.028 240)",
                          color: "oklch(0.68 0.03 240)",
                        }
                  }
                  data-ocid={`table.${btn.value}.tab`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2" data-ocid="table.loading_state">
              {[1, 2, 3, 4, 5].map((k) => (
                <Skeleton key={k} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : tableData.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground text-sm"
              data-ocid="table.empty_state"
            >
              Nenhum evento encontrado para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead
                      className="text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                      onClick={() => handleSort("date")}
                      data-ocid="table.date.button"
                    >
                      Data <SortIcon col="date" />
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">
                      Tipo
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("title")}
                      data-ocid="table.title.button"
                    >
                      Título <SortIcon col="title" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-right"
                      onClick={() => handleSort("priceAtEvent")}
                      data-ocid="table.price.button"
                    >
                      Preço (USD) <SortIcon col="priceAtEvent" />
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap text-right"
                      onClick={() => handleSort("priceImpactPercent")}
                      data-ocid="table.impact.button"
                    >
                      Impacto % <SortIcon col="priceImpactPercent" />
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                      Descrição
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((evt, idx) => (
                    <TableRow
                      key={Number(evt.id)}
                      className="border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(evt)}
                      data-ocid={`table.row.${idx + 1}`}
                    >
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap py-3">
                        {formatDate(evt.date)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          className="text-xs border-0 font-medium"
                          style={{
                            background: `${EVENT_COLORS[evt.eventType]}22`,
                            color: EVENT_COLORS[evt.eventType] ?? "#9AA8B8",
                          }}
                        >
                          {EVENT_LABELS[evt.eventType] ?? evt.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground py-3 max-w-[200px]">
                        <span className="truncate block">{evt.title}</span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground text-right whitespace-nowrap py-3">
                        {formatPriceFull(evt.priceAtEvent)}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color:
                              evt.priceImpactPercent >= 0
                                ? "#22C55E"
                                : "#EF4444",
                          }}
                        >
                          {evt.priceImpactPercent >= 0 ? "+" : ""}
                          {evt.priceImpactPercent.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell py-3 max-w-[320px]">
                        <span className="line-clamp-2">{evt.description}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* ── Analysis panels ── */}
        <div id="eventos" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Panel 1: Contexto Atual ── */}
          <section
            className="rounded-lg border border-border bg-card shadow-card p-5 flex flex-col gap-4"
            data-ocid="context.panel"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Contexto Atual do Ciclo
              </h2>
              {loading ? (
                <Skeleton className="h-6 w-24" />
              ) : contextAnalysis ? (
                <Badge
                  className="text-xs border-0 font-semibold"
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    color: "#F59E0B",
                  }}
                >
                  {contextAnalysis.cyclePhase}
                </Badge>
              ) : null}
            </div>

            {loading ? (
              <div className="space-y-2" data-ocid="context.loading_state">
                {["a", "b", "c", "d"].map((k) => (
                  <Skeleton key={k} className="h-8 w-full" />
                ))}
              </div>
            ) : contextAnalysis ? (
              <>
                <div className="flex flex-col gap-0">
                  <InfoRow
                    label="Dias desde o último halving"
                    value={`${dynamicDaysSinceHalving} dias`}
                  />
                  <InfoRow
                    label="Distância do ATH"
                    value={
                      loading
                        ? "..."
                        : dynamicPercentFromATH != null
                          ? `${dynamicPercentFromATH.toFixed(1)}%`
                          : `${contextAnalysis.percentFromATH.toFixed(1)}%`
                    }
                  />
                </div>

                <div
                  className="rounded-md p-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Período Histórico Similar
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-foreground">
                      {contextAnalysis.mostSimilarPeriod.period}
                    </span>
                    <Badge
                      className="text-xs border-0"
                      style={{
                        background: "rgba(34,197,94,0.15)",
                        color: "#22C55E",
                      }}
                    >
                      {contextAnalysis.mostSimilarPeriod.priceChangePercent >= 0
                        ? "+"
                        : ""}
                      {contextAnalysis.mostSimilarPeriod.priceChangePercent.toFixed(
                        0,
                      )}
                      %
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {contextAnalysis.mostSimilarPeriod.startDate} →{" "}
                    {contextAnalysis.mostSimilarPeriod.endDate}
                  </p>
                  <p className="text-sm text-foreground/80">
                    {contextAnalysis.mostSimilarPeriod.description}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  {contextAnalysis.keySummary}
                </p>
              </>
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="context.error_state"
              >
                Análise de contexto indisponível.
              </p>
            )}
          </section>

          {/* ── Panel 2: Antecipação ── */}
          <section
            className="rounded-lg border border-border bg-card shadow-card p-5 flex flex-col gap-4"
            data-ocid="anticipation.panel"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Projeções e Antecipação
            </h2>

            {loading ? (
              <div className="space-y-2" data-ocid="anticipation.loading_state">
                {["a", "b", "c", "d"].map((k) => (
                  <Skeleton key={k} className="h-8 w-full" />
                ))}
              </div>
            ) : anticipationAnalysis ? (
              <>
                <div
                  className="rounded-md p-4"
                  style={{
                    background: "rgba(79,139,255,0.06)",
                    border: "1px solid rgba(79,139,255,0.15)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "#4F8BFF" }}
                  >
                    Próximo Evento Esperado
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {anticipationAnalysis.nextEvent.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    {anticipationAnalysis.nextEvent.estimatedDate}
                  </p>
                  <p className="text-sm text-foreground/80">
                    {anticipationAnalysis.nextEvent.description}
                  </p>
                </div>

                <div
                  className="rounded-md p-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Padrão Histórico
                  </p>
                  <p className="text-sm text-foreground/80">
                    {anticipationAnalysis.historicalPatternSummary}
                  </p>
                </div>

                <div className="flex flex-col gap-0">
                  <InfoRow
                    label="Multiplicador esperado (mínimo)"
                    value={`${anticipationAnalysis.expectedMinMultiplier}x`}
                  />
                  <InfoRow
                    label="Multiplicador esperado (máximo)"
                    value={`${anticipationAnalysis.expectedMaxMultiplier}x`}
                  />
                </div>

                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  {anticipationAnalysis.summary}
                </p>
              </>
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="anticipation.error_state"
              >
                Análise de antecipação indisponível.
              </p>
            )}
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-16 border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Feito com ❤️ usando{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>

      {/* ── Event Detail Modal ── */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent
          className="max-w-md"
          style={{
            background: "oklch(0.14 0.025 240)",
            border: "1px solid oklch(0.21 0.028 240)",
          }}
          data-ocid="events.dialog"
        >
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <Badge
                    className="text-xs border-0 font-semibold px-2 py-0.5"
                    style={{
                      background: `${EVENT_COLORS[selectedEvent.eventType]}22`,
                      color: EVENT_COLORS[selectedEvent.eventType] ?? "#9AA8B8",
                    }}
                  >
                    {EVENT_LABELS[selectedEvent.eventType] ??
                      selectedEvent.eventType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(selectedEvent.date)}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground leading-snug">
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-foreground/70 leading-relaxed mt-1">
                  {selectedEvent.description}
                </DialogDescription>
              </DialogHeader>

              <div
                className="rounded-md p-4 mt-2 flex flex-col gap-0"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <InfoRow
                  label="Preço no evento"
                  value={formatPriceFull(selectedEvent.priceAtEvent)}
                />
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">
                    Impacto no preço
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color:
                        selectedEvent.priceImpactPercent >= 0
                          ? "#22C55E"
                          : "#EF4444",
                    }}
                  >
                    {selectedEvent.priceImpactPercent >= 0 ? "+" : ""}
                    {selectedEvent.priceImpactPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
