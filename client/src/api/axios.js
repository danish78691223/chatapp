import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL + "/api",
});

<<<<<<< HEAD
// Automatically attach token
=======
// Add token
>>>>>>> 98d3a84b222c5bcf90b1b4346a506ace9413656a
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

<<<<<<< HEAD
// Token expiration handler
=======
// 401 error handling
>>>>>>> 98d3a84b222c5bcf90b1b4346a506ace9413656a
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;
