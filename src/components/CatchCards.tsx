'use client'

import { CatchRecord, CatchDetail } from '@/lib/supabase'

/* ── Badge definitions ─────────────────────────────────────── */
const AREA_STYLE   = { bg: '#1a2744', color: '#93c5fd' }
const PORT_STYLE   = { bg: '#1a2744', color: '#7dd3fc' }
const FISH_STYLE   = { bg: 'rgba(30,58,95,0.7)', color: '#93c5fd' }

const METHOD_STYLE: Record<string, { bg: string; color: string }> = {
  'テンヤ':   { bg: 'rgba(20,83,45,0.6)',  color: '#86efac' },
  'ルアー':   { bg: 'rgba(30,58,95,0.6)',  color: '#93c5fd' },
  'ジギング': { bg: 'rgba(30,58,95,0.6)',  color: '#93c5fd' },
  '餌':       { bg: 'rgba(67,20,7,0.6)',   color: '#fdba74' },
  'エサ':     { bg: 'rgba(67,20,7,0.6)',   color: '#fdba74' },
  'テンビン': { bg: 'rgba(67,20,7,0.6)',   color: '#fdba74' },
  '天秤':     { bg: 'rgba(67,20,7,0.6)',   color: '#fdba74' },
}
const METHOD_DEFAULT = { bg: 'rgba(45,55,72,0.6)', color: '#94a3b8' }

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      padding: '2px 8px', fontSize: 10, fontWeight: 600,
      borderRadius: 'var(--radius-pill)',
      background: bg, color,
      whiteSpace: 'nowrap',
      border: `1px solid ${color}22`,
    }}>
      {label}
    </span>
  )
}

/* ── Formatters ─────────────────────────────────────────────── */
function formatCatch(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  const lo = min ?? max!
  const hi = max ?? min!
  return `${lo}〜${hi}本`
}

function formatSize(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  const lo = min ?? max!
  const hi = max ?? min!
  return `${lo}〜${hi}cm`
}

function normalizeSizeText(text: string): string {
  const unit = /kg/i.test(text) ? 'kg' : 'cm'
  const stripped = text.replace(/\s*cm/gi, '').replace(/\s*kg/gi, '').replace(/\s*センチ/g, '').replace(/[~\-–〜～]/g, '〜').trim()
  return stripped ? stripped + unit : ''
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 12,
      padding: 16,
    }}>
      {records.map((r) => {
        const methodStyle = r.fishing_method
          ? (METHOD_STYLE[r.fishing_method] ?? METHOD_DEFAULT)
          : null
        const condText = r.condition_text
          ? (r.condition_text.length > 100 ? r.condition_text.slice(0, 100) + '…' : r.condition_text)
          : null

        return (
          <div key={r.id} style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Header: 船宿名 + 日付 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, marginRight: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', lineHeight: 1.3 }}>
                  {r.shipyard_name ?? '—'}
                </p>
                {r.boat_name && (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {r.boat_name}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0, paddingTop: 1 }}>
                {formatDate(r.date)}
              </span>
            </div>

            {/* Badges: エリア → 港 → 魚種 → 釣り方 */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {r.shipyard_area && (
                <Badge label={r.port_name ? `${r.shipyard_area}　${r.port_name}` : r.shipyard_area} bg={AREA_STYLE.bg} color={AREA_STYLE.color} />
              )}
              {r.fish_name && (
                <Badge label={r.fish_name} bg={FISH_STYLE.bg} color={FISH_STYLE.color} />
              )}
              {r.fishing_method && methodStyle && (
                <Badge label={r.fishing_method} bg={methodStyle.bg} color={methodStyle.color} />
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

            {/* Stats */}
            {r.catch_details.length > 0 ? (() => {
              // species_name でグループ集計
              const map = new Map<string, { min: number; max: number; unit: string; size_text: string | null }>()
              for (const d of r.catch_details) {
                if (d.count === null) continue
                const key = d.species_name ?? '—'
                const cur = map.get(key)
                map.set(key, cur
                  ? { ...cur, min: Math.min(cur.min, d.count), max: Math.max(cur.max, d.count) }
                  : { min: d.count, max: d.count, unit: d.unit ?? '尾', size_text: d.size_text ?? null }
                )
              }
              const agg = [...map.entries()].map(([name, v]) => ({ name, ...v }))
              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {agg.map(({ name, min, max, unit, size_text }) => {
                  return (
                  <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 56, flexShrink: 0 }}>
                      {name}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>
                      {min === max ? `${max}` : `${min}〜${max}`}
                    </span>
                    {size_text && (
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                        {normalizeSizeText(size_text)}
                      </span>
                    )}
                  </div>
                  )
                })}
              </div>
              )
            })() : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b', minWidth: 44 }}>釣果</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCatch(r.count_min, r.count_max)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b', minWidth: 44 }}>サイズ</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                    {formatSize(r.size_min_cm, r.size_max_cm)}
                  </span>
                </div>
              </div>
            )}

            {/* 船長コメント */}
            {condText && (
              <div style={{
                marginTop: 12,
                background: '#0f1a2e',
                border: '1px solid #2d3748',
                borderRadius: 6,
                padding: '8px 10px',
              }}>
                <p style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>💬 船長コメント</p>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.55 }}>
                  {condText}
                </p>
              </div>
            )}

            {/* 記事リンク */}
            {r.source_url && (
              <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'right', fontSize: 11, color: '#3b82f6', marginTop: 10 }}>
                記事を見る ↗
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
