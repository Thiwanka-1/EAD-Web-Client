import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Auth gate
import RequireAuth from "./components/RequireAuth.jsx";

// Pages
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

// (optional) layout wrapper if you’re using it
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Users from "./pages/Users.jsx";
import Owners from "./pages/Owners.jsx";
import Stations from "./pages/Stations.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth roles={["Backoffice"]}>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </RequireAuth>
        }
      />

      <Route
  path="/users"
  element={
    <RequireAuth roles={["Backoffice", "Operator"]}>
      <DashboardLayout>
        <Users />
      </DashboardLayout>
    </RequireAuth>
  }
/>

<Route
        path="/owners"
        element={
          <RequireAuth roles={["Backoffice"]}>
            <DashboardLayout>
              <Owners />
            </DashboardLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/stations"
        element={
          <RequireAuth roles={["Backoffice"]}>
            <DashboardLayout>
              <Stations />
            </DashboardLayout>
          </RequireAuth>
        }
      />


      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
