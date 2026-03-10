import { supabase, CatchRecord } from '@/lib/supabase'
import CatchDashboard from '@/components/CatchDashboard'

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

export const revalidate = 3600

export default async function Home() {
  const records = await getCatchData()

  const uniqueShipyards = new Set(records.map((r) => r.shipyard_name)).size
  const fishTypes = new Set(records.filter((r) => r.fish_name).map((r) => r.fish_name)).size
  const latestDate = records[0]?.date
    ? new Date(records[0].date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    : '—'

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const stats = [
    { label: '総釣果記録', value: records.length.toLocaleString(), unit: '件' },
    { label: '掲載船宿', value: uniqueShipyards.toString(), unit: '軒' },
    { label: '対象魚種', value: fishTypes.toString(), unit: '種' },
    { label: '最新釣行', value: latestDate, unit: '' },
  ]

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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 58,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {/* Fish icon */}
              <svg width="20" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 10 L10 3 L10 17 Z" fill="white" opacity="0.85" />
                <ellipse cx="19" cy="10" rx="11" ry="7" fill="white" opacity="0.92" />
                <path d="M14 3 Q19 1 24 4 L22 7 Q19 5 14 7 Z" fill="white" opacity="0.5" />
                <circle cx="27" cy="9" r="1.5" fill="var(--accent)" />
                <circle cx="27.5" cy="8.5" r="0.4" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <div>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '-0.01em',
                }}
              >
                釣果<span style={{ color: 'var(--accent)' }}>.com</span>
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  lineHeight: 1,
                  marginTop: 1,
                  letterSpacing: '0.04em',
                }}
              >
                東京湾 · 相模湾
              </span>
            </div>
          </div>

          {/* Last updated */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'inline-block',
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
          paddingTop: 28,
          paddingBottom: 36,
        }}
      >
        <div className="page-container">
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--accent)',
                textTransform: 'uppercase',
              }}
            >
              FISHING REPORT — DAILY UPDATE
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              marginBottom: 6,
            }}
          >
            東京湾・相模湾の船釣り釣果まとめ
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            複数船宿の釣果データを毎日収集・集計。タチウオ・アジ・シーバス・サワラの最新情報を確認できます。
          </p>

          {/* Stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 10,
              marginTop: 24,
            }}
          >
            {stats.map(({ label, value, unit }) => (
              <div
                key={label}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.04em',
                    marginBottom: 6,
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {value}
                  {unit && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'rgba(255,255,255,0.45)',
                        marginLeft: 3,
                      }}
                    >
                      {unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      <main style={{ padding: '28px 0 80px' }}>
        <div className="page-container">
          {records.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 10 }}>🎣</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                現在、釣果データがありません
              </p>
            </div>
          ) : (
            <CatchDashboard records={records} />
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '22px 0',
        }}
      >
        <div
          className="page-container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} 釣果.com — 東京湾・相模湾 船釣り釣果情報
          </span>
          <span style={{ fontSize: 11, color: 'var(--border-strong)' }}>
            データは各船宿サイトより自動収集しています
          </span>
        </div>
      </footer>
    </div>
  )
}
