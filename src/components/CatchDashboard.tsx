'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import { EnvData } from '@/app/page'
import TrendBar, { Fish, FISH_LIST, FISH_ALIASES } from './TrendBar'
import CatchTable, { SortField } from './CatchTable'
import CatchCards from './CatchCards'
import CatchChart from './CatchChart'

type Area   = '東京湾' | '相模湾'
type Period = '今日' | '昨日' | '一昨日' | '直近7日' | '直近30日'
type Tab    = '一覧' | '詳細' | 'グラフ'

const AREAS: Area[] = ['東京湾', '相模湾']
const TABS:  Tab[]  = ['一覧', '詳細', 'グラフ']

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

/* ── Utils ───────────────────────────────────────────────────── */
function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate()
  )
}

function filterByPeriod(records: CatchRecord[], period: Period): CatchRecord[] {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(d.getDate() + n); return r }

  if (period === '今日')   return records.filter((r) => r.date && isSameDay(new Date(r.date), today))
  if (period === '昨日')   return records.filter((r) => r.date && isSameDay(new Date(r.date), addDays(today, -1)))
  if (period === '一昨日') return records.filter((r) => r.date && isSameDay(new Date(r.date), addDays(today, -2)))
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

function filterByAreaFish(records: CatchRecord[], area: Area | null, fish: Fish | null) {
  let r = records
  if (area) r = r.filter((x) => x.shipyard_area?.includes(area))
  if (fish) {
    const aliases = FISH_ALIASES[fish]
    r = r.filter((x) => aliases.some((a) => x.fish_name?.includes(a)))
  }
  return r
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
        color: disabled ? 'var(--text-muted)' : active ? 'var(--secondary)' : 'var(--text-sub)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
        opacity: disabled ? 0.6 : 1,
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

/* ── Summary card ────────────────────────────────────────────── */
function SummaryCard({ records, envData, fish }: { records: CatchRecord[]; envData: EnvData | null; fish: Fish | null }) {
  const today = new Date()
  const todayRecs = records.filter((r) => r.date && isSameDay(new Date(r.date), today))

  const catchVals = todayRecs
    .map((r) => r.count_max ?? r.count_min)
    .filter((v): v is number => v !== null)
  const sizeMaxVals = todayRecs
    .map((r) => r.size_max_cm ?? r.size_min_cm)
    .filter((v): v is number => v !== null)
  const sizeMinVals = todayRecs
    .map((r) => r.size_min_cm ?? r.size_max_cm)
    .filter((v): v is number => v !== null)

  const catchAvg = catchVals.length > 0
    ? Math.round(catchVals.reduce((a, b) => a + b, 0) / catchVals.length * 10) / 10
    : null
  const catchMax = catchVals.length > 0 ? Math.max(...catchVals) : null
  const catchMin = catchVals.length > 0 ? Math.min(...catchVals) : null
  const sizeMax  = sizeMaxVals.length > 0 ? Math.max(...sizeMaxVals) : null
  const sizeMin  = sizeMinVals.length > 0 ? Math.min(...sizeMinVals) : null

  // サイズを「最小〜最大cm」形式にまとめる
  const sizeVal =
    sizeMin !== null && sizeMax !== null && sizeMin !== sizeMax
      ? `${sizeMin}〜${sizeMax}cm`
      : sizeMax !== null
        ? `${sizeMax}cm`
        : sizeMin !== null
          ? `${sizeMin}cm`
          : '—'

  const weatherWord = envData?.weather ? envData.weather.split(' ')[0] : null

  const stats: { label: string; value: string; highlight?: boolean }[] = [
    { label: '天気',   value: weatherWord ?? '—' },
    { label: '潮汐',   value: envData?.tide_type ?? '—' },
    { label: `平均${fish ? `(${fish})` : ''}`, value: catchAvg !== null ? String(catchAvg) : '—', highlight: true },
    { label: '最大',   value: catchMax !== null ? String(catchMax) : '—' },
    { label: '最小',   value: catchMin !== null ? String(catchMin) : '—' },
    { label: 'サイズ', value: sizeVal },
  ]

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
        本日の釣果サマリー
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 5,
        }}
      >
        {stats.map(({ label, value, highlight }) => (
          <div
            key={label}
            style={{
              background: highlight ? '#EBF4FF' : 'var(--surface-2)',
              border: `1px solid ${highlight ? '#BDD7EE' : 'var(--border)'}`,
              borderRadius: 6,
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
            }}
          >
            <p style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: highlight ? 'var(--secondary)' : 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────── */
export default function CatchDashboard({ records, envData }: { records: CatchRecord[]; envData: EnvData | null }) {
  const [area,      setArea]      = useState<Area | null>('東京湾')
  const [fish,      setFish]      = useState<Fish | null>('タチウオ')
  const [period,    setPeriod]    = useState<Period>('今日')
  const [tab,       setTab]       = useState<Tab>('一覧')
  const [sortField, setSortField] = useState<SortField>(null)

  const toggleArea = (a: Area) => {
    if (a === '相模湾') return
    setArea((p) => (p === a ? null : a))
  }
  const handleFishClick = (f: Fish) => setFish((p) => (p === f ? null : f))

  // Records filtered by area+fish (used by chart & summary)
  const areaFishFiltered = useMemo(
    () => filterByAreaFish(records, area, fish),
    [records, area, fish]
  )

  // Records filtered by area+fish+period (used by table/cards)
  const filtered = useMemo(() => {
    let r = filterByPeriod(areaFishFiltered, period)

    if (sortField === 'count') {
      r = [...r].sort((a, b) => (b.count_max ?? b.count_min ?? -1) - (a.count_max ?? a.count_min ?? -1))
    } else if (sortField === 'size') {
      r = [...r].sort((a, b) => (b.size_max_cm ?? b.size_min_cm ?? -1) - (a.size_max_cm ?? a.size_min_cm ?? -1))
    }

    return r
  }, [areaFishFiltered, period, sortField])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1. トレンドバー ─────────────────────────────────────── */}
      <TrendBar records={records} activeFish={fish} onFishClick={handleFishClick} />

      {/* ── 2. フィルターエリア ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* エリア */}
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

        <div style={{ height: 1, background: 'var(--border)' }} />

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

        {/* 日付 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterLabel text="期間" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {buildPeriods().map(({ label, value }) => (
              <FilterPill key={value} active={period === value} onClick={() => setPeriod(value)}>
                {label}
              </FilterPill>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. サマリーカード ───────────────────────────────────── */}
      <SummaryCard records={areaFishFiltered} envData={envData} fish={fish} />

      {/* ── 4 & 5. データ / グラフ タブ ──────────────────────────── */}
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
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  color: tab === t ? 'var(--primary)' : 'var(--text-sub)',
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
