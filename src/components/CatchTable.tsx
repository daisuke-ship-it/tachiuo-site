'use client'

import { CatchRecord } from '@/lib/supabase'

export type SortField = 'count' | 'size' | null

type Props = {
  records: CatchRecord[]
  sortField: SortField
  onSort: (f: SortField) => void
}

const METHOD_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'テンヤ':   { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  'ルアー':   { bg: '#F0FFF4', color: '#065F46', border: '#6EE7B7' },
  '餌':       { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  'テンビン': { bg: '#F5F3FF', color: '#5B21B6', border: '#C4B5FD' },
  '天秤':     { bg: '#F5F3FF', color: '#5B21B6', border: '#C4B5FD' },
}

function formatCatch(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null && min !== max) return `${min}〜${max}`
  return `${min ?? max}`
}

function formatSize(min: number | null, max: number | null): string {
  if (!min && !max) return '—'
  if (min && max && min !== max) return `${min}〜${max}`
  return `${min ?? max}`
}

function SortTh({
  label,
  field,
  active,
  onSort,
}: {
  label: string
  field: SortField
  active: boolean
  onSort: (f: SortField) => void
}) {
  return (
    <th
      onClick={() => onSort(active ? null : field)}
      style={{
        padding: '10px 12px',
        textAlign: 'right',
        color: active ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {label}{active ? ' ▼' : ''}
    </th>
  )
}

export default function CatchTable({ records, sortField, onSort }: Props) {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>🎣</p>
        条件に一致するデータがありません
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr style={{ background: 'var(--primary)' }}>
            {(['船宿', '釣り方'] as const).map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  color: 'rgba(255,255,255,0.55)',
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
            <SortTh label="釣果" field="count" active={sortField === 'count'} onSort={onSort} />
            <SortTh label="サイズ" field="size"  active={sortField === 'size'}  onSort={onSort} />
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.04em',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                whiteSpace: 'nowrap',
              }}
            >
              日付
            </th>
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 600,
                fontSize: 11,
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              記事
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const isEven = idx % 2 === 0
            const ms = r.fishing_method ? (METHOD_STYLE[r.fishing_method] ?? null) : null

            return (
              <tr
                key={r.id}
                style={{
                  background: isEven ? 'var(--surface)' : 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(14,165,200,0.05)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isEven ? 'var(--surface)' : 'var(--surface-2)')
                }
              >
                {/* 船宿 */}
                <td
                  style={{
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 0,
                  }}
                >
                  {r.shipyard_name ?? '—'}
                </td>

                {/* 釣り方 */}
                <td style={{ padding: '9px 12px' }}>
                  {ms ? (
                    <span
                      style={{
                        padding: '1px 5px',
                        fontSize: 9,
                        fontWeight: 600,
                        borderRadius: 'var(--radius-pill)',
                        background: ms.bg,
                        color: ms.color,
                        border: `1px solid ${ms.border}`,
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.fishing_method}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* 釣果 */}
                <td
                  style={{
                    padding: '9px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: 'var(--secondary)',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCatch(r.count_min, r.count_max)}
                </td>

                {/* サイズ */}
                <td
                  style={{
                    padding: '9px 12px',
                    textAlign: 'right',
                    color: 'var(--text-sub)',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatSize(r.size_min_cm, r.size_max_cm)}
                </td>

                {/* 日付 */}
                <td
                  style={{
                    padding: '9px 12px',
                    color: 'var(--text-sub)',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.date
                    ? new Date(r.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                    : '—'}
                </td>

                {/* 記事 */}
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  {r.source_url ? (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 14, color: 'var(--secondary)', textDecoration: 'none' }}
                    >
                      ↗
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
