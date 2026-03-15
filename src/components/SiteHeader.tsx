'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const AREAS = [
  { label: '東京湾', href: '/area/tokyo' },
  { label: '相模湾', href: '/area/sagami' },
  { label: '外房',   href: '/area/sotobo' },
  { label: '南房',   href: '/area/minamibo' },
]

const FISH = [
  { label: 'タチウオ', href: '/fish/tachiuo' },
  { label: 'アジ',     href: '/fish/aji' },
  { label: 'シーバス', href: '/fish/seabass' },
  { label: 'サワラ',   href: '/fish/sawara' },
  { label: 'トラフグ', href: '/fish/torafugu' },
  { label: 'マダイ',   href: '/fish/madai' },
  { label: 'ヒラメ',   href: '/fish/hirame' },
  { label: 'シロギス', href: '/fish/shirogisu' },
]

type Props = { updatedAt?: string; subtitle?: string }

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        color: active ? 'white' : 'rgba(255,255,255,0.6)',
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  )
}

function DropdownNav({
  label, active, items, open, onOpen, onClose,
}: {
  label: string
  active: boolean
  items: { label: string; href: string }[]
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <div style={{ position: 'relative' }} onMouseEnter={onOpen} onMouseLeave={onClose}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        color: active ? 'white' : 'rgba(255,255,255,0.6)',
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        cursor: 'default',
        whiteSpace: 'nowrap',
      }}>
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          minWidth: 110,
          boxShadow: 'var(--shadow-md)',
          zIndex: 200,
        }}>
          {items.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{
                display: 'block',
                padding: '9px 16px',
                fontSize: 13,
                color: 'var(--text-main)',
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SiteHeader({ updatedAt, subtitle = '関東圏' }: Props) {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState<'area' | 'fish' | null>(null)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--primary)',
      boxShadow: '0 2px 12px rgba(15,39,71,0.25)',
    }}>
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', height: 58, gap: 16 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 32 20" fill="none">
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
              {subtitle}
            </span>
          </div>
        </Link>

        {/* PC Nav: hidden on mobile, flex on md+ */}
        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2 }}>
          <NavLink href="/" active={pathname === '/'}>ホーム</NavLink>
          <DropdownNav
            label="エリア"
            active={pathname.startsWith('/area')}
            items={AREAS}
            open={openMenu === 'area'}
            onOpen={() => setOpenMenu('area')}
            onClose={() => setOpenMenu(null)}
          />
          <DropdownNav
            label="魚種"
            active={pathname.startsWith('/fish')}
            items={FISH}
            open={openMenu === 'fish'}
            onOpen={() => setOpenMenu('fish')}
            onClose={() => setOpenMenu(null)}
          />
          <NavLink href="/yado" active={pathname.startsWith('/yado')}>船宿</NavLink>
          <NavLink href="/analysis" active={pathname.startsWith('/analysis')}>分析</NavLink>
        </nav>

        {/* Updated at: auto margin pushes it to the right */}
        {updatedAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 'auto', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 6px var(--accent)' }} />
            <span>更新: {updatedAt}</span>
          </div>
        )}

      </div>
    </header>
  )
}
