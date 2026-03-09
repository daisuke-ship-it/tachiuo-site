'use client'

import { CatchRecord } from '@/lib/supabase'

type Props = {
  records: CatchRecord[]
}

function formatSize(min: number | null, max: number | null): string {
  if (!min && !max) return '—'
  if (min && max && min !== max) return `${min}〜${max} cm`
  return `${min ?? max} cm`
}

function formatCount(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null && min !== max) return `${min}〜${max} 尾`
  return `${min ?? max} 尾`
}

function formatDate(dateStr: string | null): { full: string; short: string } {
  if (!dateStr) return { full: '—', short: '—' }
  const d = new Date(dateStr)
  return {
    full: d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
    short: d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
  }
}

export default function CatchTable({ records }: Props) {
  return (
    <>
      {/* PC：テーブル表示 */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800/80 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">日付</th>
              <th className="px-4 py-3 text-left">船宿</th>
              <th className="px-4 py-3 text-left">エリア</th>
              <th className="px-4 py-3 text-left">魚種</th>
              <th className="px-4 py-3 text-right">サイズ</th>
              <th className="px-4 py-3 text-right">釣果</th>
              <th className="px-4 py-3 text-center">記事</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {records.map((r) => {
              const date = formatDate(r.date)
              return (
                <tr
                  key={r.id}
                  className="hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {date.full}
                  </td>
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                    {r.shipyard_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {r.shipyard_area ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {r.fish_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                    {formatSize(r.size_min_cm, r.size_max_cm)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="text-blue-400 font-semibold">
                      {formatCount(r.count_min, r.count_max)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.source_url ? (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-gray-400 hover:text-blue-400 transition-colors border border-gray-700 hover:border-blue-500 rounded px-2 py-1"
                      >
                        記事 ↗
                      </a>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* スマホ：カード表示 */}
      <div className="md:hidden space-y-3">
        {records.map((r) => {
          const date = formatDate(r.date)
          return (
            <div
              key={r.id}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-white text-base">{r.shipyard_name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{r.shipyard_area ?? ''}</p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-700 rounded-md px-2 py-1">
                  {date.short}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-900/60 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">サイズ</p>
                  <p className="text-sm text-gray-200">{formatSize(r.size_min_cm, r.size_max_cm)}</p>
                </div>
                <div className="bg-gray-900/60 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">釣果</p>
                  <p className="text-sm font-semibold text-blue-400">{formatCount(r.count_min, r.count_max)}</p>
                </div>
              </div>
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs text-gray-400 hover:text-blue-400 border border-gray-700 hover:border-blue-500 rounded-lg py-1.5 transition-colors"
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
