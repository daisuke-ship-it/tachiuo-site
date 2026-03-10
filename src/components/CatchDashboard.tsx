'use client'

import { useState, useMemo } from 'react'
import { CatchRecord } from '@/lib/supabase'
import CatchTable from './CatchTable'
import CatchChart from './CatchChart'

type Area = '東京湾' | '相模湾'
type Fish = 'タチウオ' | 'アジ' | 'シーバス' | 'サワラ'
type Method = 'ルアー' | '餌' | 'テンヤ'
type Period = '今日' | '昨日' | '直近7日' | '直近30日'
type SortKey = 'date' | 'count' | 'size'

const AREAS: Area[] = ['東京湾', '相模湾']
const FISHES: Fish[] = ['タチウオ', 'アジ', 'シーバス', 'サワラ']
const METHODS: Method[] = ['ルアー', '餌', 'テンヤ']
const PERIODS: { label: string; value: Period }[] = [
  { label: '今日', value: '今日' },
  { label: '昨日', value: '昨日' },
  { label: '直近7日', value: '直近7日' },
  { label: '直近30日', value: '直近30日' },
]

function FilterBtn({
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
        borderRadius: 20,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: active ? '1px solid rgba(201,168,76,0.7)' : '1px solid rgba(255,255,255,0.1)',
        background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
        color: active ? '#c9a84c' : '#8899aa',
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
        flex: 1,
        padding: '9px 4px',
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        cursor: 'pointer',
        border: 'none',
        borderBottom: active ? '2px solid #c9a84c' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#c9a84c' : '#667788',
        transition: 'all 0.2s',
        letterSpacing: '0.02em',
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
        gap: 4,
        padding: '4px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: active ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
        color: active ? '#c9a84c' : '#667788',
        transition: 'all 0.15s',
      }}
    >
      {children}
      <span style={{ fontSize: 10, opacity: active ? 1 : 0.4 }}>▼</span>
    </button>
  )
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export default function CatchDashboard({ records }: { records: CatchRecord[] }) {
  const [area, setArea] = useState<Area | null>(null)
  const [fish, setFish] = useState<Fish | null>(null)
  const [method, setMethod] = useState<Method | null>(null)
  const [period, setPeriod] = useState<Period>('直近7日')
  const [sortKey, setSortKey] = useState<SortKey>('date')

  // エリアトグル（同じボタンで解除）
  const toggleArea = (a: Area) => setArea((prev) => (prev === a ? null : a))
  // 魚種トグル（同じボタンで解除、切替時に釣り方リセット）
  const toggleFish = (f: Fish) => {
    setFish((prev) => {
      if (prev === f) { setMethod(null); return null }
      if (f !== 'タチウオ') setMethod(null)
      return f
    })
  }
  // 釣り方トグル
  const toggleMethod = (m: Method) => setMethod((prev) => (prev === m ? null : m))

  const filtered = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let result = [...records]

    // 期間フィルター
    if (period === '今日') {
      result = result.filter((r) => r.date && isSameDay(new Date(r.date), today))
    } else if (period === '昨日') {
      result = result.filter((r) => r.date && isSameDay(new Date(r.date), yesterday))
    } else if (period === '直近7日') {
      const cutoff = new Date(today)
      cutoff.setDate(today.getDate() - 7)
      result = result.filter((r) => r.date && new Date(r.date) >= cutoff)
    } else if (period === '直近30日') {
      const cutoff = new Date(today)
      cutoff.setDate(today.getDate() - 30)
      result = result.filter((r) => r.date && new Date(r.date) >= cutoff)
    }

    // エリアフィルター
    if (area) {
      result = result.filter((r) => r.shipyard_area?.includes(area))
    }

    // 魚種フィルター
    if (fish) {
      result = result.filter((r) => r.fish_name?.includes(fish))
    }

    // 釣り方フィルター
    if (method) {
      result = result.filter((r) => r.fishing_method?.includes(method))
    }

    // ソート
    if (sortKey === 'count') {
      result.sort((a, b) => {
        const aVal = a.count_max ?? a.count_min ?? -1
        const bVal = b.count_max ?? b.count_min ?? -1
        return bVal - aVal
      })
    } else if (sortKey === 'size') {
      result.sort((a, b) => {
        const aVal = a.size_max_cm ?? a.size_min_cm ?? -1
        const bVal = b.size_max_cm ?? b.size_min_cm ?? -1
        return bVal - aVal
      })
    }
    // date は DB の order のまま

    return result
  }, [records, area, fish, method, period, sortKey])

  // グラフ用: エリア・魚種フィルターを適用（期間は30日固定）
  const chartRecords = useMemo(() => {
    let result = [...records]
    if (area) result = result.filter((r) => r.shipyard_area?.includes(area))
    if (fish) result = result.filter((r) => r.fish_name?.includes(fish))
    return result
  }, [records, area, fish])

  return (
    <div>
      {/* フィルターバー */}
      <div
        style={{
          background: 'rgba(13,21,38,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 12,
        }}
      >
        {/* エリア */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          <span
            style={{
              fontSize: 11,
              color: '#556677',
              letterSpacing: '0.1em',
              minWidth: 50,
              flexShrink: 0,
            }}
          >
            エリア
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {AREAS.map((a) => (
              <FilterBtn key={a} active={area === a} onClick={() => toggleArea(a)}>
                {a}
              </FilterBtn>
            ))}
          </div>
        </div>

        {/* 区切り */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* 魚種 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          <span
            style={{
              fontSize: 11,
              color: '#556677',
              letterSpacing: '0.1em',
              minWidth: 50,
              flexShrink: 0,
            }}
          >
            魚種
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {FISHES.map((f) => (
              <FilterBtn key={f} active={fish === f} onClick={() => toggleFish(f)}>
                {f}
              </FilterBtn>
            ))}
          </div>
        </div>

        {/* 釣り方（タチウオ選択時のみ） */}
        {fish === 'タチウオ' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
            <span
              style={{
                fontSize: 11,
                color: '#556677',
                letterSpacing: '0.1em',
                minWidth: 50,
                flexShrink: 0,
              }}
            >
              釣り方
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {METHODS.map((m) => (
                <FilterBtn key={m} active={method === m} onClick={() => toggleMethod(m)}>
                  {m}
                </FilterBtn>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 釣果グラフ */}
      <div style={{ marginBottom: 20 }}>
        <CatchChart records={chartRecords} />
      </div>

      {/* 期間タブ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 16,
          overflowX: 'auto' as const,
        }}
      >
        {PERIODS.map(({ label, value }) => (
          <PeriodTab key={value} active={period === value} onClick={() => setPeriod(value)}>
            {label}
          </PeriodTab>
        ))}
      </div>

      {/* ソート + 件数 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          flexWrap: 'wrap' as const,
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#556677' }}>並び替え</span>
          <SortBtn active={sortKey === 'date'} onClick={() => setSortKey('date')}>
            日付
          </SortBtn>
          <SortBtn active={sortKey === 'count'} onClick={() => setSortKey('count')}>
            釣果数
          </SortBtn>
          <SortBtn active={sortKey === 'size'} onClick={() => setSortKey('size')}>
            サイズ
          </SortBtn>
        </div>
        <span style={{ fontSize: 12, color: '#556677' }}>{filtered.length} 件</span>
      </div>

      {/* テーブル */}
      <div
        style={{
          background: 'rgba(10,15,26,0.6)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <CatchTable records={filtered} />
      </div>
    </div>
  )
}
