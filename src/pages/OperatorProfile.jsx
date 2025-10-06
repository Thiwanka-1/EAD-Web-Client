// src/pages/operator/OperatorProfile.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function OperatorProfile() {
  const { user } = useContext(AuthContext);

  return (
    <div className="bg-white rounded-xl shadow p-4 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">My Profile</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Username</div>
          <div className="font-medium">{user?.username || "-"}</div>
        </div>
        <div>
          <div className="text-gray-500">Role</div>
          <div className="font-medium">{user?.role || "-"}</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        (If you need to change your password or details, contact Backoffice.)
      </p>
    </div>
  );
}
