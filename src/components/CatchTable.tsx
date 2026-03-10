'use client'

import { CatchRecord } from '@/lib/supabase'

type Props = {
  records: CatchRecord[]
}

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
    full: d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
    short: d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
  }
}

const areaColor: Record<string, string> = {
  東京湾: 'rgba(42, 95, 168, 0.5)',
  相模湾: 'rgba(26, 90, 80, 0.5)',
}

export default function CatchTable({ records }: Props) {
  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#445566' }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>〜</p>
        <p>釣果データがありません</p>
      </div>
    )
  }

  return (
    <>
      {/* PC: テーブル */}
      <div className="hidden md:block" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(26, 58, 107, 0.4)' }}>
              {['日付', '船宿', 'エリア', '魚種', 'サイズ', '釣果', '記事'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 14px',
                    textAlign: i >= 4 && i <= 5 ? 'right' : i === 6 ? 'center' : 'left',
                    color: '#c9a84c',
                    fontWeight: 500,
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    borderBottom: '1px solid rgba(201,168,76,0.2)',
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
              const date = formatDate(r.date)
              const area = r.shipyard_area ?? ''
              const isEven = idx % 2 === 0
              return (
                <tr
                  key={r.id}
                  style={{
                    background: isEven ? 'rgba(13,21,38,0.6)' : 'rgba(10,15,26,0.4)',
                    transition: 'background 0.15s',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(42,95,168,0.15)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isEven
                      ? 'rgba(13,21,38,0.6)'
                      : 'rgba(10,15,26,0.4)')
                  }
                >
                  <td style={{ padding: '10px 14px', color: '#8899aa', whiteSpace: 'nowrap' }}>
                    {date.full}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      color: '#e8dcc8',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.shipyard_name ?? '—'}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    {area ? (
                      <span
                        style={{
                          background: areaColor[area] ?? 'rgba(60,60,80,0.5)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 11,
                          color: '#aabbcc',
                        }}
                      >
                        {area}
                      </span>
                    ) : (
                      <span style={{ color: '#445566' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#aabbcc' }}>
                    {r.fish_name ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      color: '#8899aa',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatSize(r.size_min_cm, r.size_max_cm)}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: '#c9a84c', fontWeight: 700, fontSize: 14 }}>
                      {formatCount(r.count_min, r.count_max)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {r.source_url ? (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          color: '#8899aa',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 4,
                          padding: '3px 10px',
                          transition: 'all 0.15s',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#c9a84c'
                          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#8899aa'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                        }}
                      >
                        記事 ↗
                      </a>
                    ) : (
                      <span style={{ color: '#334455' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* スマホ: カード */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {records.map((r) => {
          const date = formatDate(r.date)
          const area = r.shipyard_area ?? ''
          return (
            <div
              key={r.id}
              style={{
                background: '#0d1526',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#e8dcc8', fontSize: 15, marginBottom: 2 }}>
                    {r.shipyard_name ?? '—'}
                  </p>
                  {area && (
                    <span
                      style={{
                        background: areaColor[area] ?? 'rgba(60,60,80,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        padding: '1px 7px',
                        fontSize: 10,
                        color: '#aabbcc',
                      }}
                    >
                      {area}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: '#8899aa',
                    background: 'rgba(26,58,107,0.3)',
                    border: '1px solid rgba(42,95,168,0.3)',
                    borderRadius: 6,
                    padding: '3px 9px',
                  }}
                >
                  {date.short}
                </span>
              </div>

              {r.fish_name && (
                <p style={{ fontSize: 12, color: '#7788aa', marginBottom: 8 }}>
                  {r.fish_name}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div
                  style={{
                    background: 'rgba(8,13,26,0.6)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <p style={{ fontSize: 10, color: '#556677', marginBottom: 3 }}>サイズ</p>
                  <p style={{ fontSize: 13, color: '#aabbcc' }}>
                    {formatSize(r.size_min_cm, r.size_max_cm)}
                  </p>
                </div>
                <div
                  style={{
                    background: 'rgba(8,13,26,0.6)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <p style={{ fontSize: 10, color: '#556677', marginBottom: 3 }}>釣果</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#c9a84c' }}>
                    {formatCount(r.count_min, r.count_max)}
                  </p>
                </div>
              </div>

              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: 10,
                    textAlign: 'center',
                    fontSize: 12,
                    color: '#8899aa',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '7px',
                    textDecoration: 'none',
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
