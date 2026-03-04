import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addClient } from '../api';
import './Form.css';

function AddClient() {
  const [formData, setFormData] = useState({ name: '', whatsappNumber: '', consultantPhone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await addClient(formData);
      setSuccess('Client added successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Add New Client</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Client Name</label>
            <input
              type="text"
              placeholder="Enter client name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>WhatsApp Number</label>
            <input
              type="tel"
              placeholder="+919876543210"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              required
            />
            <small>Include country code (e.g., +91 for India)</small>
          </div>
          <div className="form-group">
            <label>Consultant Phone (Optional)</label>
            <input
              type="tel"
              placeholder="+919876543210"
              value={formData.consultantPhone}
              onChange={(e) => setFormData({ ...formData, consultantPhone: e.target.value })}
            />
            <small>Phone number clients can contact for queries</small>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddClient;
