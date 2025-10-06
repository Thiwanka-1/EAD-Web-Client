import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { APIProvider } from "@vis.gl/react-google-maps";

// read the API key from .env
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <APIProvider apiKey={apiKey}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </APIProvider>
  </BrowserRouter>
);
