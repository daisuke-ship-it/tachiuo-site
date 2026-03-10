'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CatchRecord } from '@/lib/supabase'

type Props = {
  records: CatchRecord[]
}

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
        background: '#0d1526',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: 8,
        padding: '8px 14px',
      }}
    >
      <p style={{ color: '#8899aa', fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#c9a84c', fontWeight: 700, fontSize: 16 }}>
        {payload[0].value} <span style={{ fontSize: 11, fontWeight: 400 }}>件</span>
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
    const key = d.toISOString().split('T')[0]
    dateMap[key] = 0
  }

  records.forEach((r) => {
    if (!r.date) return
    const key = r.date.split('T')[0]
    if (key in dateMap) {
      dateMap[key]++
    }
  })

  const data = Object.entries(dateMap).map(([date, count]) => ({
    date: date.slice(5).replace('-', '/'),
    count,
  }))

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div
      style={{
        background: '#0d1526',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 12,
        padding: '20px 16px 12px',
      }}
    >
      <p style={{ color: '#8899aa', fontSize: 12, marginBottom: 12, letterSpacing: '0.05em' }}>
        直近30日 釣果推移
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            stroke="#334455"
            tick={{ fill: '#556677', fontSize: 10 }}
            interval={4}
            tickLine={false}
          />
          <YAxis
            stroke="#334455"
            tick={{ fill: '#556677', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[0, maxCount + 1]}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#c9a84c"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#c9a84c', stroke: '#e2c97a', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
