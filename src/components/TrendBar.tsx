'use client'

import { CatchRecord } from '@/lib/supabase'

export type Fish = 'タチウオ' | 'アジ' | 'シーバス' | 'サワラ'

export const FISH_LIST: Fish[] = ['タチウオ', 'アジ', 'シーバス', 'サワラ']

export const FISH_ALIASES: Record<Fish, string[]> = {
  'タチウオ': ['タチウオ', '太刀魚'],
  'アジ':     ['アジ'],
  'シーバス': ['シーバス'],
  'サワラ':   ['サワラ'],
}

type Trend = { icon: string; label: string; color: string }

function getTrend(recent: number, prev: number, hasData: boolean): Trend {
  if (!hasData) return { icon: '—', label: 'データなし', color: 'var(--text-muted)' }
  if (prev === 0 && recent === 0) return { icon: '—', label: 'データなし', color: 'var(--text-muted)' }
  if (prev === 0) return { icon: '↑', label: '好調継続', color: '#16A34A' }
  const r = recent / prev
  if (r >= 1.3)  return { icon: '↑',  label: '好調継続',   color: '#16A34A' }
  if (r >= 1.05) return { icon: '↗', label: '上がり調子', color: '#0D9488' }
  if (r >= 0.95) return { icon: '→', label: '横ばい',     color: '#6B7280' }
  if (r >= 0.7)  return { icon: '↘', label: '鈍化',       color: '#D97706' }
  return               { icon: '↓',  label: '不調',       color: '#DC2626' }
}

function avg(records: CatchRecord[]) {
  const vals = records
    .map((r) => r.count_max ?? r.count_min)
    .filter((v): v is number => v !== null)
  if (vals.length === 0) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

type Props = {
  records: CatchRecord[]
  activeFish: Fish | null
  onFishClick: (f: Fish) => void
}

export default function TrendBar({ records, activeFish, onFishClick }: Props) {
  const todayMs   = new Date().setHours(0, 0, 0, 0)
  const recent7s  = todayMs - 6  * 86400_000
  const prev7s    = todayMs - 13 * 86400_000
  const prev7e    = todayMs - 7  * 86400_000

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}
    >
      {FISH_LIST.map((fish) => {
        const aliases = FISH_ALIASES[fish]
        const fishRecs = records.filter(
          (r) => r.fish_name && aliases.some((a) => r.fish_name!.includes(a))
        )

        const recentRecs = fishRecs.filter((r) => {
          if (!r.date) return false
          const t = new Date(r.date).getTime()
          return t >= recent7s && t <= todayMs + 86400_000
        })
        const prevRecs = fishRecs.filter((r) => {
          if (!r.date) return false
          const t = new Date(r.date).getTime()
          return t >= prev7s && t < prev7e
        })

        const recentAvg = avg(recentRecs)
        const prevAvg   = avg(prevRecs)
        const hasData   = recentRecs.length > 0 || prevRecs.length > 0
        const trend     = getTrend(recentAvg, prevAvg, hasData)
        const isActive  = activeFish === fish

        return (
          <button
            key={fish}
            onClick={() => onFishClick(fish)}
            style={{
              padding: '10px 8px',
              borderRadius: 'var(--radius-md)',
              border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: isActive ? 'var(--accent-light)' : 'var(--surface)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isActive ? 'var(--secondary)' : 'var(--text-main)',
                  whiteSpace: 'nowrap',
                }}
              >
                {fish}
              </span>
              <span style={{ fontSize: 16, color: trend.color, lineHeight: 1, marginLeft: 4 }}>
                {trend.icon}
              </span>
            </div>
            <div style={{ fontSize: 10, color: trend.color, fontWeight: 600 }}>
              {trend.label}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
              直近{Math.round(recentAvg * 10) / 10} / 前週{Math.round(prevAvg * 10) / 10}
            </div>
          </button>
        )
      })}
    </div>
  )
}
