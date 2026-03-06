import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './ClientDetail.css';

function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ consultantPhone: '' });

  useEffect(() => {
    fetchClientDetails();
    fetchDocuments();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      const response = await api.get(`/clients`);
      const foundClient = response.data.clients.find(c => c._id === clientId);
      setClient(foundClient);
      setEditData({ consultantPhone: foundClient?.consultantPhone || '' });
    } catch (error) {
      console.error('Error fetching client:', error);
      navigate('/clients');
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/documents/client/${clientId}`);
      setDocuments(response.data.documents || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    try {
      await api.put(`/clients/${clientId}`, editData);
      setClient({ ...client, ...editData });
      setEditMode(false);
      alert('Client updated successfully');
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client');
    }
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

  const filteredDocuments = filter === 'ALL' 
    ? documents 
    : documents.filter(doc => doc.documentType === filter);

  const documentTypes = ['ALL', ...new Set(documents.map(d => d.documentType))];

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!client) {
    return <div className="error">Client not found</div>;
  }

  return (
    <div className="client-detail-container">
      <button onClick={() => navigate('/clients')} className="back-btn">
        ← Back to Clients
      </button>

      <div className="client-info-card">
        <div className="client-info-header">
          <h1>👤 {client.name}</h1>
          <button 
            onClick={() => setEditMode(!editMode)} 
            className="edit-btn"
          >
            {editMode ? '❌ Cancel' : '✏️ Edit'}
          </button>
        </div>

        <div className="client-details">
          <div className="detail-item">
            <span className="label">📱 WhatsApp:</span>
            <span className="value">{client.whatsappNumber}</span>
          </div>

          <div className="detail-item">
            <span className="label">📞 Consultant Phone:</span>
            {editMode ? (
              <input
                type="tel"
                value={editData.consultantPhone}
                onChange={(e) => setEditData({ ...editData, consultantPhone: e.target.value })}
                placeholder="+919876543210"
                className="edit-input"
              />
            ) : (
              <span className="value">{client.consultantPhone || 'Not set'}</span>
            )}
          </div>

          <div className="detail-item">
            <span className="label">📄 Total Documents:</span>
            <span className="value">{documents.length}</span>
          </div>

          {editMode && (
            <button onClick={handleUpdateClient} className="save-btn">
              💾 Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="documents-section">
        <div className="section-header">
          <h2>📄 Documents</h2>
          <button 
            onClick={() => navigate('/upload-document')} 
            className="upload-btn"
          >
            ➕ Upload Document
          </button>
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

        {filteredDocuments.length === 0 ? (
          <div className="no-documents">
            <p>No documents found</p>
            <button 
              onClick={() => navigate('/upload-document')} 
              className="upload-btn-large"
            >
              ➕ Upload First Document
            </button>
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.map(doc => (
              <div key={doc._id} className="document-card">
                <div className="doc-header">
                  <span className="doc-type-badge">{doc.documentType}</span>
                  <span className="doc-year">{doc.year}</span>
                </div>
                
                <div className="doc-info">
                  <p className="doc-filename">{doc.fileName}</p>
                  <p className="doc-date">
                    📅 {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="doc-actions">
                  <a 
                    href={doc.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="view-btn"
                  >
                    👁️ View
                  </a>
                  <button 
                    onClick={() => handleDeleteDocument(doc._id)}
                    className="delete-btn"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientDetail;
