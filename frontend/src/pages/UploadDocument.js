import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, uploadDocument } from '../api';
import './Form.css';

function UploadDocument() {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    clientId: '',
    year: '',
    documentType: 'ITR'
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data.clients);
    } catch (err) {
      setError('Failed to load clients');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('clientId', formData.clientId);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('documentType', formData.documentType);
      formDataToSend.append('document', file);

      await uploadDocument(formDataToSend);
      setSuccess('Document uploaded successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Upload Document</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Client</label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
            >
              <option value="">Choose a client</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.name} ({client.whatsappNumber})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Financial Year</label>
            <input
              type="text"
              placeholder="e.g., 2025-26"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Document Type</label>
            <select
              value={formData.documentType}
              onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
              required
            >
              <option value="ITR">ITR</option>
              <option value="GST">GST</option>
              <option value="AUDIT">AUDIT</option>
              <option value="TDS">TDS</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div className="form-group">
            <label>Upload PDF</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
            <small>Only PDF files (max 10MB)</small>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadDocument;
