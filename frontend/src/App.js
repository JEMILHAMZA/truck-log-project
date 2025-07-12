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
      const response = await axios.post(`/api/plan-trip/`, {
        start_location: formData.startLocation,
        pickup_location: formData.pickupLocation,
        dropoff_location: formData.dropoffLocation,
        cycle_used: formData.cycleUsed,
      });
      setTripData(response.data);
    }  catch (err) {
      // --- START: ENHANCED ERROR LOGGING ---

      console.error("API Request Failed:", err);

      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response Data:", err.response.data);
        console.error("Response Status:", err.response.status);
        console.error("Response Headers:", err.response.headers);
        
        // Set a more informative error message for the user
        const serverError = err.response.data?.error || `Request failed with status ${err.response.status}`;
        setError(serverError);

      } else if (err.request) {
        // The request was made but no response was received
        console.error("Request Data:", err.request);
        setError("Network error: The server did not respond. Please check your connection or the server status.");

      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error Message:', err.message);
        setError('An unexpected error occurred while setting up the request.');
      }
      
      // --- END: ENHANCED ERROR LOGGING ---

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
