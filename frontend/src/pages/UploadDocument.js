import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, uploadDocument } from '../api';
import './Form.css';

function UploadDocument() {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    clientId: '',
    year: '',
    documentType: 'ITR',
    period: 'YEARLY', // MONTHLY, QUARTERLY, YEARLY
    month: '',
    quarter: ''
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

  const handleDocumentTypeChange = (type) => {
    setFormData({
      ...formData,
      documentType: type,
      period: (type === 'GST' || type === 'TDS') ? 'MONTHLY' : 'YEARLY',
      month: '',
      quarter: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please select a file');
      return;
    }

    // Validate period selection
    if ((formData.documentType === 'GST' || formData.documentType === 'TDS')) {
      if (formData.period === 'MONTHLY' && !formData.month) {
        setError('Please select a month');
        return;
      }
      if (formData.period === 'QUARTERLY' && !formData.quarter) {
        setError('Please select a quarter');
        return;
      }
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('clientId', formData.clientId);
      formDataToSend.append('year', formData.year);
      
      // Build document type with period
      let docType = formData.documentType;
      if (formData.documentType === 'GST' || formData.documentType === 'TDS') {
        if (formData.period === 'MONTHLY') {
          docType = `${formData.documentType}-${formData.month}`;
        } else if (formData.period === 'QUARTERLY') {
          docType = `${formData.documentType}-Q${formData.quarter}`;
        }
      }
      
      formDataToSend.append('documentType', docType);
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

  const months = [
    { value: 'JAN', label: 'January' },
    { value: 'FEB', label: 'February' },
    { value: 'MAR', label: 'March' },
    { value: 'APR', label: 'April' },
    { value: 'MAY', label: 'May' },
    { value: 'JUN', label: 'June' },
    { value: 'JUL', label: 'July' },
    { value: 'AUG', label: 'August' },
    { value: 'SEP', label: 'September' },
    { value: 'OCT', label: 'October' },
    { value: 'NOV', label: 'November' },
    { value: 'DEC', label: 'December' }
  ];

  const showPeriodOptions = formData.documentType === 'GST' || formData.documentType === 'TDS';

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
            <small>Format: YYYY-YY (e.g., 2025-26)</small>
          </div>

          <div className="form-group">
            <label>Document Type</label>
            <select
              value={formData.documentType}
              onChange={(e) => handleDocumentTypeChange(e.target.value)}
              required
            >
              <option value="ITR">ITR (Income Tax Return)</option>
              <option value="GST">GST</option>
              <option value="TDS">TDS</option>
              <option value="AUDIT">Audit Report</option>
              <option value="BALANCE SHEET">Balance Sheet</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {showPeriodOptions && (
            <>
              <div className="form-group">
                <label>Period Type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="period"
                      value="MONTHLY"
                      checked={formData.period === 'MONTHLY'}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value, month: '', quarter: '' })}
                    />
                    <span>Monthly</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="period"
                      value="QUARTERLY"
                      checked={formData.period === 'QUARTERLY'}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value, month: '', quarter: '' })}
                    />
                    <span>Quarterly</span>
                  </label>
                </div>
              </div>

              {formData.period === 'MONTHLY' && (
                <div className="form-group">
                  <label>Select Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    required
                  >
                    <option value="">Choose month</option>
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.period === 'QUARTERLY' && (
                <div className="form-group">
                  <label>Select Quarter</label>
                  <select
                    value={formData.quarter}
                    onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                    required
                  >
                    <option value="">Choose quarter</option>
                    <option value="1">Q1 (Apr-Jun)</option>
                    <option value="2">Q2 (Jul-Sep)</option>
                    <option value="3">Q3 (Oct-Dec)</option>
                    <option value="4">Q4 (Jan-Mar)</option>
                  </select>
                </div>
              )}
            </>
          )}

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
