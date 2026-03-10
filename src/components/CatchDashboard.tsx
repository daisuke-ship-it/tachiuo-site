'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import { EnvData, AISummaryRecord, AreaRecord, FishRecord } from '@/app/page'
import TrendBar, { Fish, FISH_LIST, FISH_ALIASES } from './TrendBar'
import CatchTable, { SortField } from './CatchTable'
import CatchCards from './CatchCards'
import CatchChart from './CatchChart'

type Area   = '東京湾' | '相模湾'
type Period = '今日' | '昨日' | '一昨日' | '直近7日' | '直近30日'
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
): string | null {
  if (targetId === null) return null
  return aiSummaries.find(
    (s) => s.summary_type === type && s.target_id === targetId
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

/* ── AI Summary Card ─────────────────────────────────────────── */
function AISummaryCard({
  variant, label, text,
}: {
  variant: 'area' | 'fish'
  label: string
  text: string
}) {
  const isArea    = variant === 'area'
  const bg        = isArea ? '#1a1f2e' : '#1a1500'
  const leftColor = isArea ? '#3b82f6' : '#d4a017'
  const sideColor = isArea ? 'rgba(59,130,246,0.25)' : 'rgba(212,160,23,0.25)'
  const textColor = isArea ? '#93c5fd' : '#fde68a'

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
          opacity: 0.75,
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
function SummaryCard({ records, envData }: { records: CatchRecord[]; envData: EnvData | null }) {
  const today = new Date()
  const todayRecs = records.filter((r) => r.date && isSameDay(new Date(r.date), today))

  const shipyardCount = new Set(
    todayRecs.map((r) => r.shipyard_name).filter(Boolean)
  ).size

  const catchVals = todayRecs
    .map((r) => r.count_max ?? r.count_min)
    .filter((v): v is number => v !== null)
  const catchAvg = catchVals.length > 0
    ? Math.round(catchVals.reduce((a, b) => a + b, 0) / catchVals.length * 10) / 10
    : null

  const countMinVals = todayRecs.map((r) => r.count_min).filter((v): v is number => v !== null)
  const countMaxVals = todayRecs.map((r) => r.count_max).filter((v): v is number => v !== null)
  const catchRangeMin = countMinVals.length > 0 ? Math.min(...countMinVals) : null
  const catchRangeMax = countMaxVals.length > 0 ? Math.max(...countMaxVals) : null
  const catchRange =
    catchRangeMin !== null && catchRangeMax !== null && catchRangeMin !== catchRangeMax
      ? `${catchRangeMin}〜${catchRangeMax}`
      : catchRangeMax !== null ? String(catchRangeMax)
      : catchRangeMin !== null ? String(catchRangeMin)
      : '—'

  const sizeMinVals = todayRecs.map((r) => r.size_min_cm).filter((v): v is number => v !== null)
  const sizeMaxVals = todayRecs.map((r) => r.size_max_cm).filter((v): v is number => v !== null)
  const sizeMin = sizeMinVals.length > 0 ? Math.min(...sizeMinVals) : null
  const sizeMax = sizeMaxVals.length > 0 ? Math.max(...sizeMaxVals) : null
  const sizeRange =
    sizeMin !== null && sizeMax !== null && sizeMin !== sizeMax
      ? `${sizeMin}〜${sizeMax}cm`
      : sizeMax !== null ? `${sizeMax}cm`
      : sizeMin !== null ? `${sizeMin}cm`
      : '—'

  const weatherWord = envData?.weather ? envData.weather.split(' ')[0] : null

  const stats: { label: string; value: string; highlight?: boolean }[] = [
    { label: '天気',     value: weatherWord ?? '—' },
    { label: '潮汐',     value: envData?.tide_type ?? '—' },
    { label: '出船数',   value: todayRecs.length > 0 ? `${shipyardCount}` : '—' },
    { label: '平均釣果', value: catchAvg !== null ? String(catchAvg) : '—', highlight: true },
    { label: '釣果',     value: catchRange },
    { label: 'サイズ',   value: sizeRange },
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {stats.map(({ label, value, highlight }) => (
          <div
            key={label}
            style={{
              background: highlight ? '#EBF4FF' : 'var(--surface-2)',
              border: `1px solid ${highlight ? '#BDD7EE' : 'var(--border)'}`,
              borderRadius: 6,
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1 }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: highlight ? 'var(--secondary)' : 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
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

  // エリアのみでフィルター（TrendBar 用）
  const areaOnlyFiltered = useMemo(
    () => filterByArea(records, area),
    [records, area]
  )

  // エリア＋魚種でフィルター（SummaryCard・グラフ用）
  const areaFishFiltered = useMemo(
    () => filterByFish(areaOnlyFiltered, fish),
    [areaOnlyFiltered, fish]
  )

  // エリア＋魚種＋期間＋ソート（テーブル/カード用）
  const filtered = useMemo(() => {
    let r = filterByPeriod(areaFishFiltered, period)

    if (sortField === 'count') {
      r = [...r].sort((a, b) => (b.count_max ?? b.count_min ?? -1) - (a.count_max ?? a.count_min ?? -1))
    } else if (sortField === 'size') {
      r = [...r].sort((a, b) => (b.size_max_cm ?? b.size_min_cm ?? -1) - (a.size_max_cm ?? a.size_min_cm ?? -1))
    }

    return r
  }, [areaFishFiltered, period, sortField])

  // AI サマリー検索
  const areaId       = findAreaId(area, areas)
  const fishId       = findFishId(fish, fishSpeciesList)
  const areaSummary  = lookupSummary(aiSummaries, 'area', areaId)
  const fishSummary  = lookupSummary(aiSummaries, 'fish_species', fishId)

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
            label="🤖 AIサマリー"
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {buildPeriods().map(({ label, value }) => (
              <FilterPill key={value} active={period === value} onClick={() => setPeriod(value)}>
                {label}
              </FilterPill>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. 魚種 AI サマリー ──────────────────────────────────── */}
      {fish && fishSummary && (
        <AISummaryCard
          variant="fish"
          label={`🤖 ${area ?? 'エリア'} × ${fish} サマリー`}
          text={fishSummary}
        />
      )}

      {/* ── 5. 本日の釣果サマリーカード ──────────────────────────── */}
      <SummaryCard records={areaFishFiltered} envData={envData} />

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
