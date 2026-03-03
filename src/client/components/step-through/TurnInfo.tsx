import './stepThrough.css';

interface TurnInfoProps {
  roundNumber: number;
  rollNumber: number;
}

export function TurnInfo({ roundNumber, rollNumber }: TurnInfoProps) {
  return (
    <div className="turn-info">
      <h4>Current Turn</h4>
      <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Round</div>
          <div style={{ fontSize: '1.5em', fontWeight: 600 }}>{roundNumber}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Roll Number</div>
          <div style={{ fontSize: '1.5em', fontWeight: 600 }}>{rollNumber}</div>
        </div>
      </div>
    </div>
  );
}
