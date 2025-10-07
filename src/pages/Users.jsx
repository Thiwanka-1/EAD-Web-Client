import React, { useEffect, useState, useContext, useRef } from "react";
import api from "../api/api.js";
import { AuthContext } from "../context/AuthContext.jsx";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import {
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  XMarkIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";

/* --------------------------- Helpers --------------------------- */
const Badge = ({ active }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      active
        ? "bg-green-100 text-green-700 ring-1 ring-green-200"
        : "bg-red-100 text-red-700 ring-1 ring-red-200"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-3">
      <div className="h-3 w-32 rounded bg-gray-200" />
    </td>
    <td className="p-3">
      <div className="h-3 w-20 rounded bg-gray-200" />
    </td>
    <td className="p-3">
      <div className="h-5 w-16 rounded-full bg-gray-200" />
    </td>
    <td className="p-3">
      <div className="h-8 w-48 rounded bg-gray-200" />
    </td>
  </tr>
);

/* --------------------------- Main --------------------------- */
export default function Users() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "Operator" });
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const firstFieldRef = useRef(null);

  // Search & sort
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("username");
  const [sortDir, setSortDir] = useState("asc");

  // Filters (optional nice touch)
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Load users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (isModalOpen && firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, [isModalOpen]);

  // Handle form
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const openModal = (u = null) => {
    if (u) {
      setEditingUser(u);
      setForm({ username: u.username, password: "", role: u.role });
    } else {
      setEditingUser(null);
      setForm({ username: "", password: "", role: "Operator" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ username: "", password: "", role: "Operator" });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { username: form.username, role: form.role };
      if (form.password && form.password.trim() !== "") {
        payload.passwordHash = form.password; // backend will hash
      }
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        setBanner("User updated successfully");
      } else {
        await api.post("/users", payload);
        setBanner("User created successfully");
      }
      closeModal();
      fetchUsers();
    } catch {
      setError("Error saving user");
    } finally {
      setSaving(false);
      setTimeout(() => setBanner(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      setBanner("User deleted");
      fetchUsers();
    } catch {
      setError("Failed to delete user");
    } finally {
      setTimeout(() => setBanner(null), 2500);
    }
  };

  const handleToggleActive = async (u) => {
    const confirmMsg = u.isActive
      ? "Deactivate this user?"
      : "Activate this user?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/users/${u.id}`, { ...u, isActive: !u.isActive });
      setBanner("Status updated");
      fetchUsers();
    } catch {
      setError("Failed to update status");
    } finally {
      setTimeout(() => setBanner(null), 2500);
    }
  };

  if (user?.role !== "Backoffice") {
    return <p className="text-center text-red-500 mt-8">Not authorized</p>;
  }

  // Derived: filtered + sorted
  const filtered = users
    .filter((u) => u.username?.toLowerCase().includes(search.toLowerCase()))
    .filter((u) => (roleFilter === "ALL" ? true : u.role === roleFilter))
    .filter((u) =>
      statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? u.isActive : !u.isActive
    )
    .sort((a, b) => {
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const flipSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Banner */}
      {banner && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-green-700 ring-1 ring-green-200">
          {banner}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <PlusIcon className="h-5 w-5" /> Add User
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
        >
          <option value="ALL">All roles</option>
          <option value="Backoffice">Backoffice</option>
          <option value="Operator">Operator</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active only</option>
          <option value="INACTIVE">Inactive only</option>
        </select>
      </div>

      {/* Desktop/Table view */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th
                  className="p-3 font-semibold cursor-pointer select-none"
                  onClick={() => flipSort("username")}
                >
                  <div className="inline-flex items-center gap-1">
                    Username <ChevronUpDownIcon className="h-4 w-4" />
                  </div>
                </th>
                <th
                  className="p-3 font-semibold cursor-pointer select-none"
                  onClick={() => flipSort("role")}
                >
                  <div className="inline-flex items-center gap-1">
                    Role <ChevronUpDownIcon className="h-4 w-4" />
                  </div>
                </th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.username}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">
                      <Badge active={!!u.isActive} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openModal(u)}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
                        >
                          <PencilSquareIcon className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                        >
                          <TrashIcon className="h-4 w-4" /> Delete
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-white ${
                            u.isActive
                              ? "bg-gray-600 hover:bg-gray-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          <PowerIcon className="h-4 w-4" />
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Card view */}
      <ul className="sm:hidden space-y-3">
        {loading ? (
          <>
            <li className="h-24 rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse" />
            <li className="h-24 rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse" />
          </>
        ) : filtered.length === 0 ? (
          <li className="rounded-xl bg-white p-5 text-center text-gray-500 shadow-sm border border-gray-200">
            No users found.
          </li>
        ) : (
          filtered.map((u) => (
            <li
              key={u.id}
              className="rounded-xl bg-white p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{u.username}</div>
                  <div className="text-sm text-gray-500">{u.role}</div>
                </div>
                <Badge active={!!u.isActive} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => openModal(u)}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
                >
                  <PencilSquareIcon className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                >
                  <TrashIcon className="h-4 w-4" /> Delete
                </button>
                <button
                  onClick={() => handleToggleActive(u)}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-white ${
                    u.isActive
                      ? "bg-gray-600 hover:bg-gray-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  <PowerIcon className="h-4 w-4" />
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          onKeyDown={(e) => e.key === "Escape" && closeModal()}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 animate-[fadeIn_.15s_ease-out]">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-xl font-semibold">
              {editingUser ? "Edit User" : "Add User"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Username</label>
                <input
                  ref={firstFieldRef}
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g., operator01"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {editingUser ? "Password (optional)" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {editingUser
                    ? "Leave empty to keep the existing password."
                    : "Minimum 8 characters recommended."}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
                >
                  <option value="Backoffice">Backoffice</option>
                  <option value="Operator">Operator</option>
                </select>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-white shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
