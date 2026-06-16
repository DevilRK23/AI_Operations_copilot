import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 
           (import.meta.env.DEV ? "http://localhost:8000" : window.location.origin)
});

export default API;