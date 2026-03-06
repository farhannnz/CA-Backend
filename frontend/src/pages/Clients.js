import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Clients.css';

function Clients() {
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
    fetchDocuments();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data.documents || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  };

  const getClientDocuments = (clientId) => {
    let docs = documents.filter(doc => doc.clientId?._id === clientId);
    if (filter !== 'ALL') {
      docs = docs.filter(doc => doc.documentType === filter);
    }
    return docs;
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(doc => doc._id !== docId));
      alert('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleClientClick = (clientId) => {
    navigate(`/client/${clientId}`);
  };

  // Filter clients by search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.whatsappNumber.includes(searchTerm)
  );

  const documentTypes = ['ALL', 'ITR', 'GST', 'TDS', 'BALANCE SHEET', 'AUDIT REPORT'];

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="clients-container">
      <div className="clients-header">
        <h1>📋 Client Management</h1>
        
        <div className="search-filter-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search clients by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            {documentTypes.map(type => (
              <button
                key={type}
                className={`filter-btn ${filter === type ? 'active' : ''}`}
                onClick={() => setFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="clients-grid">
        {filteredClients.map(client => {
          const clientDocs = getClientDocuments(client._id);
          return (
            <div 
              key={client._id} 
              className="client-card"
              onClick={() => handleClientClick(client._id)}
            >
              <div className="client-header">
                <h3>👤 {client.name}</h3>
                <span className="client-phone">📱 {client.whatsappNumber}</span>
              </div>
              
              <div className="client-stats">
                <span className="stat">
                  📄 {clientDocs.length} Documents
                </span>
              </div>

              <div className="client-preview">
                {clientDocs.length === 0 ? (
                  <p className="no-docs">No documents uploaded yet</p>
                ) : (
                  <div className="doc-types">
                    {[...new Set(clientDocs.map(d => d.documentType))].map(type => (
                      <span key={type} className="doc-badge">{type}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-footer">
                <span className="view-details">View Details →</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="empty-state">
          <h2>No clients found</h2>
          <p>{searchTerm ? 'Try a different search term' : 'Add your first client to get started'}</p>
          {!searchTerm && (
            <button onClick={() => navigate('/add-client')} className="add-client-btn">
              ➕ Add Client
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Clients;