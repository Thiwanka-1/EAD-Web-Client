// src/pages/operator/OperatorProfile.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import api from "../api/api.js";
import {
  FaUserCircle,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaPowerOff,
} from "react-icons/fa";

/* ---------------- helpers ---------------- */

const Toast = ({ type = "info", message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  const styles =
    type === "success"
      ? "bg-green-600 text-white"
      : type === "error"
      ? "bg-red-600 text-white"
      : "bg-gray-800 text-white";
  return (
    <div className={`fixed bottom-4 right-4 z-[60] px-4 py-3 rounded-lg shadow ${styles}`}>
      {message}
    </div>
  );
};

const Confirm = ({ title, message, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-md rounded-xl shadow-lg">
      <div className="px-5 py-4 border-b font-semibold">{title}</div>
      <div className="px-5 py-4 text-sm text-gray-700">{message}</div>
      <div className="px-5 py-4 flex justify-end gap-2 border-t">
        <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

/** Minimal JWT payload decode (no external deps) */
function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Try plausible claim keys for NameIdentifier / user id */
function getUserIdFromToken(token) {
  const p = decodeJwtPayload(token);
  if (!p) return null;
  return (
    p.nameid ||
    p.nameId ||
    p.sub ||
    p["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    null
  );
}

/* ---------------- page ---------------- */

export default function OperatorProfile() {
  const { user, login, logout } = useContext(AuthContext);
  const token = useMemo(() => localStorage.getItem("token"), []);
  const userId = useMemo(() => (token ? getUserIdFromToken(token) : null), [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  // Server model fields
  const [username, setUsername] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [role, setRole] = useState("Operator"); // read-only display

  // Password change (optional)
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // Load my user
  const loadMe = async () => {
    if (!userId) {
      setLoading(false);
      setToast({ type: "error", message: "Invalid session: user id missing" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/users/${userId}`);
      const u = res.data || {};
      // support either camelCase or PascalCase JSON
      setUsername(u.username ?? u.Username ?? "");
      setIsActive(Boolean(u.isActive ?? u.IsActive ?? true));
      setRole(u.role ?? u.Role ?? "Operator");
    } catch (e) {
      console.error(e);
      setToast({ type: "error", message: "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const save = async () => {
    if (!userId) return;

    if (newPassword || newPassword2) {
      if (newPassword.length < 6) {
        setToast({ type: "error", message: "Password must be at least 6 characters" });
        return;
      }
      if (newPassword !== newPassword2) {
        setToast({ type: "error", message: "Passwords do not match" });
        return;
      }
    }

    setSaving(true);
    try {
      // Backend expects full user object; only Username and PasswordHash are relevant here.
      const payload = {
        id: userId,
        username,
        role, // backend will keep it as Operator
        isActive,
        // send PasswordHash only if changing
        passwordHash: newPassword ? newPassword : "", // controller re-hashes if not empty
      };

      await api.put(`/users/${userId}`, payload);

      // reflect updated username in AuthContext/localStorage so header/sidebar update instantly
      login({ token, role: "Operator", username });

      // clear password fields
      setNewPassword("");
      setNewPassword2("");

      setToast({ type: "success", message: "Profile updated successfully" });
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message || e?.response?.data || "Failed to update profile";
      setToast({ type: "error", message: String(msg) });
    } finally {
      setSaving(false);
    }
  };

  const deactivateSelf = async () => {
    if (!userId) return;
    try {
      await api.patch(`/users/${userId}/status?isActive=false`);
      setConfirmDeactivate(false);
      setToast({ type: "success", message: "Account deactivated" });
      // Immediately log out (account is now inactive)
      setTimeout(() => logout(), 1200);
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message || e?.response?.data || "Failed to deactivate account";
      setToast({ type: "error", message: String(msg) });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="text-blue-600 text-6xl">
          <FaUserCircle />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-500 text-sm">
            Update your username and password. Your role is{" "}
            <span className="font-medium text-gray-700">{role}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow p-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Username */}
          <div className="col-span-1">
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              This username is used to sign in.
            </p>
          </div>

          {/* Role (read-only) */}
          <div className="col-span-1">
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <input
              disabled
              value={role}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          {/* New Password */}
          <div className="col-span-1">
            <label className="block text-sm text-gray-600 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPass1 ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => setShowPass1((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                aria-label={showPass1 ? "Hide password" : "Show password"}
              >
                {showPass1 ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters.</p>
          </div>

          {/* Confirm New Password */}
          <div className="col-span-1">
            <label className="block text-sm text-gray-600 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPass2 ? "text" : "password"}
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => setShowPass2((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                aria-label={showPass2 ? "Hide password" : "Show password"}
              >
                {showPass2 ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <FaSave /> {saving ? "Saving..." : "Save Changes"}
          </button>

          {/* Deactivate self */}
          <button
            onClick={() => setConfirmDeactivate(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800"
            title="Deactivate my account"
          >
            <FaPowerOff /> Deactivate My Account
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Deactivating your account will immediately sign you out. Contact Backoffice to
          re-activate if needed.
        </p>
      </div>

      {/* Confirm Deactivate */}
      {confirmDeactivate && (
        <Confirm
          title="Deactivate Your Account"
          message="Are you sure you want to deactivate your account? You will be signed out immediately."
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={deactivateSelf}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
