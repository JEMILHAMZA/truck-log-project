import React, { useState } from 'react';
import './TripForm.css';

function TripForm({ onPlanTrip, loading }) {
  const [formData, setFormData] = useState({
    startLocation: 'Washington, D.C.',
    pickupLocation: 'Richmond, VA',
    dropoffLocation: 'Newark, NJ',
    cycleUsed: '10',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPlanTrip(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="trip-form">
      <div className="form-group">
        <label htmlFor="startLocation">Current Location</label>
        <input type="text" id="startLocation" name="startLocation" value={formData.startLocation} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="pickupLocation">Pickup Location</label>
        <input type="text" id="pickupLocation" name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="dropoffLocation">Dropoff Location</label>
        <input type="text" id="dropoffLocation" name="dropoffLocation" value={formData.dropoffLocation} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="cycleUsed">Current Cycle Used (70hr / 8day)</label>
        <input type="number" id="cycleUsed" name="cycleUsed" value={formData.cycleUsed} onChange={handleChange} step="0.1" required />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Planning...' : 'Plan Trip'}
      </button>
    </form>
  );
}

export default TripForm;