import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { supabase, CatchRecord } from '@/lib/supabase'
import { fishContents } from '@/lib/fishContent'
import { EnvData, EnvDataMap, AISummaryRecord, AreaRecord } from '@/app/page'
import FishDashboard from '@/components/FishDashboard'

// ── 型定義 ────────────────────────────────────────────────────
type RawCatchDetail = {
  id: number
  species_name: string | null
  count: number | null
  unit: string | null
  size_text: string | null
}

type RawCatch = {
  id: number
  created_at: string
  sail_date: string | null
  count_min: number | null
  count_max: number | null
  size_min_cm: number | null
  size_max_cm: number | null
  source_url: string | null
  condition_text: string | null
  shipyards: { name: string; areas: { name: string } | null; ports: { name: string } | null } | null
  fish_species: { name: string } | null
  fishing_methods: { name: string; method_group: string | null } | null
  catch_details: RawCatchDetail[]
}

// ── データ取得 ─────────────────────────────────────────────────
async function getFishSpeciesId(fishName: string): Promise<number | null> {
  const { data } = await supabase
    .from('fish_species')
    .select('id')
    .eq('name', fishName)
    .maybeSingle()
  return data?.id ?? null
}

async function getCatchDataForFish(fishSpeciesId: number): Promise<CatchRecord[]> {
  const { data, error } = await supabase
    .from('catches')
    .select(`
      id,
      created_at,
      sail_date,
      count_min,
      count_max,
      size_min_cm,
      size_max_cm,
      source_url,
      condition_text,
      shipyards ( name, areas ( name ), ports ( name ) ),
      fish_species ( name ),
      fishing_methods ( name, method_group ),
      catch_details (*)
    `)
    .eq('fish_species_id', fishSpeciesId)
    .order('sail_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('Supabase fetch error:', error)
    return []
  }

  const rawRows = (data ?? []) as unknown as RawCatch[]

  const mapped: CatchRecord[] = rawRows.map((row) => ({
    id:             row.id,
    created_at:     row.created_at,
    date:           row.sail_date,
    fish_name:      row.fish_species?.name ?? null,
    size_min_cm:    row.size_min_cm,
    size_max_cm:    row.size_max_cm,
    count_min:      row.count_min,
    count_max:      row.count_max,
    source_url:     row.source_url,
    shipyard_name:  row.shipyards?.name ?? null,
    shipyard_area:  row.shipyards?.areas?.name ?? null,
    port_name:      row.shipyards?.ports?.name ?? null,
    fishing_method: row.fishing_methods?.name ?? null,
    method_group:   row.fishing_methods?.method_group ?? null,
    condition_text: row.condition_text ?? null,
    catch_details:  (row.catch_details ?? []).map((d) => ({
      id:           d.id,
      species_name: d.species_name ?? null,
      count:        d.count ?? null,
      unit:         d.unit ?? null,
      size_text:    d.size_text ?? null,
    })),
  }))

  // フロント側デデュープ
  const seen = new Set<string>()
  return mapped.filter((r) => {
    const key = [r.shipyard_name ?? '', r.date ?? '', r.count_min ?? '', r.count_max ?? ''].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function getEnvDataMap(): Promise<EnvDataMap> {
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

async function getAISummaries(fishId: number): Promise<AISummaryRecord[]> {
  const { data } = await supabase
    .from('ai_summaries')
    .select('summary_type, target_id, target_date, summary_text')
    .eq('summary_type', 'fish_species')
    .eq('target_id', fishId)
    .order('target_date', { ascending: false })
    .limit(30)
  return (data ?? []) as AISummaryRecord[]
}

async function getAreas(): Promise<AreaRecord[]> {
  const { data } = await supabase
    .from('areas')
    .select('id, name')
    .order('id')
  return (data ?? []) as AreaRecord[]
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

// ── Static params / Metadata ───────────────────────────────────
export async function generateStaticParams() {
  return Object.keys(fishContents).map((slug) => ({ slug }))
}

type PageParams = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params
  const content = fishContents[slug]
  if (!content) return {}
  return {
    title: content.metaTitle,
    description: content.metaDescription,
  }
}

export const revalidate = 3600

// ── Page ───────────────────────────────────────────────────────
export default async function FishPage({ params }: { params: PageParams }) {
  const { slug } = await params
  const content = fishContents[slug]
  if (!content) notFound()

  const fishId = await getFishSpeciesId(content.name)
  if (!fishId) notFound()

  const [records, envData, aiSummaries, areas, latestAt] = await Promise.all([
    getCatchDataForFish(fishId),
    getEnvDataMap(),
    getAISummaries(fishId),
    getAreas(),
    getLatestUpdatedAt(),
  ])

  const nowStr = new Date(latestAt ?? Date.now()).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--primary)',
        boxShadow: '0 2px 12px rgba(15,39,71,0.25)',
      }}>
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 10 L10 3 L10 17 Z" fill="white" opacity="0.85" />
                <ellipse cx="19" cy="10" rx="11" ry="7" fill="white" opacity="0.92" />
                <path d="M14 3 Q19 1 24 4 L22 7 Q19 5 14 7 Z" fill="white" opacity="0.5" />
                <circle cx="27" cy="9" r="1.5" fill="var(--accent)" />
                <circle cx="27.5" cy="8.5" r="0.4" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 19, fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
                釣果情報<span style={{ color: 'var(--accent)' }}>.com</span>
              </span>
              <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1, marginTop: 1, letterSpacing: '0.04em' }}>
                東京湾 · 相模湾
              </span>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 6px var(--accent)' }} />
            <span>更新: {nowStr}</span>
          </div>
        </div>
      </header>

      {/* ── Hero + 魚種タブ ──────────────────────────────── */}
      <div style={{ background: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, paddingBottom: 24 }}>
        <div className="page-container">

          {/* パンくずナビ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.55)' }}>トップ</Link>
            <span>›</span>
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>{content.name}釣果情報</span>
          </div>

          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              FISHING REPORT — DAILY UPDATE
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6 }}>
            東京湾 {content.name}釣果まとめ
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 480, lineHeight: 1.6 }}>
            {content.description}
          </p>

          {/* 魚種切り替えタブ */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
            {Object.values(fishContents).map((fc) => {
              const isActive = fc.slug === slug
              return (
                <Link
                  key={fc.slug}
                  href={`/fish/${fc.slug}`}
                  style={{
                    padding: '5px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 13, fontWeight: isActive ? 700 : 400,
                    border: isActive ? '1.5px solid #d4a017' : '1px solid rgba(255,255,255,0.2)',
                    background: isActive ? 'rgba(212,160,23,0.15)' : 'transparent',
                    color: isActive ? '#d4a017' : 'rgba(255,255,255,0.6)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {fc.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────── */}
      <main style={{ padding: '24px 0 80px' }}>
        <div className="page-container">
          <FishDashboard
            records={records}
            envData={envData}
            aiSummaries={aiSummaries}
            areas={areas}
            fishId={fishId}
            content={content}
          />
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '22px 0' }}>
        <div className="page-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} 釣果情報.com — 東京湾・相模湾 船釣り釣果情報
          </span>
          <span style={{ fontSize: 11, color: 'var(--border-strong)' }}>
            データは各船宿サイトより自動収集しています
          </span>
        </div>
      </footer>
    </div>
  )
}
