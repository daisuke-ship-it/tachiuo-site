'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import CatchTable from './CatchTable'
import CatchChart from './CatchChart'

type Area    = '東京湾' | '相模湾'
type Fish    = 'タチウオ' | 'アジ' | 'シーバス' | 'サワラ'
type Method  = 'ルアー' | '餌' | 'テンヤ'
type Period  = '今日' | '昨日' | '直近7日' | '直近30日'
type SortKey = 'date' | 'count' | 'size'

const AREAS:   Area[]   = ['東京湾', '相模湾']
const FISHES:  Fish[]   = ['タチウオ', 'アジ', 'シーバス', 'サワラ']
const METHODS: Method[] = ['ルアー', '餌', 'テンヤ']
const PERIODS: { label: string; value: Period }[] = [
  { label: '今日',   value: '今日'    },
  { label: '昨日',   value: '昨日'    },
  { label: '直近7日', value: '直近7日' },
  { label: '直近30日', value: '直近30日' },
]

/* ── Small UI components ─────────────────────────────────────── */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: active
          ? '1.5px solid var(--accent)'
          : '1px solid var(--border)',
        background: active ? 'var(--accent-light)' : 'transparent',
        color: active ? 'var(--secondary)' : 'var(--text-sub)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  )
}

function PeriodTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        background: 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-sub)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  )
}

function SortBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '4px 11px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'var(--accent-light)' : 'transparent',
        color: active ? 'var(--secondary)' : 'var(--text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {children}
      <span style={{ fontSize: 9, opacity: active ? 1 : 0.4 }}>▼</span>
    </button>
  )
}

/* ── isSameDay util ──────────────────────────────────────────── */
function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate()
  )
}

/* ── Main component ──────────────────────────────────────────── */
export default function CatchDashboard({ records }: { records: CatchRecord[] }) {
  const [area,    setArea]    = useState<Area | null>('東京湾')
  const [fish,    setFish]    = useState<Fish | null>('タチウオ')
  const [method,  setMethod]  = useState<Method | null>(null)
  const [period,  setPeriod]  = useState<Period>('直近7日')
  const [sortKey, setSortKey] = useState<SortKey>('date')

  const toggleArea   = (a: Area)   => setArea  ((p) => (p === a ? null : a))
  const toggleFish   = (f: Fish)   => {
    setFish((p) => {
      if (p === f) { setMethod(null); return null }
      if (f !== 'タチウオ') setMethod(null)
      return f
    })
  }
  const toggleMethod = (m: Method) => setMethod((p) => (p === m ? null : m))

  const filtered = useMemo(() => {
    const now       = new Date()
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

    let result = [...records]

    if (period === '今日') {
      result = result.filter((r) => r.date && isSameDay(new Date(r.date), today))
    } else if (period === '昨日') {
      result = result.filter((r) => r.date && isSameDay(new Date(r.date), yesterday))
    } else if (period === '直近7日') {
      const cutoff = new Date(today); cutoff.setDate(today.getDate() - 7)
      result = result.filter((r) => r.date && new Date(r.date) >= cutoff)
    } else if (period === '直近30日') {
      const cutoff = new Date(today); cutoff.setDate(today.getDate() - 30)
      result = result.filter((r) => r.date && new Date(r.date) >= cutoff)
    }

    if (area)   result = result.filter((r) => r.shipyard_area?.includes(area))
    if (fish) {
      const aliases = fish === 'タチウオ' ? ['タチウオ', '太刀魚'] : [fish]
      result = result.filter((r) => aliases.some((a) => r.fish_name?.includes(a)))
    }
    if (method) result = result.filter((r) => r.fishing_method?.includes(method))

    if (sortKey === 'count') {
      result.sort((a, b) => (b.count_max ?? b.count_min ?? -1) - (a.count_max ?? a.count_min ?? -1))
    } else if (sortKey === 'size') {
      result.sort((a, b) => (b.size_max_cm ?? b.size_min_cm ?? -1) - (a.size_max_cm ?? a.size_min_cm ?? -1))
    }

    return result
  }, [records, area, fish, method, period, sortKey])

  const chartRecords = useMemo(() => {
    let result = [...records]
    if (area) result = result.filter((r) => r.shipyard_area?.includes(area))
    if (fish) {
      const aliases = fish === 'タチウオ' ? ['タチウオ', '太刀魚'] : [fish]
      result = result.filter((r) => aliases.some((a) => r.fish_name?.includes(a)))
    }
    return result
  }, [records, area, fish])

  /* Label for filter section */
  const filterLabel = (text: string) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        minWidth: 44,
        flexShrink: 0,
        letterSpacing: '0.03em',
      }}
    >
      {text}
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Filter panel ───────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* エリア */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          {filterLabel('エリア')}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {AREAS.map((a) => (
              <FilterPill key={a} active={area === a} onClick={() => toggleArea(a)}>
                {a}
              </FilterPill>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* 魚種 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          {filterLabel('魚種')}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {FISHES.map((f) => (
              <FilterPill key={f} active={fish === f} onClick={() => toggleFish(f)}>
                {f}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* 釣り方（タチウオ時のみ） */}
        {fish === 'タチウオ' && (
          <>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
              {filterLabel('釣り方')}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {METHODS.map((m) => (
                  <FilterPill key={m} active={method === m} onClick={() => toggleMethod(m)}>
                    {m}
                  </FilterPill>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Chart ──────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 22px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          直近30日の釣果トレンド
        </p>
        <CatchChart records={chartRecords} />
      </div>

      {/* ── Period tabs + Sort ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0 16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap' as const,
          gap: 8,
        }}
      >
        {/* Period */}
        <div style={{ display: 'flex', overflow: 'auto' }}>
          {PERIODS.map(({ label, value }) => (
            <PeriodTab key={value} active={period === value} onClick={() => setPeriod(value)}>
              {label}
            </PeriodTab>
          ))}
        </div>

        {/* Sort + count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 0',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>並び替え</span>
          <SortBtn active={sortKey === 'date'}  onClick={() => setSortKey('date')}>日付</SortBtn>
          <SortBtn active={sortKey === 'count'} onClick={() => setSortKey('count')}>釣果数</SortBtn>
          <SortBtn active={sortKey === 'size'}  onClick={() => setSortKey('size')}>サイズ</SortBtn>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border)',
              paddingLeft: 10,
              marginLeft: 4,
            }}
          >
            {filtered.length}件
          </span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <CatchTable records={filtered} />
      </div>
    </div>
  )
}
