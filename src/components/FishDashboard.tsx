'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import { EnvData, AISummaryRecord, AreaRecord } from '@/app/page'
import { FishContent } from '@/lib/fishContent'
import CatchTable, { SortField } from './CatchTable'
import CatchChart from './CatchChart'

type Area = '東京湾' | '相模湾'

const METHOD_ORDER: Record<string, number> = {
  'ルアー': 0, 'テンヤ': 1, 'エサ': 2,
}

// ── Date utils (JST-safe) ─────────────────────────────────────
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayStr(): string { return localDateStr(new Date()) }

function defaultDateStr(): string {
  const now = new Date()
  const jstHour = (now.getUTCHours() + 9) % 24
  if (jstHour >= 15) return localDateStr(now)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  return localDateStr(yesterday)
}

function buildPeriods(): { label: string; value: string }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const result: { label: string; value: string }[] = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    result.push({ label: `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`, value: localDateStr(d) })
  }
  result.push({ label: '直近7日', value: '直近7日' })
  result.push({ label: '直近30日', value: '直近30日' })
  return result
}

function getSummaryLabel(period: string): string {
  if (period === '直近7日')  return '直近7日の釣果サマリー'
  if (period === '直近30日') return '直近30日の釣果サマリー'
  const d = new Date(period + 'T00:00:00')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}の釣果サマリー`
}

// ── Filters ───────────────────────────────────────────────────
function filterByArea(records: CatchRecord[], area: Area | null): CatchRecord[] {
  if (!area) return records
  return records.filter((r) => r.shipyard_area?.includes(area))
}

function filterByPeriod(records: CatchRecord[], period: string): CatchRecord[] {
  if (period === '直近7日') {
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = localDateStr(cutoff)
    return records.filter((r) => r.date && r.date >= cutoffStr)
  }
  if (period === '直近30日') {
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = localDateStr(cutoff)
    return records.filter((r) => r.date && r.date >= cutoffStr)
  }
  return records.filter((r) => r.date === period)
}

// ── Sub-components ────────────────────────────────────────────
function FilterPill({
  active, disabled, onClick, children,
}: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: '5px 14px', borderRadius: 'var(--radius-pill)', fontSize: 12,
        fontWeight: active ? 600 : 400, cursor: disabled ? 'not-allowed' : 'pointer',
        border: active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        background: disabled ? 'var(--surface-2)' : active ? 'var(--accent-light)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : active ? '#93c5fd' : 'var(--text-sub)',
        transition: 'all 0.15s', whiteSpace: 'nowrap' as const, opacity: disabled ? 0.5 : 1, flexShrink: 0,
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

function AISummaryCard({ text, fishName }: { text: string; fishName: string }) {
  return (
    <div style={{
      background: '#1a1500',
      borderLeft: '4px solid #d4a017',
      borderRight: '1px solid rgba(212,160,23,0.2)',
      borderTop: '1px solid rgba(212,160,23,0.2)',
      borderBottom: '1px solid rgba(212,160,23,0.2)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#d4a017', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, opacity: 0.8 }}>
        🤖 {fishName}の釣況（AIサマリー）
      </p>
      <p style={{ fontSize: 13, color: '#fef3c7', lineHeight: 1.6, margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

function StatsCard({ records, envData, period }: {
  records: CatchRecord[]; envData: EnvData | null; period: string
}) {
  const isToday = period === todayStr()
  const shipyardCount = new Set(records.map((r) => r.shipyard_name).filter(Boolean)).size

  const countVals = records.map((r) => r.count_max ?? r.count_min).filter((v): v is number => v !== null)
  const catchAvg  = countVals.length > 0 ? Math.round(countVals.reduce((a, b) => a + b, 0) / countVals.length * 10) / 10 : null
  const maxCatch  = countVals.length > 0 ? Math.max(...countVals) : null

  const sizeMaxVals = records.map((r) => r.size_max_cm).filter((v): v is number => v !== null)
  const sizeMinVals = records.map((r) => r.size_min_cm).filter((v): v is number => v !== null)
  const sizeMax = sizeMaxVals.length > 0 ? Math.max(...sizeMaxVals) : null
  const sizeMin = sizeMinVals.length > 0 ? Math.min(...sizeMinVals) : null
  const sizeRange = sizeMin !== null && sizeMax !== null && sizeMin !== sizeMax
    ? `${sizeMin}〜${sizeMax}cm`
    : sizeMax !== null ? `${sizeMax}cm` : '—'

  const weatherWord = isToday && envData?.weather ? envData.weather.split(' ')[0] : null

  const stats: { label: string; value: string; highlight?: boolean }[] = [
    { label: '天気',     value: weatherWord ?? '—' },
    { label: '潮汐',     value: isToday ? (envData?.tide_type ?? '—') : '—' },
    { label: '出船数',   value: shipyardCount > 0 ? `${shipyardCount}` : '—' },
    { label: '平均釣果', value: catchAvg !== null ? String(catchAvg) : '—', highlight: true },
    { label: '最大釣果', value: maxCatch !== null ? `${maxCatch}本` : '—' },
    { label: 'サイズ',   value: sizeRange },
  ]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)' }}>
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

function FishInfoCard({ content }: { content: FishContent }) {
  const items = [
    { label: '旬', value: content.season, icon: '🗓️' },
    { label: '主なポイント', value: content.points, icon: '📍' },
    { label: '主な釣り方', value: content.methods, icon: '🎣' },
  ]
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
        {content.name}について
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(({ label, value, icon }) => (
          <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
interface Props {
  records: CatchRecord[]
  envData: EnvData | null
  aiSummaries: AISummaryRecord[]
  areas: AreaRecord[]
  fishId: number | null
  content: FishContent
}

export default function FishDashboard({ records, envData, aiSummaries, fishId, content }: Props) {
  const [area,      setArea]      = useState<Area | null>('東京湾')
  const [period,    setPeriod]    = useState<string>(defaultDateStr())
  const [sortField, setSortField] = useState<SortField>(null)

  const presets      = buildPeriods()
  const isCustomPeriod = /^\d{4}-\d{2}-\d{2}$/.test(period) && !presets.some((p) => p.value === period)

  const areaFiltered = useMemo(() => filterByArea(records, area), [records, area])

  const filtered = useMemo(() => {
    let r = filterByPeriod(areaFiltered, period)
    if (sortField === 'count') {
      r = [...r].sort((a, b) => (b.count_max ?? b.count_min ?? -1) - (a.count_max ?? a.count_min ?? -1))
    } else if (sortField === 'size') {
      r = [...r].sort((a, b) => (b.size_max_cm ?? b.size_min_cm ?? -1) - (a.size_max_cm ?? a.size_min_cm ?? -1))
    } else {
      r = [...r].sort((a, b) => {
        const aOrd = METHOD_ORDER[a.method_group ?? a.fishing_method ?? ''] ?? 99
        const bOrd = METHOD_ORDER[b.method_group ?? b.fishing_method ?? ''] ?? 99
        if (aOrd !== bOrd) return aOrd - bOrd
        return (b.count_max ?? b.count_min ?? -1) - (a.count_max ?? a.count_min ?? -1)
      })
    }
    return r
  }, [areaFiltered, period, sortField])

  // AI サマリー（特定日付のみ）
  const summaryText = useMemo(() => {
    if (!fishId || period === '直近7日' || period === '直近30日') return null
    return aiSummaries.find(
      (s) => s.summary_type === 'fish_species' && s.target_id === fishId && s.target_date === period
    )?.summary_text ?? null
  }, [aiSummaries, fishId, period])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── フィルター ────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* エリア */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <FilterLabel text="エリア" />
          <div style={{ display: 'flex', gap: 6 }}>
            <FilterPill active={area === '東京湾'} onClick={() => setArea((p) => (p === '東京湾' ? null : '東京湾'))}>
              東京湾
            </FilterPill>
            <FilterPill active={false} disabled onClick={() => {}}>
              相模湾（準備中）
            </FilterPill>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* 期間 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <FilterLabel text="期間" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {presets.map(({ label, value }) => (
              <FilterPill key={value} active={period === value} onClick={() => setPeriod(value)}>
                {label}
              </FilterPill>
            ))}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <FilterPill active={isCustomPeriod} onClick={() => {}}>
                日付指定 📅{isCustomPeriod ? ` ${period.slice(5).replace('-', '/')}` : ''}
              </FilterPill>
              <input
                type="date"
                value={isCustomPeriod ? period : ''}
                onChange={(e) => e.target.value && setPeriod(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── AI サマリー ──────────────────────────────────── */}
      {summaryText && <AISummaryCard text={summaryText} fishName={content.name} />}

      {/* ── 統計カード ───────────────────────────────────── */}
      <StatsCard records={filtered} envData={envData} period={period} />

      {/* ── 釣果推移グラフ ───────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          直近30日の釣果平均トレンド
        </p>
        <CatchChart records={areaFiltered} />
      </div>

      {/* ── 船宿別釣果一覧 ───────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>船宿別釣果一覧</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length}件</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🎣</p>
            この期間の釣果データがありません
          </div>
        ) : (
          <CatchTable records={filtered} sortField={sortField} onSort={setSortField} />
        )}
      </div>

      {/* ── 魚種解説（SEO） ──────────────────────────────── */}
      <FishInfoCard content={content} />
    </div>
  )
}
