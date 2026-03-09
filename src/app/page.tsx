import { supabase, CatchRecord } from '@/lib/supabase'
import CatchTable from '@/components/CatchTable'

async function getCatchData(): Promise<CatchRecord[]> {
  const { data, error } = await supabase
    .from('tachiuo_catch')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase fetch error:', error)
    return []
  }
  return data ?? []
}

export const revalidate = 3600 // 1時間ごとに再取得

export default async function Home() {
  const records = await getCatchData()

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const uniqueShipyards = new Set(records.map((r) => r.shipyard_name)).size
  const latestDate = records[0]?.date
    ? new Date(records[0].date).toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ヘッダー */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              🎣 タチウオ釣果情報
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">東京湾・相模湾エリア</p>
          </div>
          <span className="text-xs text-gray-500">{today} 更新</span>
        </div>
      </header>

      {/* メイン */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 集計バッジ */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-3">
            <p className="text-xs text-gray-400 mb-1">総件数</p>
            <p className="text-2xl font-bold text-white">{records.length} <span className="text-sm font-normal text-gray-400">件</span></p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-3">
            <p className="text-xs text-gray-400 mb-1">船宿数</p>
            <p className="text-2xl font-bold text-white">{uniqueShipyards} <span className="text-sm font-normal text-gray-400">軒</span></p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-3">
            <p className="text-xs text-gray-400 mb-1">最新釣行日</p>
            <p className="text-2xl font-bold text-white">{latestDate}</p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-20 text-gray-500">データがありません</div>
        ) : (
          <CatchTable records={records} />
        )}
      </main>

      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        データは各船宿サイトより自動収集しています
      </footer>
    </div>
  )
}
