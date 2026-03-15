import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'

// ── 型定義（他コンポーネントが import するため export 必須） ──────
export type EnvData = {
  weather: string | null
  wind_speed_ms: number | null
  tide_type: string | null
}
export type EnvDataMap = Record<string, EnvData>

export type AISummaryRecord = {
  summary_type: string
  target_id: number | null
  target_date: string
  summary_text: string
}

export type AreaRecord = {
  id: number
  name: string
}

export type FishRecord = {
  id: number
  name: string
}

// species_name → 同グループの全 species_name[]
export type SpeciesGroupMap = Record<string, string[]>

// ── エリア定義 ────────────────────────────────────────────────
type AreaSlug = 'tokyo' | 'sagami' | 'sotobo' | 'minamibo'

const AREA_CONFIG: { slug: AreaSlug; name: string; description: string }[] = [
  { slug: 'tokyo',    name: '東京湾', description: '金沢八景・横浜・走水など' },
  { slug: 'sagami',   name: '相模湾', description: '茅ケ崎・平塚・小田原など' },
  { slug: 'sotobo',   name: '外房',   description: '勝浦・大原・一宮など' },
  { slug: 'minamibo', name: '南房',   description: '館山・白浜など' },
]

// ── 型 ────────────────────────────────────────────────────────
type AreaStat = {
  areaName: string
  slug: AreaSlug
  description: string
  totalRecords: number
  todayRecords: number
  topSpecies: { name: string; avgMax: number }[]
  aiSummary: string | null
}

// ── データ取得 ─────────────────────────────────────────────────
type RawRow = {
  sail_date: string | null
  count_max: number | null
  shipyards: { areas: { name: string } | null } | null
  catch_details: { species_name: string | null; count: number | null }[]
}

async function getAreaStats(): Promise<AreaStat[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('catches')
    .select(`
      sail_date,
      count_max,
      shipyards ( areas ( name ) ),
      catch_details ( species_name, count )
    `)
    .gte('sail_date', cutoffStr)
    .order('sail_date', { ascending: false })

  const rows = (data ?? []) as unknown as RawRow[]

  return AREA_CONFIG.map(({ slug, name, description }) => {
    const areaRows = rows.filter((r) => r.shipyards?.areas?.name === name)
    const todayRows = areaRows.filter((r) => r.sail_date === today)

    // 直近30日の魚種別集計（catch_details から）
    const speciesMap = new Map<string, { total: number; count: number }>()
    for (const row of areaRows) {
      for (const d of row.catch_details) {
        if (!d.species_name || d.count === null) continue
        const cur = speciesMap.get(d.species_name) ?? { total: 0, count: 0 }
        speciesMap.set(d.species_name, { total: cur.total + d.count, count: cur.count + 1 })
      }
    }
    const topSpecies = [...speciesMap.entries()]
      .map(([name, v]) => ({ name, avgMax: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avgMax - a.avgMax)
      .slice(0, 3)

    return {
      areaName: name,
      slug,
      description,
      totalRecords: areaRows.length,
      todayRecords: todayRows.length,
      topSpecies,
      aiSummary: null,
    }
  })
}

async function getAISummariesForAreas(): Promise<AISummaryRecord[]> {
  const { data } = await supabase
    .from('ai_summaries')
    .select('summary_type, target_id, target_date, summary_text')
    .eq('summary_type', 'area')
    .order('target_date', { ascending: false })
    .limit(20)
  return (data ?? []) as AISummaryRecord[]
}

async function getLatestUpdatedAt(): Promise<string | null> {
  const { data } = await supabase
    .from('catches')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.created_at ?? null
}

// ── 下位ページで使う汎用データ取得関数（他ページが直接 import できるように export） ──
export async function fetchEnvDataMap(): Promise<EnvDataMap> {
  const { data } = await supabase
    .from('environment_data')
    .select('date, weather, wind_speed_ms, tide_type')
    .order('date', { ascending: false })
    .limit(30)
  if (!data) return {}
  return Object.fromEntries(
    data.map((row) => [row.date, {
      weather:       row.weather       ?? null,
      wind_speed_ms: row.wind_speed_ms ?? null,
      tide_type:     row.tide_type     ?? null,
    }])
  )
}

export const revalidate = 300

// ── Page ───────────────────────────────────────────────────────
export default async function Home() {
  const [areaStats, aiSummaries, latestAt] = await Promise.all([
    getAreaStats(),
    getAISummariesForAreas(),
    getLatestUpdatedAt(),
  ])

  // エリアAIサマリーをマージ
  const statsWithSummary = areaStats.map((s) => {
    const summary = aiSummaries.find((a) => {
      const areaId = AREA_CONFIG.findIndex((c) => c.name === s.areaName) + 1
      return a.target_id === areaId
    })
    return { ...s, aiSummary: summary?.summary_text ?? null }
  })

  const nowStr = new Date(latestAt ?? Date.now()).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <SiteHeader updatedAt={nowStr} />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--primary)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 24, paddingBottom: 28,
      }}>
        <div className="page-container">
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              FISHING REPORT — DAILY UPDATE
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(18px, 3.5vw, 26px)', fontWeight: 700, color: 'white',
            letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6,
          }}>
            関東圏の船釣り釣果まとめ
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 480, lineHeight: 1.6 }}>
            関東圏の複数船宿から釣果データを毎日自動収集。エリアを選んで最新の釣果情報を確認できます。
          </p>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main style={{ padding: '28px 0 80px' }}>
        <div className="page-container">

          {/* エリアカード 2×2グリッド */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}>
            {statsWithSummary.map((stat) => (
              <AreaCard key={stat.slug} stat={stat} />
            ))}
          </div>

          {/* 使い方ガイド */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.08em' }}>
              ご利用方法
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'エリアカードをタップして詳細な釣果一覧を確認',
                '魚種・釣り方・期間でフィルタリングして比較',
                '船長コメントや釣果グラフで傾向を分析',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(212,160,23,0.15)', color: 'var(--accent)',
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '22px 0' }}>
        <div className="page-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} 釣果情報.com — 関東圏 船釣り釣果情報
          </span>
          <span style={{ fontSize: 11, color: 'var(--border-strong)' }}>
            データは各船宿サイトより自動収集しています
          </span>
        </div>
      </footer>
    </div>
  )
}

// ── AreaCard コンポーネント ────────────────────────────────────
function AreaCard({ stat }: { stat: AreaStat }) {
  const { slug, areaName, description, totalRecords, todayRecords, topSpecies, aiSummary } = stat
  const hasData = totalRecords > 0

  return (
    <Link href={`/area/${slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {/* エリア名 + 説明 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {areaName}
            </h2>
            {todayRecords > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(212,160,23,0.15)', color: 'var(--accent)',
                border: '1px solid rgba(212,160,23,0.3)',
              }}>
                本日{todayRecords}件
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{description}</p>
        </div>

        {/* 区切り線 */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />

        {hasData ? (
          <>
            {/* 直近30日の注目魚種 */}
            {topSpecies.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em' }}>
                  直近30日の注目魚種
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {topSpecies.map((sp) => (
                    <span key={sp.name} style={{
                      fontSize: 12, padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'rgba(30,58,95,0.6)', color: '#93c5fd',
                      border: '1px solid rgba(147,197,253,0.15)',
                    }}>
                      {sp.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AIサマリー */}
            {aiSummary && (
              <div style={{
                background: '#0f1a2e',
                border: '1px solid #2d3748',
                borderRadius: 6,
                padding: '8px 10px',
                marginBottom: 14,
              }}>
                <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>✦ AIサマリー</p>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                  {aiSummary.length > 120 ? aiSummary.slice(0, 120) + '…' : aiSummary}
                </p>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            データ収集準備中
          </p>
        )}

        {/* 詳細リンク */}
        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--accent)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            釣果一覧を見る →
          </span>
        </div>
      </div>
    </Link>
  )
}
