// src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import TripForm from './components/TripForm';
import TripResult from './components/TripResult';
import './App.css';

function App() {
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlanTrip = async (formData) => {
    setLoading(true);
    setError('');
    setTripData(null);
    
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    try {
      const response = await axios.postt(`${API_URL}/api/plan-trip/`, {
        start_location: formData.startLocation,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        cycle_used: formData.cycleUsed,
      });
      setTripData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Truck Trip & Log Planner</h1>
        <p>Enter your trip details to generate a route and HOS-compliant daily logs.</p>
      </header>
      <main>
        <TripForm onPlanTrip={handlePlanTrip} loading={loading} />
        {loading && <div className="loader">Planning your trip...</div>}
        {error && <div className="error-message">Error: {error}</div>}
        {tripData && <TripResult data={tripData} />}
      </main>
    </div>
  );
}

export default App;
