'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'ホーム', icon: '🏠', href: '/',             match: (p: string) => p === '/' },
  { label: 'エリア', icon: '🗺',  href: '/area/tokyo',   match: (p: string) => p.startsWith('/area') },
  { label: '魚種',   icon: '🐟', href: '/fish/tachiuo',  match: (p: string) => p.startsWith('/fish') },
  { label: '船宿',   icon: '🚢', href: '/yado',          match: (p: string) => p.startsWith('/yado') },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const moreActive = pathname.startsWith('/analysis') || pathname.startsWith('/contact')

  return (
    // md:hidden = hidden on desktop (768px+), visible on mobile
    <div className="md:hidden">

      {/* Overlay to close "その他" menu */}
      {moreOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* "その他" popup menu */}
      {moreOpen && (
        <div style={{
          position: 'fixed',
          bottom: 60,
          right: 8,
          zIndex: 210,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          minWidth: 160,
          boxShadow: 'var(--shadow-lg)',
        }}>
          <Link
            href="/analysis"
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'block',
              padding: '13px 20px',
              fontSize: 14,
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            分析
          </Link>
          <Link
            href="/contact"
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'block',
              padding: '13px 20px',
              fontSize: 14,
              color: 'var(--text-main)',
            }}
          >
            お問い合わせ
          </Link>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 200,
        height: 56,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--primary)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        {NAV_ITEMS.map(item => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.45)',
                borderTop: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1 }}>{item.label}</span>
            </Link>
          )
        })}

        {/* その他 */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            borderTop: (moreActive || moreOpen) ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
            color: (moreActive || moreOpen) ? 'var(--accent)' : 'rgba(255,255,255,0.45)',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
          <span style={{ fontSize: 10, fontWeight: (moreActive || moreOpen) ? 700 : 400, lineHeight: 1 }}>その他</span>
        </button>
      </nav>

    </div>
  )
}
