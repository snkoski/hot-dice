interface TurnInfoProps {
  roundNumber: number;
  rollNumber: number;
}

export function TurnInfo({ roundNumber, rollNumber }: TurnInfoProps) {
  return (
    <div id="turnInfo" className="turn-info">
      <h4>Current Turn</h4>
      <div id="turnDetails" className="turn-details">
        <div className="turn-details-grid">
          <div>
            <div className="turn-detail-label">Round</div>
            <div className="turn-detail-value">{roundNumber}</div>
          </div>
          <div>
            <div className="turn-detail-label">Roll Number</div>
            <div className="turn-detail-value">{rollNumber}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
