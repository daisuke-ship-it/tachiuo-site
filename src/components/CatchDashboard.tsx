'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import { EnvData, EnvDataMap, AISummaryRecord, AreaRecord, FishRecord } from '@/app/page'
import TrendBar, { Fish, FISH_LIST, FISH_ALIASES } from './TrendBar'
import CatchTable, { SortField } from './CatchTable'
import CatchCards from './CatchCards'
import CatchChart from './CatchChart'

type Area = '東京湾' | '相模湾'
type Tab  = '一覧' | '詳細' | 'グラフ'
// Period は 'yyyy-MM-dd' の日付文字列 or '直近7日' | '直近30日'

const AREAS: Area[] = ['東京湾', '相模湾']
const TABS:  Tab[]  = ['一覧', '詳細', 'グラフ']

// 釣り方グループ ソート優先順位
const METHOD_ORDER: Record<string, number> = {
  'ルアー': 0,
  'テンヤ': 1,
  'エサ':   2,
}

interface Props {
  records: CatchRecord[]
  envData: EnvDataMap
  areas: AreaRecord[]
  fishSpeciesList: FishRecord[]
  aiSummaries: AISummaryRecord[]
}

// JST 日付を YYYY-MM-DD で返す（サーバー[UTC]・ブラウザ[JST]両対応）
function localDateStr(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const y   = jst.getUTCFullYear()
  const m   = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 今日/昨日/一昨日 + 直近7日 / 直近30日
function buildPeriods(): { label: string; value: string }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']

  const result: { label: string; value: string }[] = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    result.push({
      label: `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`,
      value: localDateStr(d),
    })
  }
  result.push({ label: '直近7日', value: '直近7日' })
  result.push({ label: '直近30日', value: '直近30日' })
  return result
}

function todayStr(): string {
  return localDateStr(new Date())
}

function defaultDateStr(): string {
  const now = new Date()
  const jstHour = (now.getUTCHours() + 9) % 24
  if (jstHour >= 15) return localDateStr(now)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  return localDateStr(yesterday)
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
  return records.filter((x) => {
    if (x.fish_name && aliases.some((a) => x.fish_name!.includes(a))) return true
    return x.catch_details.some((d) => d.species_name && aliases.some((a) => d.species_name!.includes(a)))
  })
}

function filterByPeriod(records: CatchRecord[], period: string): CatchRecord[] {
  if (period === '直近7日') {
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 7)
    // r.date は 'YYYY-MM-DD' 文字列 → 文字列比較でUTCズレを回避
    const cutoffStr = localDateStr(cutoff)
    return records.filter((r) => r.date && r.date >= cutoffStr)
  }
  if (period === '直近30日') {
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = localDateStr(cutoff)
    return records.filter((r) => r.date && r.date >= cutoffStr)
  }
  // 特定日付 → 文字列一致で比較（タイムゾーンの影響を受けない）
  return records.filter((r) => r.date === period)
}

/* ── Helpers ────────────────────────────────────────────────── */
function getPeriodDate(period: string): string | null {
  if (period === '直近7日' || period === '直近30日') return null
  return period
}

function getSummaryLabel(period: string): string {
  if (period === '直近7日')  return '直近7日の釣果サマリー'
  if (period === '直近30日') return '直近30日の釣果サマリー'
  const d = new Date(period + 'T00:00:00')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}の釣果サマリー`
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
        flexShrink: 0,
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
function AISummaryCard({ variant, label, text }: {
  variant: 'area' | 'fish'; label: string; text: string
}) {
  const isArea    = variant === 'area'
  const bg        = isArea ? '#1a1f2e' : '#0f1a2e'
  const leftColor = isArea ? '#3b82f6' : '#d4a017'
  const sideColor = isArea ? 'rgba(59,130,246,0.25)' : 'rgba(212,160,23,0.25)'
  const textColor = isArea ? '#93c5fd' : '#bfdbfe'

  return (
    <div style={{
      background: bg,
      borderLeft:   `4px solid ${leftColor}`,
      borderRight:  `1px solid ${sideColor}`,
      borderTop:    `1px solid ${sideColor}`,
      borderBottom: `1px solid ${sideColor}`,
      borderRadius: 8,
      padding: '10px 14px',
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, color: textColor,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, opacity: 0.7,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: textColor, lineHeight: 1.6, margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

/* ── Summary card ────────────────────────────────────────────── */
function SummaryCard({ records, envData, period }: {
  records: CatchRecord[]   // pre-filtered (period + area + fish)
  envData: EnvDataMap
  period: string
}) {
  const isDatePeriod = period !== '直近7日' && period !== '直近30日'
  const envForPeriod: EnvData | null = isDatePeriod ? (envData[period] ?? null) : null

  const shipyardCount = new Set(records.map((r) => r.shipyard_name).filter(Boolean)).size

  const catchVals = records.map((r) => r.count_max ?? r.count_min).filter((v): v is number => v !== null)
  const catchAvg  = catchVals.length > 0
    ? Math.round(catchVals.reduce((a, b) => a + b, 0) / catchVals.length * 10) / 10
    : null

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

  const weatherWord = envForPeriod?.weather ? envForPeriod.weather.split(' ')[0] : null

  const stats: { label: string; value: string; highlight?: boolean }[] = [
    { label: '天気',     value: weatherWord ?? '—' },
    { label: '潮汐',     value: envForPeriod?.tide_type ?? '—' },
    { label: '出船数',   value: records.length > 0 ? `${shipyardCount}` : '—' },
    { label: '平均釣果', value: catchAvg !== null ? String(catchAvg) : '—', highlight: true },
    { label: '釣果',     value: catchRange },
    { label: 'サイズ',   value: sizeRange },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px 14px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {getSummaryLabel(period)}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {stats.map(({ label, value, highlight }) => (
          <div key={label} style={{
            background: highlight ? 'rgba(59,130,246,0.12)' : 'var(--surface-2)',
            border: `1px solid ${highlight ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
            borderRadius: 6, padding: '6px 8px',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1 }}>{label}</p>
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
  const [area,      setArea]      = useState<Area | null>('東京湾')
  const [fish,      setFish]      = useState<Fish | null>('タチウオ')
  const [period,    setPeriod]    = useState<string>(defaultDateStr())
  const [tab,       setTab]       = useState<Tab>('一覧')
  const [sortField, setSortField] = useState<SortField>(null)

  const toggleArea   = (a: Area) => { if (a === '相模湾') return; setArea((p) => (p === a ? null : a)) }
  const handleFishClick = (f: Fish) => setFish((p) => (p === f ? null : f))

  // Filtered data
  const areaOnlyFiltered = useMemo(() => filterByArea(records, area), [records, area])
  const areaFishFiltered = useMemo(() => filterByFish(areaOnlyFiltered, fish), [areaOnlyFiltered, fish])

  const filtered = useMemo(() => {
    let r = filterByPeriod(areaFishFiltered, period)

    const maxCount = (r: CatchRecord) =>
      r.catch_details.length > 0
        ? Math.max(...r.catch_details.map((d) => d.count ?? -1))
        : -1

    if (sortField === 'count') {
      r = [...r].sort((a, b) => maxCount(b) - maxCount(a))
    } else if (sortField === 'size') {
      r = [...r].sort((a, b) => maxCount(b) - maxCount(a)) // size_text はテキストのため count で代替
    } else {
      // デフォルト: 釣り方グループ順 → catch_details の最大釣果数降順
      r = [...r].sort((a, b) => {
        const aOrd = METHOD_ORDER[a.method_group ?? a.fishing_method ?? ''] ?? 99
        const bOrd = METHOD_ORDER[b.method_group ?? b.fishing_method ?? ''] ?? 99
        if (aOrd !== bOrd) return aOrd - bOrd
        return maxCount(b) - maxCount(a)
      })
    }
    return r
  }, [areaFishFiltered, period, sortField])

  // AI summary lookup
  const summaryDate    = getPeriodDate(period)
  const areaId         = findAreaId(area, areas)
  const fishId         = findFishId(fish, fishSpeciesList)
  const areaSummaryRaw = lookupSummary(aiSummaries, 'area', areaId, summaryDate)
  const fishSummary    = lookupSummary(aiSummaries, 'fish_species', fishId, summaryDate)
  const areaSummary    = areaSummaryRaw && summaryDate
    ? addDatePrefix(areaSummaryRaw, summaryDate)
    : areaSummaryRaw

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1. エリア選択 + Area AI サマリー ─────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterLabel text="エリア" />
          <div style={{ display: 'flex', gap: 6 }}>
            {AREAS.map((a) => (
              <FilterPill key={a} active={area === a} disabled={a === '相模湾'} onClick={() => toggleArea(a)}>
                {a === '相模湾' ? '相模湾（準備中）' : a}
              </FilterPill>
            ))}
          </div>
        </div>
        {areaSummary && (
          <AISummaryCard variant="area" label="🤖 エリアの状況（AIサマリー）" text={areaSummary} />
        )}
      </div>

      {/* ── 2. 魚種トレンド（2×2） ───────────────────────────────── */}
      <TrendBar records={areaOnlyFiltered} activeFish={fish} onFishClick={handleFishClick} />

      {/* ── 3. 魚種・期間フィルター ──────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* 魚種 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FilterLabel text="魚種" />
          <div className="scroll-x" style={{ display: 'flex', gap: 6 }}>
            {FISH_LIST.map((f) => (
              <FilterPill key={f} active={fish === f} onClick={() => handleFishClick(f)}>
                {f}
              </FilterPill>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* 期間：今日/昨日/一昨日 + 直近7日/直近30日 + 📅 カレンダー */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <FilterLabel text="期間" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {buildPeriods().map(({ label, value }) => (
              <FilterPill key={value} active={period === value} onClick={() => setPeriod(value)}>
                {label}
              </FilterPill>
            ))}
            {/* 📅 カレンダー指定ボタン */}
            {(() => {
              const presets = buildPeriods().map((p) => p.value)
              const isCustom = /^\d{4}-\d{2}-\d{2}$/.test(period) && !presets.includes(period)
              return (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <FilterPill active={isCustom} onClick={() => {}}>
                    日付指定 📅{isCustom ? ` ${period.slice(5).replace('-', '/')}` : ''}
                  </FilterPill>
                  <input
                    type="date"
                    value={isCustom ? period : ''}
                    onChange={(e) => e.target.value && setPeriod(e.target.value)}
                    style={{
                      position: 'absolute', inset: 0,
                      opacity: 0, cursor: 'pointer', width: '100%',
                    }}
                  />
                </div>
              )
            })()}
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

      {/* ── 5. 釣果サマリーカード ────────────────────────────────── */}
      <SummaryCard records={filtered} envData={envData} period={period} />

      {/* ── 6. 一覧 / 詳細 / グラフ タブ ────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)', padding: '0 16px', flexWrap: 'wrap', gap: 6,
        }}>
          <div style={{ display: 'flex' }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '12px 16px', fontSize: 13,
                fontWeight: tab === t ? 600 : 400, cursor: 'pointer', border: 'none',
                borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
                background: 'transparent',
                color: tab === t ? '#e2e8f0' : 'var(--text-sub)',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
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

        {tab === '一覧'  && <CatchTable records={filtered} sortField={sortField} onSort={setSortField} />}
        {tab === '詳細'  && <CatchCards records={filtered} />}
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
