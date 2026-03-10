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
  if (min !== null && max !== null && min !== max) return `${min}〜${max}尾`
  return `${min ?? max}尾`
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
  'アジ':     { bg: '#F0FFF4', color: '#1A7A3C' },
  'シーバス': { bg: '#EFF6FF', color: '#1D4ED8' },
  'サワラ':   { bg: '#FDF4FF', color: '#7E22CE' },
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
  if (!fish) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const s = FISH_STYLE[fish] ?? { bg: '#F3F4F6', color: '#6B7280' }
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
      {fish}
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
    <>
      {/* ── PC: Table ────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--primary)' }}>
              {['日付', '船宿', 'エリア', '魚種', 'サイズ', '釣果', '記事'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '11px 16px',
                    textAlign: i >= 4 && i <= 5 ? 'center' : i === 6 ? 'center' : 'left',
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
                    <FishBadge fish={r.fish_name ?? null} />
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

      {/* ── Mobile: Cards ────────────────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 12,
        }}
      >
        {records.map((r) => {
          const date = formatDate(r.date)
          return (
            <div
              key={r.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {/* Top row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                }}
              >
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      fontSize: 14,
                      marginBottom: 5,
                    }}
                  >
                    {r.shipyard_name ?? '不明'}
                  </p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                    <AreaBadge area={r.shipyard_area ?? null} />
                    <FishBadge fish={r.fish_name ?? null} />
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-sub)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '3px 9px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {date.short}
                </span>
              </div>

              {/* Data grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>サイズ</p>
                  <p style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                    {formatSize(r.size_min_cm, r.size_max_cm)}
                  </p>
                </div>
                <div
                  style={{
                    background: '#EBF4FF',
                    border: '1px solid #BDD7EE',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>釣果数</p>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCount(r.count_min, r.count_max)}
                  </p>
                </div>
              </div>

              {/* Link */}
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: 10,
                    textAlign: 'right',
                    fontSize: 12,
                    color: 'var(--secondary)',
                  }}
                >
                  記事を見る ↗
                </a>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
