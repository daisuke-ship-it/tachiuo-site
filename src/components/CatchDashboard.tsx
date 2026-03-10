'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import { EnvData, AISummaryRecord, AreaRecord, FishRecord } from '@/app/page'
import TrendBar, { Fish, FISH_LIST, FISH_ALIASES } from './TrendBar'
import CatchTable, { SortField } from './CatchTable'
import CatchCards from './CatchCards'
import CatchChart from './CatchChart'

type Area   = '東京湾' | '相模湾'
type Period = '今日' | '昨日' | '一昨日' | '直近7日' | '直近30日' | 'カスタム'
type Tab    = '一覧' | '詳細' | 'グラフ'

const AREAS: Area[] = ['東京湾', '相模湾']
const TABS:  Tab[]  = ['一覧', '詳細', 'グラフ']

interface Props {
  records: CatchRecord[]
  envData: EnvData | null
  areas: AreaRecord[]
  fishSpeciesList: FishRecord[]
  aiSummaries: AISummaryRecord[]
}

function buildPeriods(): { label: string; value: Period }[] {
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  const t  = new Date(); t.setHours(0, 0, 0, 0)
  const y  = new Date(t); y.setDate(t.getDate() - 1)
  const db = new Date(t); db.setDate(t.getDate() - 2)
  return [
    { label: `今日 ${fmt(t)}`,     value: '今日'    },
    { label: `昨日 ${fmt(y)}`,     value: '昨日'    },
    { label: `一昨日 ${fmt(db)}`,  value: '一昨日'  },
    { label: '直近7日',            value: '直近7日' },
    { label: '直近30日',           value: '直近30日' },
  ]
}

/* ── Utils ──────────────────────────────────────────────────── */
function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate()
  )
}

function filterByArea(records: CatchRecord[], area: Area | null): CatchRecord[] {
  if (!area) return records
  return records.filter((x) => x.shipyard_area?.includes(area))
}

function filterByFish(records: CatchRecord[], fish: Fish | null): CatchRecord[] {
  if (!fish) return records
  const aliases = FISH_ALIASES[fish]
  return records.filter((x) => aliases.some((a) => x.fish_name?.includes(a)))
}

function filterByPeriod(
  records: CatchRecord[],
  period: Period,
  customDate: string | null,
): CatchRecord[] {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(d.getDate() + n); return r }

  if (period === '今日')   return records.filter((r) => r.date && isSameDay(new Date(r.date), today))
  if (period === '昨日')   return records.filter((r) => r.date && isSameDay(new Date(r.date), addDays(today, -1)))
  if (period === '一昨日') return records.filter((r) => r.date && isSameDay(new Date(r.date), addDays(today, -2)))
  if (period === 'カスタム' && customDate) {
    const target = new Date(customDate + 'T00:00:00')
    return records.filter((r) => r.date && isSameDay(new Date(r.date), target))
  }
  if (period === '直近7日') {
    const cutoff = addDays(today, -7)
    return records.filter((r) => r.date && new Date(r.date) >= cutoff)
  }
  if (period === '直近30日') {
    const cutoff = addDays(today, -30)
    return records.filter((r) => r.date && new Date(r.date) >= cutoff)
  }
  return records
}

/* ── Period date helpers ─────────────────────────────────────── */
function getPeriodDate(period: Period, customDate: string | null): string | null {
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const today = new Date()
  if (period === '今日')   return fmt(today)
  if (period === '昨日')   { const d = new Date(today); d.setDate(d.getDate() - 1); return fmt(d) }
  if (period === '一昨日') { const d = new Date(today); d.setDate(d.getDate() - 2); return fmt(d) }
  if (period === 'カスタム') return customDate
  return null // 直近7日 / 直近30日
}

function getSummaryLabel(period: Period, summaryDate: string | null): string {
  if (summaryDate) {
    const d = new Date(summaryDate + 'T00:00:00')
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}の釣果サマリー`
  }
  if (period === '直近7日')  return '直近7日の釣果サマリー'
  if (period === '直近30日') return '直近30日の釣果サマリー'
  return '釣果サマリー'
}

function addDatePrefix(text: string, dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const prefix = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}の`
  if (text.startsWith('本日の')) return prefix + text.slice(3)
  if (text.startsWith('本日'))   return prefix + text.slice(2)
  return prefix + text
}

/* ── AI summary lookup ───────────────────────────────────────── */
function findAreaId(area: Area | null, areas: AreaRecord[]): number | null {
  if (!area) return null
  return areas.find((a) => a.name === area)?.id ?? null
}

function findFishId(fish: Fish | null, fishSpeciesList: FishRecord[]): number | null {
  if (!fish) return null
  const aliases = FISH_ALIASES[fish]
  return fishSpeciesList.find((f) => aliases.some((a) => f.name === a))?.id ?? null
}

function lookupSummary(
  aiSummaries: AISummaryRecord[],
  type: string,
  targetId: number | null,
  targetDate: string | null,
): string | null {
  if (targetId === null || targetDate === null) return null
  return aiSummaries.find(
    (s) => s.summary_type === type && s.target_id === targetId && s.target_date === targetDate
  )?.summary_text ?? null
}

/* ── Sub-components ──────────────────────────────────────────── */
function FilterPill({
  active, disabled, onClick, children,
}: {
  active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: '5px 14px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        background: disabled ? 'var(--surface-2)' : active ? 'var(--accent-light)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : active ? '#93c5fd' : 'var(--text-sub)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function FilterLabel({ text }: { text: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', minWidth: 44, flexShrink: 0 }}>
      {text}
    </span>
  )
}

/* ── AI Summary Card ─────────────────────────────────────────── */
function AISummaryCard({
  variant, label, text,
}: {
  variant: 'area' | 'fish'
  label: string
  text: string
}) {
  const isArea    = variant === 'area'
  const bg        = isArea ? '#1a1f2e' : '#0f1a2e'
  const leftColor = isArea ? '#3b82f6' : '#d4a017'
  const sideColor = isArea ? 'rgba(59,130,246,0.25)' : 'rgba(212,160,23,0.25)'
  const textColor = isArea ? '#93c5fd' : '#bfdbfe'

  return (
    <div
      style={{
        background: bg,
        borderLeft:   `4px solid ${leftColor}`,
        borderRight:  `1px solid ${sideColor}`,
        borderTop:    `1px solid ${sideColor}`,
        borderBottom: `1px solid ${sideColor}`,
        borderRadius: 8,
        padding: '10px 14px',
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: textColor,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 5,
          opacity: 0.7,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 13, color: textColor, lineHeight: 1.6, margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

/* ── Summary card ────────────────────────────────────────────── */
function SummaryCard({
  records,
  envData,
  period,
  summaryDate,
}: {
  records: CatchRecord[]        // already period+area+fish filtered
  envData: EnvData | null
  period: Period
  summaryDate: string | null    // yyyy-MM-dd or null for range periods
}) {
  const showEnv = period === '今日'

  // Unique shipyards
  const shipyardCount = new Set(
    records.map((r) => r.shipyard_name).filter(Boolean)
  ).size

  // Catch average
  const catchVals = records
    .map((r) => r.count_max ?? r.count_min)
    .filter((v): v is number => v !== null)
  const catchAvg = catchVals.length > 0
    ? Math.round(catchVals.reduce((a, b) => a + b, 0) / catchVals.length * 10) / 10
    : null

  // Catch range
  const countMinVals = records.map((r) => r.count_min).filter((v): v is number => v !== null)
  const countMaxVals = records.map((r) => r.count_max).filter((v): v is number => v !== null)
  const catchRangeMin = countMinVals.length > 0 ? Math.min(...countMinVals) : null
  const catchRangeMax = countMaxVals.length > 0 ? Math.max(...countMaxVals) : null
  const catchRange =
    catchRangeMin !== null && catchRangeMax !== null && catchRangeMin !== catchRangeMax
      ? `${catchRangeMin}〜${catchRangeMax}`
      : catchRangeMax !== null ? String(catchRangeMax)
      : catchRangeMin !== null ? String(catchRangeMin)
      : '—'

  // Size range
  const sizeMinVals = records.map((r) => r.size_min_cm).filter((v): v is number => v !== null)
  const sizeMaxVals = records.map((r) => r.size_max_cm).filter((v): v is number => v !== null)
  const sizeMin = sizeMinVals.length > 0 ? Math.min(...sizeMinVals) : null
  const sizeMax = sizeMaxVals.length > 0 ? Math.max(...sizeMaxVals) : null
  const sizeRange =
    sizeMin !== null && sizeMax !== null && sizeMin !== sizeMax
      ? `${sizeMin}〜${sizeMax}cm`
      : sizeMax !== null ? `${sizeMax}cm`
      : sizeMin !== null ? `${sizeMin}cm`
      : '—'

  const weatherWord = showEnv && envData?.weather ? envData.weather.split(' ')[0] : null

  const stats: { label: string; value: string; highlight?: boolean }[] = [
    { label: '天気',     value: weatherWord ?? '—' },
    { label: '潮汐',     value: showEnv ? (envData?.tide_type ?? '—') : '—' },
    { label: '出船数',   value: records.length > 0 ? `${shipyardCount}` : '—' },
    { label: '平均釣果', value: catchAvg !== null ? String(catchAvg) : '—', highlight: true },
    { label: '釣果',     value: catchRange },
    { label: 'サイズ',   value: sizeRange },
  ]

  const label = getSummaryLabel(period, summaryDate)

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {stats.map(({ label: statLabel, value, highlight }) => (
          <div
            key={statLabel}
            style={{
              background: highlight ? 'rgba(59,130,246,0.12)' : 'var(--surface-2)',
              border: `1px solid ${highlight ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
              borderRadius: 6,
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1 }}>{statLabel}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: highlight ? '#93c5fd' : 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────── */
export default function CatchDashboard({
  records, envData, areas, fishSpeciesList, aiSummaries,
}: Props) {
  const [area,       setArea]       = useState<Area | null>('東京湾')
  const [fish,       setFish]       = useState<Fish | null>('タチウオ')
  const [period,     setPeriod]     = useState<Period>('今日')
  const [customDate, setCustomDate] = useState<string | null>(null)
  const [tab,        setTab]        = useState<Tab>('一覧')
  const [sortField,  setSortField]  = useState<SortField>(null)

  const toggleArea = (a: Area) => {
    if (a === '相模湾') return
    setArea((p) => (p === a ? null : a))
  }
  const handleFishClick = (f: Fish) => setFish((p) => (p === f ? null : f))
  const handlePeriodClick = (p: Period) => {
    setPeriod(p)
    setCustomDate(null)
  }

  // Filtered data
  const areaOnlyFiltered = useMemo(
    () => filterByArea(records, area),
    [records, area]
  )
  const areaFishFiltered = useMemo(
    () => filterByFish(areaOnlyFiltered, fish),
    [areaOnlyFiltered, fish]
  )
  const filtered = useMemo(() => {
    let r = filterByPeriod(areaFishFiltered, period, customDate)

    if (sortField === 'count') {
      r = [...r].sort((a, b) => (b.count_max ?? b.count_min ?? -1) - (a.count_max ?? a.count_min ?? -1))
    } else if (sortField === 'size') {
      r = [...r].sort((a, b) => (b.size_max_cm ?? b.size_min_cm ?? -1) - (a.size_max_cm ?? a.size_min_cm ?? -1))
    }

    return r
  }, [areaFishFiltered, period, customDate, sortField])

  // AI summary lookup
  const summaryDate  = getPeriodDate(period, customDate)
  const areaId       = findAreaId(area, areas)
  const fishId       = findFishId(fish, fishSpeciesList)
  const areaSummaryRaw = lookupSummary(aiSummaries, 'area', areaId, summaryDate)
  const fishSummary    = lookupSummary(aiSummaries, 'fish_species', fishId, summaryDate)

  // Add date prefix to area summary
  const areaSummary = areaSummaryRaw && summaryDate
    ? addDatePrefix(areaSummaryRaw, summaryDate)
    : areaSummaryRaw

  // Custom date label for pill
  const customDateLabel = customDate
    ? `📅 ${new Date(customDate + 'T00:00:00').getMonth() + 1}/${new Date(customDate + 'T00:00:00').getDate()}`
    : '📅 日付指定'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1. エリア選択 + Area AI サマリー ─────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterLabel text="エリア" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AREAS.map((a) => (
              <FilterPill key={a} active={area === a} disabled={a === '相模湾'} onClick={() => toggleArea(a)}>
                {a === '相模湾' ? '相模湾（準備中）' : a}
              </FilterPill>
            ))}
          </div>
        </div>

        {areaSummary && (
          <AISummaryCard
            variant="area"
            label="🤖 エリアの状況（AIサマリー）"
            text={areaSummary}
          />
        )}
      </div>

      {/* ── 2. 魚種トレンド（エリア連動 / 2×2グリッド） ────────── */}
      <TrendBar records={areaOnlyFiltered} activeFish={fish} onFishClick={handleFishClick} />

      {/* ── 3. 魚種・期間フィルター ──────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* 魚種 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterLabel text="魚種" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FISH_LIST.map((f) => (
              <FilterPill key={f} active={fish === f} onClick={() => handleFishClick(f)}>
                {f}
              </FilterPill>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* 期間 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterLabel text="期間" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {buildPeriods().map(({ label, value }) => (
              <FilterPill
                key={value}
                active={period === value}
                onClick={() => handlePeriodClick(value)}
              >
                {label}
              </FilterPill>
            ))}

            {/* カレンダーボタン */}
            <label
              style={{
                position: 'relative',
                cursor: 'pointer',
                display: 'inline-block',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 12,
                  fontWeight: period === 'カスタム' ? 600 : 400,
                  cursor: 'pointer',
                  border: period === 'カスタム'
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border)',
                  background: period === 'カスタム' ? 'var(--accent-light)' : 'transparent',
                  color: period === 'カスタム' ? '#93c5fd' : 'var(--text-sub)',
                  whiteSpace: 'nowrap' as const,
                  userSelect: 'none' as const,
                }}
              >
                {customDateLabel}
              </span>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={customDate ?? ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomDate(e.target.value)
                    setPeriod('カスタム')
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── 4. 魚種 AI サマリー ──────────────────────────────────── */}
      {fish && fishSummary && (
        <AISummaryCard
          variant="fish"
          label={`🤖 ${area ?? 'エリア'} × ${fish}の状況（AIサマリー）`}
          text={fishSummary}
        />
      )}

      {/* ── 5. 釣果サマリーカード（期間連動） ────────────────────── */}
      <SummaryCard
        records={filtered}
        envData={envData}
        period={period}
        summaryDate={summaryDate}
      />

      {/* ── 6. 一覧 / 詳細 / グラフ タブ ────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            padding: '0 16px',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex' }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
                  background: 'transparent',
                  color: tab === t ? '#e2e8f0' : 'var(--text-sub)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {tab !== 'グラフ' && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingRight: 4 }}>
              {filtered.length}件
            </span>
          )}
        </div>

        {/* Tab content */}
        {tab === '一覧' && (
          <CatchTable records={filtered} sortField={sortField} onSort={setSortField} />
        )}
        {tab === '詳細' && <CatchCards records={filtered} />}
        {tab === 'グラフ' && (
          <div style={{ padding: '20px 22px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              直近30日の釣果平均トレンド
            </p>
            <CatchChart records={areaFishFiltered} />
          </div>
        )}
      </div>
    </div>
  )
}
