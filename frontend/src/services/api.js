import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 
           (import.meta.env.DEV ? "http://localhost:8000" : window.location.origin)
});

// Automatically inject JWT Bearer token into all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Global response handler to clear session on authorization failure (401)
API.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    
    // Redirect user to login screen, unless already there
    if (!window.location.pathname.endsWith("/login")) {
      window.location.href = "/login";
    }
  }
  return Promise.reject(error);
});

export default API;