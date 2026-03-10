import { supabase, CatchRecord } from '@/lib/supabase'
import CatchDashboard from '@/components/CatchDashboard'

// ── 型定義 ────────────────────────────────────────────────────
type RawCatch = {
  id: number
  created_at: string
  sail_date: string | null
  count_min: number | null
  count_max: number | null
  size_min_cm: number | null
  size_max_cm: number | null
  source_url: string | null
  shipyards: { name: string; areas: { name: string } | null } | null
  fish_species: { name: string } | null
  fishing_methods: { name: string } | null
}

export type EnvData = {
  weather: string | null
  wind_speed_ms: number | null
  tide_type: string | null
}

// ── データ取得 ─────────────────────────────────────────────────
async function getCatchData(): Promise<CatchRecord[]> {
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
      shipyards ( name, areas ( name ) ),
      fish_species ( name ),
      fishing_methods ( name )
    `)
    .order('sail_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase fetch error:', error)
    return []
  }

  return ((data ?? []) as unknown as RawCatch[]).map((row) => ({
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
    fishing_method: row.fishing_methods?.name ?? null,
  }))
}

async function getEnvData(): Promise<EnvData | null> {
  const todayStr = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('environment_data')
    .select('weather, wind_speed_ms, tide_type')
    .eq('date', todayStr)
    .limit(1)
    .maybeSingle()
  return data
}

export const revalidate = 3600

export default async function Home() {
  const [records, envData] = await Promise.all([getCatchData(), getEnvData()])

  // 日付＋時刻（例: 2026年3月10日 15:32）
  const nowStr = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--primary)',
          boxShadow: '0 2px 12px rgba(15,39,71,0.25)',
        }}
      >
        <div
          className="page-container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
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
              <span
                style={{
                  display: 'block', fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1, marginTop: 1, letterSpacing: '0.04em',
                }}
              >
                東京湾 · 相模湾
              </span>
            </div>
          </div>

          {/* Last updated（日付＋時刻） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)', display: 'inline-block',
                boxShadow: '0 0 6px var(--accent)',
              }}
            />
            <span>更新: {nowStr}</span>
          </div>
        </div>
      </header>

      {/* ── Hero (navy) — タイトルのみ ─────────────────────────── */}
      <div
        style={{
          background: 'var(--primary)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 24,
          paddingBottom: 28,
        }}
      >
        <div className="page-container">
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
              FISHING REPORT — DAILY UPDATE
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(18px, 3.5vw, 26px)',
              fontWeight: 700, color: 'white',
              letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6,
            }}
          >
            東京湾・相模湾の船釣り釣果まとめ
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 480, lineHeight: 1.6 }}>
            複数船宿の釣果データを毎日収集・集計。タチウオ・アジ・シーバス・サワラの最新情報を確認できます。
          </p>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      <main style={{ padding: '24px 0 80px' }}>
        <div className="page-container">
          {records.length === 0 ? (
            <div
              style={{
                textAlign: 'center', padding: '80px 20px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 10 }}>🎣</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>現在、釣果データがありません</p>
            </div>
          ) : (
            <CatchDashboard records={records} envData={envData} />
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '22px 0' }}>
        <div
          className="page-container"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
        >
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
