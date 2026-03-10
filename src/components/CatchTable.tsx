'use client'

import { CatchRecord } from '@/lib/supabase'

type Props = { records: CatchRecord[] }

/* ── Formatters ──────────────────────────────────────────────── */
function formatSize(min: number | null, max: number | null): string {
  if (!min && !max) return '—'
  if (min && max && min !== max) return `${min}〜${max}cm`
  return `${min ?? max}cm`
}

function formatCount(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null && min !== max) return `${min}〜${max}`
  return `${min ?? max}`
}

function formatDate(dateStr: string | null): { full: string; short: string } {
  if (!dateStr) return { full: '—', short: '—' }
  const d = new Date(dateStr)
  return {
    full:  d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
    short: d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
  }
}

/* ── Badge configs ───────────────────────────────────────────── */
const AREA_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  '東京湾': { bg: '#EBF4FF', color: '#1A5276', border: '#BDD7EE' },
  '相模湾': { bg: '#EAFAF3', color: '#0E6655', border: '#A9DFBF' },
}

const FISH_STYLE: Record<string, { bg: string; color: string }> = {
  'タチウオ': { bg: '#FFF3E0', color: '#BF5E18' },
  '太刀魚':   { bg: '#FFF3E0', color: '#BF5E18' },
  'アジ':     { bg: '#F0FFF4', color: '#1A7A3C' },
  'シーバス': { bg: '#EFF6FF', color: '#1D4ED8' },
  'サワラ':   { bg: '#FDF4FF', color: '#7E22CE' },
}

const METHOD_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'テンヤ':   { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  'ルアー':   { bg: '#F0FFF4', color: '#065F46', border: '#6EE7B7' },
  '餌':       { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  'テンビン': { bg: '#F5F3FF', color: '#5B21B6', border: '#C4B5FD' },
  '天秤':     { bg: '#F5F3FF', color: '#5B21B6', border: '#C4B5FD' },
}

// 「太刀魚」→「タチウオ」に統一
const normalizeFishName = (name: string | null): string | null => {
  if (name === '太刀魚') return 'タチウオ'
  return name
}

function AreaBadge({ area }: { area: string | null }) {
  if (!area) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const s = AREA_STYLE[area] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' }
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 'var(--radius-pill)',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {area}
    </span>
  )
}

function FishBadge({ fish }: { fish: string | null }) {
  const displayName = normalizeFishName(fish)
  if (!displayName) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const s = FISH_STYLE[displayName] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 'var(--radius-pill)',
        background: s.bg,
        color: s.color,
        whiteSpace: 'nowrap',
      }}
    >
      {displayName}
    </span>
  )
}

function MethodBadge({ method }: { method: string | null }) {
  if (!method) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
  const s = METHOD_STYLE[method] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' }
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 'var(--radius-pill)',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {method}
    </span>
  )
}

/* ── Component ───────────────────────────────────────────────── */
export default function CatchTable({ records }: Props) {
  if (records.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        <p style={{ fontSize: 28, marginBottom: 8 }}>🎣</p>
        条件に一致するデータがありません
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--primary)' }}>
              {['日付', '船宿', 'エリア', '魚種', '釣り方', 'サイズ', '釣果', '記事'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '11px 16px',
                    textAlign: i >= 5 && i <= 6 ? 'center' : i === 7 ? 'center' : 'left',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => {
              const date    = formatDate(r.date)
              const isEven  = idx % 2 === 0
              return (
                <tr
                  key={r.id}
                  style={{
                    background: isEven ? 'var(--surface)' : 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(14,165,200,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? 'var(--surface)' : 'var(--surface-2)')}
                >
                  <td
                    style={{
                      padding: '10px 16px',
                      color: 'var(--text-sub)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {date.full}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      color: 'var(--text-main)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.shipyard_name ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                    <AreaBadge area={r.shipyard_area ?? null} />
                  </td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                    <FishBadge fish={normalizeFishName(r.fish_name ?? null)} />
                  </td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                    <MethodBadge method={r.fishing_method ?? null} />
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'center',
                      color: 'var(--text-sub)',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatSize(r.size_min_cm, r.size_max_cm)}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCount(r.count_min, r.count_max)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    {r.source_url ? (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          color: 'var(--text-sub)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '3px 10px',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--secondary)'
                          e.currentTarget.style.borderColor = 'var(--border-accent)'
                          e.currentTarget.style.background = 'var(--accent-light)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-sub)'
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        記事 ↗
                      </a>
                    ) : (
                      <span style={{ color: 'var(--border-strong)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
  )
}
