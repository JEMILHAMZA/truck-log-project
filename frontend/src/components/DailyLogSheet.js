import React from 'react';
import './DailyLogSheet.css';

function DailyLogSheet({ logData }) {
  const statusConfig = {
    "Off Duty": { row: 1, color: '#3498db' },
    "Sleeper Berth": { row: 2, color: '#2ecc71' },
    "Driving": { row: 3, color: '#e74c3c' },
    "On Duty (Not Driving)": { row: 4, color: '#f1c40f' },
  };

  // The grid is 24 hours * 4 quarters = 96 units wide
  const totalUnits = 24 * 4;

  const renderEvents = () => {
    let lastX = 0;
    let lastY = 1; // Start at Off-Duty row
    const pathSegments = [];

    logData.events.forEach((event, index) => {
      const config = statusConfig[event.status];
      const startUnit = (event.start_minutes / 60) * 4;
      const durationUnit = (event.duration_minutes / 60) * 4;

      // Vertical line to change status
      if (config.row !== lastY) {
        pathSegments.push(
          <line 
            key={`v-${index}`}
            x1={`${(startUnit / totalUnits) * 100}%`} y1={`${((lastY - 0.5) / 4) * 100}%`}
            x2={`${(startUnit / totalUnits) * 100}%`} y2={`${((config.row - 0.5) / 4) * 100}%`}
            stroke="#0056b3" strokeWidth="2"
          />
        );
      }

      // Horizontal line for the event duration
      pathSegments.push(
        <line
          key={`h-${index}`}
          x1={`${(startUnit / totalUnits) * 100}%`} y1={`${((config.row - 0.5) / 4) * 100}%`}
          x2={`${((startUnit + durationUnit) / totalUnits) * 100}%`} y2={`${((config.row - 0.5) / 4) * 100}%`}
          stroke="#0056b3" strokeWidth="2"
        />
      );
      
      lastX = startUnit + durationUnit;
      lastY = config.row;
    });

    return pathSegments;
  };

  return (
    <div className="log-sheet-container">
        <div className="log-header">
            <span>DRIVER'S DAILY LOG</span>
            <span>DATE: {logData.date}</span>
        </div>
        <div className="log-grid-area">
            <div className="status-labels">
                <div>Off Duty</div>
                <div>Sleeper Berth</div>
                <div>Driving</div>
                <div>On Duty (Not Driving)</div>
            </div>
            <div className="grid">
                {[...Array(24)].map((_, i) => (
                    <div key={i} className="hour-marker"><span data-hour={i}>{i === 0 ? 'MIDNIGHT' : i === 12 ? 'NOON' : i}</span></div>
                ))}
                <svg width="100%" height="100%" className="event-overlay">
                    {renderEvents()}
                </svg>
            </div>
            <div className="total-hours">
                <div>{logData.totals['Off Duty'].toFixed(2)}</div>
                <div>{logData.totals['Sleeper Berth'].toFixed(2)}</div>
                <div>{logData.totals['Driving'].toFixed(2)}</div>
                <div>{logData.totals['On Duty (Not Driving)'].toFixed(2)}</div>
                <div className="total-sum">={Object.values(logData.totals).reduce((a,b) => a+b, 0).toFixed(2)}</div>
            </div>
        </div>
        <div className="remarks-section">
            <h4>REMARKS</h4>
            <ul>
                {logData.events.filter(e => e.remarks).map((e, i) => (
                    <li key={i}>
                        <span className="remark-time">{new Date(new Date(logData.date).setMinutes(e.start_minutes)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>: {e.remarks}
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
}

export default DailyLogSheet;