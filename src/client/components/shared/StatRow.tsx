interface StatRowProps {
  label: string;
  value: string | number;
  valueStyle?: React.CSSProperties;
}

export function StatRow({ label, value, valueStyle }: StatRowProps) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={valueStyle}>{value}</span>
    </div>
  );
}
