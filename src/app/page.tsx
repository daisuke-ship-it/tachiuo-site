import { supabase, CatchRecord } from '@/lib/supabase'
import CatchDashboard from '@/components/CatchDashboard'

// catches テーブルの JOIN レスポンス型（変換前の生データ）
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

  // catches（正規化テーブル）→ CatchRecord（フラット型）へ変換
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

export const revalidate = 3600

export default async function Home() {
  const records = await getCatchData()

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ── 本日のサマリー集計 ─────────────────────────────────────────
  const todayStr     = new Date().toISOString().split('T')[0]
  const todayRecords = records.filter((r) => r.date?.startsWith(todayStr))

  const catchValues = todayRecords
    .map((r) => r.count_max ?? r.count_min)
    .filter((v): v is number => v !== null && v > 0)
  const sizeMaxValues = todayRecords
    .map((r) => r.size_max_cm)
    .filter((v): v is number => v !== null)
  const sizeMinValues = todayRecords
    .map((r) => r.size_min_cm)
    .filter((v): v is number => v !== null)

  const avgCatch = catchValues.length > 0
    ? Math.round(catchValues.reduce((a, b) => a + b, 0) / catchValues.length)
    : null
  const maxCatch = catchValues.length > 0 ? Math.max(...catchValues) : null
  const maxSize  = sizeMaxValues.length > 0 ? Math.max(...sizeMaxValues) : null
  const minSize  = sizeMinValues.length > 0 ? Math.min(...sizeMinValues) : null

  const fmt = (v: number | null, unit: string) => (v !== null ? `${v}${unit}` : '—')

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

          {/* Last updated */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)', display: 'inline-block',
                boxShadow: '0 0 6px var(--accent)',
              }}
            />
            <span>更新: {today}</span>
          </div>
        </div>
      </header>

      {/* ── Hero (navy) ────────────────────────────────────────── */}
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

          {/* ── 本日の釣況サマリーカード ─────────────────────── */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginTop: 20,
            }}
          >
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
                本日の釣況サマリー
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{today}</span>
            </div>

            {/* Two-column layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1fr',
              }}
            >
              {/* Left: 環境情報 */}
              <div style={{ paddingRight: 20 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', marginBottom: 8 }}>
                  環境情報
                </p>
                {[
                  { label: '天気', value: '—' },
                  { label: '風速', value: '—' },
                  { label: '潮汐', value: '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ background: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />

              {/* Right: 釣果データ */}
              <div style={{ paddingLeft: 20 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', marginBottom: 8 }}>
                  本日の釣果データ（{todayRecords.length}件）
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                  {[
                    { label: '釣果平均', value: fmt(avgCatch, '尾') },
                    { label: '最多釣果', value: fmt(maxCatch, '尾') },
                    { label: '最大サイズ', value: fmt(maxSize, 'cm') },
                    { label: '最小サイズ', value: fmt(minSize, 'cm') },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{label}</p>
                      <p
                        style={{
                          fontSize: 20, fontWeight: 700, color: 'white',
                          letterSpacing: '-0.02em', lineHeight: 1,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
            <CatchDashboard records={records} />
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
