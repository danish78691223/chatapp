// src/api/axios.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL;

const API = axios.create({
  baseURL: `${API_BASE}/api`,
});

// attach token
API.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem("user"));
  const token = stored?.token;

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { API_BASE };
export default API;
