'use client'

import { CatchRecord } from '@/lib/supabase'

const AREA_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  '東京湾': { bg: '#EBF4FF', color: '#1A5276', border: '#BDD7EE' },
  '相模湾': { bg: '#EAFAF3', color: '#0E6655', border: '#A9DFBF' },
}

const METHOD_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'テンヤ':   { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  'ルアー':   { bg: '#F0FFF4', color: '#065F46', border: '#6EE7B7' },
  '餌':       { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  'テンビン': { bg: '#F5F3FF', color: '#5B21B6', border: '#C4B5FD' },
  '天秤':     { bg: '#F5F3FF', color: '#5B21B6', border: '#C4B5FD' },
}

function Pill({
  label,
  style,
}: {
  label: string
  style: { bg: string; color: string; border: string }
}) {
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 'var(--radius-pill)',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
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

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

type Props = { records: CatchRecord[] }

export default function CatchCards({ records }: Props) {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>🎣</p>
        条件に一致するデータがありません
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
        padding: 16,
      }}
    >
      {records.map((r) => {
        const areaStyle  = r.shipyard_area
          ? (AREA_STYLE[r.shipyard_area]   ?? { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' })
          : null
        const methodStyle = r.fishing_method
          ? (METHOD_STYLE[r.fishing_method] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' })
          : null

        return (
          <div
            key={r.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 5 }}>
                  {r.shipyard_name ?? '—'}
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {areaStyle  && <Pill label={r.shipyard_area!}   style={areaStyle}   />}
                  {methodStyle && <Pill label={r.fishing_method!} style={methodStyle} />}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-sub)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  padding: '2px 7px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {formatDate(r.date)}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div
                style={{
                  background: '#EBF4FF',
                  border: '1px solid #BDD7EE',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>釣果</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCatch(r.count_min, r.count_max)}
                </p>
              </div>
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>サイズ</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatSize(r.size_min_cm, r.size_max_cm)}
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
                  textAlign: 'right',
                  fontSize: 11,
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
  )
}
