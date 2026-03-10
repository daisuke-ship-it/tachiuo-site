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

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const uniqueShipyards = new Set(records.map((r) => r.shipyard_name)).size
  const latestDate = records[0]?.date
    ? new Date(records[0].date).toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
      })
    : '—'

  const fishTypes = new Set(records.filter((r) => r.fish_name).map((r) => r.fish_name)).size

  return (
    <div style={{ minHeight: '100vh', background: '#080d1a' }}>
      {/* ヘッダー */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(8,13,26,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* 魚SVGアイコン */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 尾びれ */}
                <path d="M4 10 L10 3 L10 17 Z" fill="#c9a84c" opacity="0.7"/>
                {/* 胴体 */}
                <ellipse cx="19" cy="10" rx="11" ry="7" fill="#c9a84c" opacity="0.85"/>
                {/* 背びれ */}
                <path d="M14 3 Q19 1 24 4 L22 7 Q19 5 14 7 Z" fill="#e2c97a" opacity="0.6"/>
                {/* 目 */}
                <circle cx="27" cy="9" r="1.5" fill="#080d1a"/>
                <circle cx="27.5" cy="8.5" r="0.4" fill="rgba(255,255,255,0.6)"/>
              </svg>
            </div>
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#e8dcc8',
                  letterSpacing: '0.04em',
                  margin: 0,
                }}
              >
                釣果<span style={{ color: '#c9a84c' }}>.com</span>
              </h1>
              <p style={{ fontSize: 11, color: '#556677', margin: '2px 0 0', letterSpacing: '0.05em' }}>
                東京湾 ・ 相模湾
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#445566', marginBottom: 2 }}>最終更新</p>
            <p style={{ fontSize: 12, color: '#8899aa' }}>{today}</p>
          </div>
        </div>

        {/* 金色グラデーション線 */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4) 30%, rgba(201,168,76,0.4) 70%, transparent)',
          }}
        />
      </header>

      {/* メイン */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
        {/* タイトルセクション */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
            <span style={{ fontSize: 11, color: '#c9a84c', letterSpacing: '0.2em' }}>
              FISHING REPORT
            </span>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
          </div>
          <h2
            style={{
              fontSize: 13,
              color: '#445566',
              letterSpacing: '0.15em',
              fontWeight: 400,
            }}
          >
            東京湾・相模湾エリア 船釣り釣果まとめ
          </h2>
        </div>

        {/* 統計カード */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 32,
          }}
        >
          {[
            { label: '総釣果記録', value: records.length, unit: '件' },
            { label: '船宿数', value: uniqueShipyards, unit: '軒' },
            { label: '魚種数', value: fishTypes, unit: '種' },
            { label: '最新釣行', value: latestDate, unit: '' },
          ].map(({ label, value, unit }) => (
            <div
              key={label}
              style={{
                background: 'linear-gradient(135deg, rgba(13,21,38,0.9), rgba(26,42,80,0.4))',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 12,
                padding: '16px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* 装飾コーナー */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, transparent 50%, rgba(201,168,76,0.08))',
                }}
              />
              <p
                style={{
                  fontSize: 10,
                  color: '#556677',
                  letterSpacing: '0.1em',
                  marginBottom: 8,
                }}
              >
                {label}
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#e8dcc8', margin: 0 }}>
                {value}
                {unit && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#8899aa', marginLeft: 4 }}>
                    {unit}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* ダッシュボード（フィルター・グラフ・テーブル） */}
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#445566' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>〜</p>
            <p style={{ letterSpacing: '0.1em' }}>釣果データがありません</p>
          </div>
        ) : (
          <CatchDashboard records={records} />
        )}
      </main>

      {/* フッター */}
      <footer
        style={{
          marginTop: 60,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2) 30%, rgba(201,168,76,0.2) 70%, transparent)',
            marginBottom: 20,
          }}
        />
        <p style={{ fontSize: 11, color: '#334455', letterSpacing: '0.1em' }}>
          データは各船宿サイトより自動収集しています
        </p>
        <p style={{ fontSize: 10, color: '#263040', marginTop: 6 }}>
          © {new Date().getFullYear()} Tachiuo Fishing Report
        </p>
      </footer>
    </div>
  )
}
