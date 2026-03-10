'use client'

import { CatchRecord } from '@/lib/supabase'

export type SortField = 'count' | 'size' | null

type Props = {
  records: CatchRecord[]
  sortField: SortField
  onSort: (f: SortField) => void
}

// 釣り方グループ別 行背景色
const GROUP_ROW_BG: Record<string, string> = {
  'ルアー': '#1a1f2e',
  'テンヤ': '#131720',
  'エサ':   '#0f1a14',
}
const GROUP_ROW_BG_DEFAULT = '#0f1117'

// 釣り方グループ別 左ボーダー色
const GROUP_BORDER: Record<string, string> = {
  'ルアー': '#3b82f6',
  'テンヤ': '#22c55e',
  'エサ':   '#f97316',
}

// fishing_method 文字列 → グループ名（method_group が null の場合のフォールバック）
function resolveMethodGroup(record: { method_group: string | null; fishing_method: string | null }): string | null {
  if (record.method_group) return record.method_group
  const m = record.fishing_method
  if (!m) return null
  if (m === 'ルアー' || m === 'ジギング') return 'ルアー'
  if (m === 'テンヤ') return 'テンヤ'
  if (m === '餌' || m === 'エサ' || m === 'テンビン' || m === '天秤') return 'エサ'
  return null
}

function formatCatch(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null && min !== max) return `${min}〜${max}`
  return `${min ?? max}`
}

function formatSize(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null && min !== max) return `${min}〜${max}`
  return `${min ?? max}`
}

function SortTh({ label, field, active, onSort }: {
  label: string; field: SortField; active: boolean; onSort: (f: SortField) => void
}) {
  return (
    <th
      onClick={() => onSort(active ? null : field)}
      style={{
        padding: '10px 12px', textAlign: 'right',
        color: active ? '#3b82f6' : 'rgba(255,255,255,0.55)',
        fontWeight: 600, fontSize: 11, letterSpacing: '0.04em',
        cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {label}{active ? ' ▼' : ''}
    </th>
  )
}

const thBase: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left',
  color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: 11,
  letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.07)',
  whiteSpace: 'nowrap',
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

  // 🏆 トップ判定（count_max が最大の行）
  const maxCount = Math.max(...records.map((r) => r.count_max ?? -1).filter((v) => v >= 0), -1)

  return (
    <div style={{ width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '34%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr style={{ background: 'var(--primary)' }}>
            <th style={thBase}>船宿</th>
            <SortTh label="釣果" field="count" active={sortField === 'count'} onSort={onSort} />
            <SortTh label="サイズ" field="size"  active={sortField === 'size'}  onSort={onSort} />
            <th style={{ ...thBase, paddingLeft: 20 }}>日付</th>
            <th style={{ ...thBase, textAlign: 'center' }}>記事</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const methodGroup = resolveMethodGroup(r)
            const rowBg       = methodGroup ? (GROUP_ROW_BG[methodGroup] ?? GROUP_ROW_BG_DEFAULT) : GROUP_ROW_BG_DEFAULT
            const borderColor = methodGroup ? (GROUP_BORDER[methodGroup] ?? null) : null
            const isTrophy    = maxCount > 0 && r.count_max === maxCount
            const dateStr     = r.date
              ? new Date(r.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
              : '—'

            return (
              <tr
                key={r.id}
                style={{
                  background: rowBg,
                  borderBottom: '1px solid var(--border)',
                  borderLeft: borderColor ? `2px solid ${borderColor}` : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
              >
                {/* 船宿（釣り方サブテキスト付き） */}
                <td style={{ padding: '8px 12px', maxWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}>
                    {isTrophy && <span style={{ marginRight: 3 }}>🏆</span>}
                    {r.shipyard_name ?? '—'}
                  </div>
                  {r.fishing_method && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap' }}>
                      {r.fishing_method}
                    </div>
                  )}
                </td>

                {/* 釣果 */}
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#93c5fd', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatCatch(r.count_min, r.count_max)}
                </td>

                {/* サイズ */}
                <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatSize(r.size_min_cm, r.size_max_cm)}
                </td>

                {/* 日付 */}
                <td style={{ padding: '8px 12px', paddingLeft: 20, color: 'var(--text-sub)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {dateStr}
                </td>

                {/* 記事 */}
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  {r.source_url ? (
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14, color: '#3b82f6', textDecoration: 'none' }}>
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
