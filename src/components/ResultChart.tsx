import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { ChartSpec } from '../lib/chartShape';

const SERIES_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6'];

const axisProps = {
  stroke: '#475569',
  tick: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
};

const tooltipStyle = {
  contentStyle: {
    background: '#0b0d12',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#cbd5e1' },
  cursor: { fill: 'rgba(129,140,248,0.08)' },
};

/** Renders a Recharts bar/line chart from a ChartSpec. Lazy-loaded by LiveDiffTable. */
export default function ResultChart({ spec }: { spec: ChartSpec }) {
  const { type, labelKey, valueKeys, data } = spec;

  return (
    <div className="h-full w-full p-3 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey={labelKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />}
            {valueKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey={labelKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />}
            {valueKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
