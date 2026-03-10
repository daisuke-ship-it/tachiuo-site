'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CatchRecord } from '@/lib/supabase'

type Props = { records: CatchRecord[] }

type TooltipPayload = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--primary)',
        border: 'none',
        borderRadius: 8,
        padding: '8px 14px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 3 }}>{label}</p>
      <p style={{ color: 'white', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
        {payload[0].value}
        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3, color: 'rgba(255,255,255,0.6)' }}>件</span>
      </p>
    </div>
  )
}

export default function CatchChart({ records }: Props) {
  const today = new Date()
  const dateMap: Record<string, number> = {}

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dateMap[d.toISOString().split('T')[0]] = 0
  }

  records.forEach((r) => {
    if (!r.date) return
    const key = r.date.split('T')[0]
    if (key in dateMap) dateMap[key]++
  })

  const data = Object.entries(dateMap).map(([date, count]) => ({
    date: date.slice(5).replace('-', '/'),
    count,
  }))

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="oceanGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1A5276" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#1A5276" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={[0, maxCount + 1]}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 2' }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#1A5276"
          strokeWidth={2}
          fill="url(#oceanGradient)"
          dot={false}
          activeDot={{ r: 4, fill: 'var(--secondary)', stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
