import React, { useEffect, useState, useContext } from "react";
import api from "../api/api.js";
import { AuthContext } from "../context/AuthContext.jsx";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Users() {
  const { user } = useContext(AuthContext); // logged in user info
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "Operator" });
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Load users
  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Open modal
  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setForm({ username: user.username, password: "", role: user.role });
    } else {
      setEditingUser(null);
      setForm({ username: "", password: "", role: "Operator" });
    }
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ username: "", password: "", role: "Operator" });
    setEditingUser(null);
  };

  // Create or Update
  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      username: form.username,
      role: form.role,
    };

    // Only include password if provided
    if (form.password && form.password.trim() !== "") {
      payload.passwordHash = form.password; // send raw, backend hashes it
    }

    if (editingUser) {
      await api.put(`/users/${editingUser.id}`, payload);
    } else {
      await api.post("/users", payload);
    }

    closeModal();
    fetchUsers();
  } catch (err) {
    setError("Error saving user");
  }
};


  // Delete user
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      setError("Failed to delete user");
    }
  };

  // Toggle active status
  const handleToggleActive = async (user) => {
    const confirmMsg = user.isActive
      ? "Are you sure you want to deactivate this user?"
      : "Are you sure you want to activate this user?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/users/${user.id}`, { ...user, isActive: !user.isActive });
      fetchUsers();
    } catch (err) {
      setError("Failed to update status");
    }
  };

  if (loading) return <p className="text-center mt-8">Loading...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  // Filtered users
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (user?.role !== "Backoffice") {
    return <p className="text-center text-red-500 mt-8">Not authorized</p>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full border px-3 py-2 rounded focus:ring focus:ring-blue-300"
      />

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Username</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => openModal(u)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`px-3 py-1 ${
                      u.isActive ? "bg-gray-500" : "bg-green-600"
                    } text-white rounded`}
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? "Edit User" : "Add User"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Username"
                required
                className="border rounded p-2 w-full"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="border rounded p-2 w-full pr-10"
                />
                <span
                  className="absolute right-3 top-3 cursor-pointer text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="border rounded p-2 w-full"
              >
                <option value="Backoffice">Backoffice</option>
                <option value="Operator">Operator</option>
              </select>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingUser ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
