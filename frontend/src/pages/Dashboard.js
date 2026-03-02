import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, getAllDocuments } from '../api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({ clients: 0, documents: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clientsRes, docsRes] = await Promise.all([
        getClients(),
        getAllDocuments()
      ]);
      setStats({
        clients: clientsRes.data.clients.length,
        documents: docsRes.data.documents.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {user.name}</h1>
        <p>Manage your clients and documents</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.clients}</h3>
            <p>Total Clients</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.documents}</h3>
            <p>Total Documents</p>
          </div>
        </div>
      </div>

      <div className="action-grid">
        <div className="action-card" onClick={() => navigate('/add-client')}>
          <div className="action-icon">➕</div>
          <h3>Add Client</h3>
          <p>Register a new client with WhatsApp</p>
        </div>
        <div className="action-card" onClick={() => navigate('/upload-document')}>
          <div className="action-icon">📤</div>
          <h3>Upload Document</h3>
          <p>Upload ITR, GST, or other documents</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
