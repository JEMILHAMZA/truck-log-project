import React from 'react';
import MapView from './MapView';
import DailyLogSheet from './DailyLogSheet';

function TripResult({ data }) {
  if (!data || !data.daily_logs) return null;

  return (
    <div className="trip-result">
      <h2>Trip Plan</h2>
      <MapView routeInfo={data.route_info} />
      
      <h2>Daily Log Sheets</h2>
      {data.daily_logs.map((log, index) => (
        <DailyLogSheet key={index} logData={log} />
      ))}
    </div>
  );
}

export default TripResult;