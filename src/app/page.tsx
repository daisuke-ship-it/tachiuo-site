import Link from 'next/link'
import { Fish } from 'lucide-react'
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
type SpeciesStat = {
  name: string
  avgMax: number       // 直近7日の平均釣果
  shipCount: number    // 直近7日の出船数
  trend: 'up' | 'flat' | 'down'
}

type AreaStat = {
  areaName: string
  slug: AreaSlug
  description: string
  weekRecords: number  // 直近7日の件数
  topSpecies: SpeciesStat[]
  aiSummary: string | null
  aiSummaryDate: string | null
}

// ── データ取得 ─────────────────────────────────────────────────
type RawRow = {
  sail_date: string | null
  count_max: number | null
  shipyards: { areas: { name: string } | null } | null
  catch_details: { species_name: string | null; count: number | null }[]
}

function jstDateStr(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

async function getAreaStats(): Promise<AreaStat[]> {
  const now = new Date()
  const cutoff14 = new Date(now); cutoff14.setDate(now.getDate() - 14)
  const cutoff7  = new Date(now); cutoff7.setDate(now.getDate() - 7)

  const cutoff14Str = jstDateStr(cutoff14)
  const cutoff7Str  = jstDateStr(cutoff7)

  const { data } = await supabase
    .from('catches')
    .select(`
      sail_date,
      count_max,
      shipyards ( areas ( name ) ),
      catch_details ( species_name, count )
    `)
    .gte('sail_date', cutoff14Str)
    .order('sail_date', { ascending: false })

  const rows = (data ?? []) as unknown as RawRow[]

  return AREA_CONFIG.map(({ slug, name, description }) => {
    const areaRows = rows.filter((r) => r.shipyards?.areas?.name === name)
    const recentRows = areaRows.filter((r) => r.sail_date && r.sail_date >= cutoff7Str)
    const prevRows   = areaRows.filter((r) => r.sail_date && r.sail_date < cutoff7Str)

    // 集計ヘルパー: species_name → { total, count }
    function buildMap(rs: RawRow[]) {
      const m = new Map<string, { total: number; count: number; ships: Set<string> }>()
      rs.forEach((row, i) => {
        for (const d of row.catch_details) {
          if (!d.species_name || d.count === null) continue
          const cur = m.get(d.species_name) ?? { total: 0, count: 0, ships: new Set() }
          cur.total += d.count
          cur.count += 1
          cur.ships.add(String(i)) // row index as proxy for distinct records
          m.set(d.species_name, cur)
        }
      })
      return m
    }

    const recentMap = buildMap(recentRows)
    const prevMap   = buildMap(prevRows)

    const topSpecies: SpeciesStat[] = [...recentMap.entries()]
      .map(([speciesName, v]) => {
        const recentAvg = v.total / v.count
        const prev = prevMap.get(speciesName)
        const prevAvg = prev ? prev.total / prev.count : 0
        let trend: 'up' | 'flat' | 'down' = 'flat'
        if (prevAvg === 0) {
          trend = recentAvg > 0 ? 'up' : 'flat'
        } else {
          const ratio = recentAvg / prevAvg
          if (ratio >= 1.1) trend = 'up'
          else if (ratio <= 0.9) trend = 'down'
        }
        return {
          name: speciesName,
          avgMax: Math.round(recentAvg),
          shipCount: v.ships.size,
          trend,
        }
      })
      .sort((a, b) => b.avgMax - a.avgMax)

    return {
      areaName: name,
      slug,
      description,
      weekRecords: recentRows.length,
      topSpecies,
      aiSummary: null,
      aiSummaryDate: null,
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

  const statsWithSummary = areaStats.map((s) => {
    const summary = aiSummaries.find((a) => {
      const areaId = AREA_CONFIG.findIndex((c) => c.name === s.areaName) + 1
      return a.target_id === areaId
    })
    return { ...s, aiSummary: summary?.summary_text ?? null, aiSummaryDate: summary?.target_date ?? null }
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
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 300 }}>
        {/* 背景画像 */}
        <img
          src="https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=1920&q=80"
          alt="海釣り"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.5)',
          }}
        />
        {/* 下部フェード */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, var(--bg-deep-sea) 100%)',
        }} />
        {/* コンテンツ */}
        <div style={{ position: 'relative', paddingTop: 48, paddingBottom: 56 }}>
          <div className="page-container">
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
              color: '#00d4c8', textTransform: 'uppercase', marginBottom: 12,
            }}>
              FISHING REPORT — DAILY UPDATE
            </p>
            <h1 style={{
              fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 700, color: '#f0f4ff',
              fontFamily: 'var(--font-serif)', letterSpacing: '0.05em',
              lineHeight: 1.2, marginBottom: 12,
            }}>
              関東圏の船釣り釣果まとめ
            </h1>
            <p style={{
              fontSize: 16, fontWeight: 500, color: '#00d4c8',
              marginBottom: 10, letterSpacing: '0.04em',
            }}>
              今日どこに行けば釣れる？
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 480, lineHeight: 1.65 }}>
              関東圏の複数船宿から釣果データを毎日自動収集。エリアを選んで最新の釣果情報を確認できます。
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
              最終更新：{nowStr}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main style={{ padding: '32px 0 100px' }}>
        <div className="page-container">

          {/* エリアカード 2×2グリッド */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
            marginBottom: 40,
          }}>
            {statsWithSummary.map((stat) => (
              <AreaCard key={stat.slug} stat={stat} />
            ))}
          </div>

          {/* 使い方ガイド */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.20)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 20,
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
                    background: 'rgba(0,212,200,0.15)', color: '#00d4c8',
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
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '32px 0' }}>
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

// ── トレンドインジケーター ────────────────────────────────────
const TREND = {
  up:   { icon: '↑', color: '#22c55e' },
  flat: { icon: '→', color: '#6b7280' },
  down: { icon: '↓', color: '#ef4444' },
}

// ── AreaCard コンポーネント ────────────────────────────────────
function AreaCard({ stat }: { stat: AreaStat }) {
  const { slug, areaName, description, weekRecords, topSpecies, aiSummary, aiSummaryDate } = stat
  const hasData = weekRecords > 0 || topSpecies.length > 0

  return (
    <Link href={`/area/${slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.20)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
        padding: '24px',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>

        {/* カードヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{
            fontSize: 22, fontWeight: 700, color: '#f0f4ff', margin: 0,
            fontFamily: 'var(--font-serif)', letterSpacing: '0.04em',
          }}>
            {areaName}
          </h2>
          {weekRecords > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 9px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(0,212,200,0.12)', color: '#00d4c8',
              border: '1px solid rgba(0,212,200,0.35)',
              whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8,
            }}>
              今週{weekRecords}件
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{description}</p>

        {/* 区切り線 */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />

        {hasData ? (
          <>
            {/* 今週の注目魚種 */}
            {topSpecies.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: '#8899bb', marginBottom: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  今週の注目魚種
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topSpecies.map((sp) => {
                    const t = TREND[sp.trend]
                    return (
                      <div key={sp.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Lucide Fish icon */}
                        <Fish size={14} strokeWidth={1.5} style={{ color: '#00d4c8', flexShrink: 0 }} />
                        {/* 魚種名 */}
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>
                          {sp.name}
                        </span>
                        {/* トレンド */}
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.color, minWidth: 14, textAlign: 'center' }}>
                          {t.icon}
                        </span>
                        {/* 平均釣果 */}
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {sp.avgMax}
                        </span>
                        {/* 出船数 */}
                        <span style={{ fontSize: 10, color: '#8899bb', minWidth: 36 }}>
                          {sp.shipCount}船
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AIサマリー（全文） */}
            {aiSummary && (
              <div style={{
                background: 'rgba(0,212,200,0.04)',
                border: '1px solid rgba(0,212,200,0.15)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 14,
              }}>
                <p style={{ fontSize: 10, color: '#00d4c8', marginBottom: 4, fontWeight: 600, opacity: 0.8 }}>
                  ✦ {aiSummaryDate ? `${aiSummaryDate.replace(/-/g, '/')}のAIサマリー` : 'AIサマリー'}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
                  {aiSummary}
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
            fontSize: 13, fontWeight: 600, color: '#00d4c8',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            釣果一覧を見る →
          </span>
        </div>
      </div>
    </Link>
  )
}
