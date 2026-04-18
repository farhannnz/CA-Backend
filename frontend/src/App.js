import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddClient from './pages/AddClient';
import UploadDocument from './pages/UploadDocument';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Navbar from './components/Navbar';
import { getMe } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Check if token is valid by making a test API call
      const checkToken = async () => {
        try {
          await getMe(); // This will throw error if token is invalid
          setIsAuthenticated(true);
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      };
      checkToken();
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navbar onLogout={handleLogout} />}
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/clients" 
            element={isAuthenticated ? <Clients /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/client/:clientId" 
            element={isAuthenticated ? <ClientDetail /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/add-client" 
            element={isAuthenticated ? <AddClient /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/upload-document" 
            element={isAuthenticated ? <UploadDocument /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
