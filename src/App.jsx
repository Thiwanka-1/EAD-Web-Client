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
import Bookings from "./pages/Bookings.jsx";
import OperatorDashboard from "./pages/OperatorDashboard.jsx";
import OperatorLayout from "./layouts/OperatorLayout.jsx";
import OperatorProfile from "./pages/OperatorProfile.jsx";

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
    <RequireAuth roles={["Backoffice"]}>
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

      <Route
        path="/bookings"
        element={
          <RequireAuth roles={["Backoffice"]}>
            <DashboardLayout>
              <Bookings />
            </DashboardLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/op"
        element={
          <RequireAuth roles={["Operator"]}>
            <OperatorLayout>
              <OperatorDashboard />
            </OperatorLayout>
          </RequireAuth>
        }
      />

       <Route
        path="/op/profile"
        element={
          <RequireAuth roles={["Operator"]}>
            <OperatorLayout>
              <OperatorProfile />
            </OperatorLayout>
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
