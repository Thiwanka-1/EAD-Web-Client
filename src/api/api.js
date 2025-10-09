import axios from "axios";

const api = axios.create({
  baseURL: "https://evcharge-api-kh-cvgdhcfvazekever.eastasia-01.azurewebsites.net/api",
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 UNLESS it's the login endpoint itself
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    if (status === 401) {
      // If this 401 came from the login call itself, don't redirect to /login.
      if (url.includes("/auth/login")) {
        return Promise.reject(error);
      }

      // Any other 401 → token expired or invalid session → wipe + redirect.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.setItem("sessionExpired", "true"); // used by Login page
      window.location.href = "/login";
      return; // stop further handling
    }

    return Promise.reject(error);
  }
);

export default api;
