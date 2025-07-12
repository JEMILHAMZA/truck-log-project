import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';



// --- START: CUSTOM ICON LOGIC ---


const createColorIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};" class="marker-pin"></div><i class="material-icons"></i>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
  });
};

const icons = {
  start: createColorIcon('#009688'),      // Green for Start
  pickup: createColorIcon('#2196F3'),     // Blue for Pickup/Dropoff
  dropoff: createColorIcon('#2196F3'),
  break: createColorIcon('#FFC107'),      // Yellow for Break
  fuel: createColorIcon('#9C27B0'),       // Purple for Fuel
  reset: createColorIcon('#f44336'),      // Red for Reset
};

const getStopIcon = (remark) => {
    const lowerRemark = remark.toLowerCase();
    if (lowerRemark.includes('start')) return icons.start;
    if (lowerRemark.includes('break')) return icons.break;
    if (lowerRemark.includes('fuel')) return icons.fuel;
    if (lowerRemark.includes('reset')) return icons.reset;
    if (lowerRemark.includes('pickup') || lowerRemark.includes('dropoff')) return icons.pickup;
    return icons.break; // Default stop icon
};

// --- END: CUSTOM ICON LOGIC ---

// Fix for default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


function MapView({ routeInfo }) {
  // OpenRouteService returns [lon, lat], Leaflet expects [lat, lon]
  const swapCoords = (coords) => coords.map(c => [c[1], c[0]]);

  const startPos = [routeInfo.start_coords[1], routeInfo.start_coords[0]];
  const leg1Polyline = swapCoords(routeInfo.leg1_geometry);
  const leg2Polyline = swapCoords(routeInfo.leg2_geometry);

  // The new stops array
  const stops = routeInfo.stops || [];

  return (
    // Add a CSS class for styling our custom icons
    <MapContainer className="map-view-container" center={startPos} zoom={7} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Main Location Markers */}
      <Marker position={[routeInfo.start_coords[1], routeInfo.start_coords[0]]} icon={icons.start}>
        <Popup>Start Location</Popup>
      </Marker>
      <Marker position={[routeInfo.pickup_coords[1], routeInfo.pickup_coords[0]]} icon={icons.pickup}>
        <Popup>Pickup Location</Popup>
      </Marker>
       <Marker position={[routeInfo.dropoff_coords[1], routeInfo.dropoff_coords[0]]} icon={icons.dropoff}>
        <Popup>Drop-off Location</Popup>
      </Marker>

    
      {stops.map((stop, index) => {
        
        const lowerRemark = stop.remark.toLowerCase();
        if (lowerRemark.includes('pickup') || lowerRemark.includes('dropoff')|| lowerRemark.includes('inspection')) {
            return null;
        }

        return (
          <Marker
            key={`stop-${index}`}
            position={[stop.coords[1], stop.coords[0]]} // Remember to swap lon/lat
            icon={getStopIcon(stop.remark)}
          >
            <Popup>{stop.remark}</Popup>
          </Marker>
        );
      })}
      {/* --- END: Render Stop Markers --- */}

      <Polyline positions={leg1Polyline} color="blue" />
      <Polyline positions={leg2Polyline} color="red" />
    </MapContainer>
  );
}

export default MapView;