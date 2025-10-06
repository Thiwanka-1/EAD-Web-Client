import React, { useEffect, useState, useContext } from "react";
import api from "../api/api.js";
import { AuthContext } from "../context/AuthContext.jsx";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Owners() {
  const { user } = useContext(AuthContext);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    nic: "",
    email: "",
    password: "",
    isActive: true,
  });
  const [editingOwner, setEditingOwner] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Load owners
  const fetchOwners = async () => {
    try {
      const res = await api.get("/evowners");
      setOwners(res.data);
    } catch (err) {
      setError("Failed to fetch owners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Open modal
  const openModal = (owner = null) => {
    if (owner) {
      setEditingOwner(owner);
      setForm({
        nic: owner.nic,
        email: owner.email,
        password: "",
        isActive: owner.isActive,
      });
    } else {
      setEditingOwner(null);
      setForm({ nic: "", email: "", password: "", isActive: true });
    }
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ nic: "", email: "", password: "", isActive: true });
    setEditingOwner(null);
  };

  // Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nic: form.nic,
        email: form.email,
        isActive: form.isActive,
      };
      if (form.password && form.password.trim() !== "") {
        payload.password = form.password; // backend hashes
      }

      if (editingOwner) {
        await api.put(`/evowners/${editingOwner.nic}`, payload);
      } else {
        await api.post("/evowners", payload);
      }

      closeModal();
      fetchOwners();
    } catch (err) {
      setError("Error saving owner");
    }
  };

  // Delete owner
  const handleDelete = async (nic) => {
    if (!window.confirm("Are you sure you want to delete this owner?")) return;
    try {
      await api.delete(`/evowners/${nic}`);
      fetchOwners();
    } catch (err) {
      setError("Failed to delete owner");
    }
  };

  // Toggle active status
  const handleToggleActive = async (owner) => {
    const confirmMsg = owner.isActive
      ? "Deactivate this owner?"
      : "Activate this owner?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/evowners/${owner.nic}`, { ...owner, isActive: !owner.isActive });
      fetchOwners();
    } catch (err) {
      setError("Failed to update status");
    }
  };

  if (loading) return <p className="text-center mt-8">Loading...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  if (user?.role !== "Backoffice") {
    return <p className="text-center text-red-500 mt-8">Not authorized</p>;
  }

  // Filtered list
  const filteredOwners = owners.filter((o) =>
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    o.nic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-800">EV Owners</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search owners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:w-64 border px-3 py-2 rounded-lg focus:ring focus:ring-blue-300"
          />
          
        </div>
      </div>

      {/* Owners Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">NIC</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOwners.map((o) => (
              <tr key={o.nic} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{o.nic}</td>
                <td className="p-3">{o.email}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      o.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {o.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => openModal(o)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(o.nic)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleToggleActive(o)}
                    className={`px-3 py-1 ${
                      o.isActive ? "bg-gray-500" : "bg-green-600"
                    } text-white rounded`}
                  >
                    {o.isActive ? "Deactivate" : "Activate"}
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
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg animate-fadeIn">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {editingOwner ? "Edit Owner" : "Add Owner"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="nic"
                value={form.nic}
                onChange={handleChange}
                placeholder="NIC"
                required
                disabled={!!editingOwner}
                className="border rounded-lg p-2 w-full"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                required
                className="border rounded-lg p-2 w-full"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="border rounded-lg p-2 w-full pr-10"
                />
                <span
                  className="absolute right-3 top-3 cursor-pointer text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingOwner ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
