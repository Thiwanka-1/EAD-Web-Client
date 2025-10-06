import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

export default function RequireAuth({ children, roles }) {
  const { user, loading } = useContext(AuthContext);

  // Wait while we restore the user from localStorage (prevents blank screen / forced logout on refresh)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Role check (if provided)
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 font-medium">Not authorized</div>
      </div>
    );
  }

  return children;
}
