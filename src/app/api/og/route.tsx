import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── 日本語フォント（Noto Sans JP）をGoogleからwoff形式で取得 ──────────
// Satoriはwoff/TTF/OTFをサポート（woff2は非対応）
// text=パラメーターで必要文字だけをサブセット化して軽量化
async function loadJapaneseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    // cssv1 APIにIE11 user-agentを使うとwoff形式が返る
    const css = await fetch(
      `https://fonts.googleapis.com/css?family=Noto+Sans+JP:700&text=${encodeURIComponent(text)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
        },
      }
    ).then(r => r.text())
    const url = css.match(/url\(([^)]+)\)/)?.[1]
    if (!url) return null
    return fetch(url).then(r => r.arrayBuffer())
  } catch (e) {
    console.error('Font load error:', e)
    return null
  }
}

// ── Supabase から釣果統計を取得 ────────────────────────────────────
type CatchStats = {
  avgCount: number | null
  maxCount: number | null
  sizeRange: string | null
  recordCount: number
}

async function fetchStats(area: string, fish: string, date: string): Promise<CatchStats> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [{ data: areaData }, { data: fishData }] = await Promise.all([
    supabase.from('areas').select('id').eq('name', area).maybeSingle(),
    supabase.from('fish_species').select('id').eq('name', fish).maybeSingle(),
  ])

  if (!areaData?.id || !fishData?.id) return { avgCount: null, maxCount: null, sizeRange: null, recordCount: 0 }

  const { data: shipyards } = await supabase
    .from('shipyards')
    .select('id')
    .eq('area_id', areaData.id)
    .eq('is_active', true)
  const shipyardIds = (shipyards ?? []).map(s => s.id)
  if (!shipyardIds.length) return { avgCount: null, maxCount: null, sizeRange: null, recordCount: 0 }

  // 指定日から最大7日遡って直近データを取得
  const d = new Date(date)
  const from = new Date(d.getTime() - 7 * 86400_000).toISOString().slice(0, 10)
  const { data: catches } = await supabase
    .from('catches')
    .select('count_min, count_max, size_min_cm, size_max_cm')
    .eq('fish_species_id', fishData.id)
    .in('shipyard_id', shipyardIds)
    .gte('sail_date', from)
    .lte('sail_date', date)
    .order('sail_date', { ascending: false })
    .limit(50)

  if (!catches?.length) return { avgCount: null, maxCount: null, sizeRange: null, recordCount: 0 }

  const counts = catches
    .map(c => c.count_max ?? c.count_min)
    .filter((v): v is number => v !== null)
  const sizeMins = catches.map(c => c.size_min_cm).filter((v): v is number => v !== null)
  const sizeMaxs = catches.map(c => c.size_max_cm).filter((v): v is number => v !== null)

  return {
    avgCount: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 10) / 10 : null,
    maxCount: counts.length ? Math.max(...counts) : null,
    sizeRange: sizeMins.length && sizeMaxs.length
      ? `${Math.min(...sizeMins)}〜${Math.max(...sizeMaxs)}cm`
      : null,
    recordCount: catches.length,
  }
}

// ── OGP 画像生成 ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const area = searchParams.get('area') ?? '東京湾'
  const fish = searchParams.get('fish') ?? ''
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  // フォント用文字列（実際に描画する文字を渡してサブセット化）
  const fontChars = `釣果情報.com×〜 ${area}${fish}${date.replace(/-/g, '/')}平均最高サイズ本件cm関東圏船釣り毎日自動収集0123456789年月日`

  const [fontData, stats] = await Promise.all([
    loadJapaneseFont(fontChars),
    fish ? fetchStats(area, fish, date) : Promise.resolve({ avgCount: null, maxCount: null, sizeRange: null, recordCount: 0 }),
  ])

  const displayDate = date.replace(/-/g, '/').replace(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, '$1年$2月$3日')
  const title = fish ? fish : '釣果情報'
  const hasStats = stats.maxCount !== null || stats.avgCount !== null

  const fonts = fontData
    ? [{ name: 'NotoSansJP', data: fontData, style: 'normal' as const, weight: 700 as const }]
    : []

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#0c1e35',
          fontFamily: fonts.length ? 'NotoSansJP, sans-serif' : 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 左上装飾グラデ */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '500px', height: '500px',
          background: 'radial-gradient(ellipse at 0% 0%, rgba(29,78,216,0.35) 0%, transparent 70%)',
          display: 'flex',
        }} />
        {/* 右下装飾グラデ */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '400px', height: '400px',
          background: 'radial-gradient(ellipse at 100% 100%, rgba(14,116,144,0.2) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* ── Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '36px 56px 0',
        }}>
          {/* サイト名 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#1d4ed8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>
              🎣
            </div>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              釣果情報.com
            </span>
          </div>
          {/* 日付 */}
          <span style={{ fontSize: '18px', color: '#64748b' }}>
            {displayDate}
          </span>
        </div>

        {/* ── メインコンテンツ ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 56px',
          gap: '32px',
        }}>
          {/* エリア × 魚種 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{
              fontSize: '28px', fontWeight: 700,
              color: '#93c5fd',
              background: 'rgba(29,78,216,0.2)',
              padding: '6px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(147,197,253,0.3)',
            }}>
              {area}
            </span>
            <span style={{ fontSize: '32px', color: '#d4a017', fontWeight: 700 }}>×</span>
            <span style={{
              fontSize: '64px', fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              {title}
            </span>
          </div>

          {/* 釣果ステータス */}
          {hasStats ? (
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* 平均釣果 */}
              {stats.avgCount !== null && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '20px 32px',
                  minWidth: '200px',
                }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700 }}>平均釣果</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '48px', fontWeight: 700, color: '#93c5fd', lineHeight: 1 }}>
                      {stats.avgCount}
                    </span>
                    <span style={{ fontSize: '18px', color: '#64748b' }}>本</span>
                  </div>
                </div>
              )}
              {/* 最高釣果 */}
              {stats.maxCount !== null && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '20px 32px',
                  minWidth: '200px',
                }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700 }}>最高釣果</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '48px', fontWeight: 700, color: '#d4a017', lineHeight: 1 }}>
                      {stats.maxCount}
                    </span>
                    <span style={{ fontSize: '18px', color: '#64748b' }}>本</span>
                  </div>
                </div>
              )}
              {/* サイズ */}
              {stats.sizeRange && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '20px 32px',
                  minWidth: '220px',
                }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700 }}>サイズ</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>
                      {stats.sizeRange}
                    </span>
                  </div>
                </div>
              )}
              {/* 出船数 */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '20px 32px',
                minWidth: '160px',
              }}>
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700 }}>船宿数</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 700, color: '#86efac', lineHeight: 1 }}>
                    {stats.recordCount}
                  </span>
                  <span style={{ fontSize: '18px', color: '#64748b' }}>件</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '24px 36px',
            }}>
              <span style={{ fontSize: '20px', color: '#64748b' }}>
                最新釣果データを毎日自動収集・集計
              </span>
            </div>
          )}
        </div>

        {/* ── フッター ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 56px 36px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '20px',
        }}>
          <span style={{ fontSize: '16px', color: '#475569' }}>
            関東圏 船釣り釣果情報 | 複数船宿から毎日自動収集
          </span>
          <span style={{ fontSize: '16px', color: '#1d4ed8', fontWeight: 700 }}>
            chokainfo.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  )
}
