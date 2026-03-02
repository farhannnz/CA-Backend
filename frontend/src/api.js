import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Client APIs
export const addClient = (data) => api.post('/clients', data);
export const getClients = () => api.get('/clients');
export const deleteClient = (id) => api.delete(`/clients/${id}`);

// Document APIs
export const uploadDocument = (formData) => {
  return api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
export const getAllDocuments = () => api.get('/documents');
export const getClientDocuments = (clientId) => api.get(`/documents/client/${clientId}`);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

export default api;
