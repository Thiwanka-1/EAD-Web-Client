import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api.js";
import {
  FaSearch,
  FaUserEdit,
  FaToggleOn,
  FaToggleOff,
  FaTrashAlt,
  FaInfoCircle,
} from "react-icons/fa";

/* ---------- helpers ---------- */

function Toast({ msg, type = "info", onClose }) {
  const base =
    "fixed right-4 bottom-4 z-[60] rounded-lg shadow px-4 py-3 text-sm";
  const colors =
    type === "error"
      ? "bg-red-600 text-white"
      : type === "success"
      ? "bg-green-600 text-white"
      : "bg-gray-800 text-white";
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`${base} ${colors}`}>{msg}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Confirm({ title = "Confirm", message, onCancel, onConfirm, confirmClass = "bg-red-600 hover:bg-red-700" }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-gray-700">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 rounded text-white ${confirmClass}`}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function fmt(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d)) return "-";
  return d.toLocaleString();
}

/* ---------- main page ---------- */

export default function Owners() {
  const [owners, setOwners] = useState([]);
  const [bookings, setBookings] = useState([]); // used to show last 5 in details
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("All"); // All | Active | Inactive

  // UI
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null); // owner object
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "", isActive: true });

  const [detailsFor, setDetailsFor] = useState(null); // owner object
  const [confirmFor, setConfirmFor] = useState(null); // {type: 'delete'|'status', owner, next?}

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [oRes, bRes] = await Promise.all([
        api.get("/evowners"),
        api.get("/bookings"),
      ]);
      setOwners(oRes.data || []);
      setBookings(bRes.data || []);
    } catch (e) {
      console.error(e);
      setError("Failed to load owners/bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...owners];

    // status filter
    if (activeFilter !== "All") {
      const isActive = activeFilter === "Active";
      list = list.filter((o) => !!o.isActive === isActive);
    }

    // query
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.nic?.toLowerCase().includes(qq) ||
          o.firstName?.toLowerCase().includes(qq) ||
          o.lastName?.toLowerCase().includes(qq) ||
          o.email?.toLowerCase().includes(qq) ||
          o.phone?.toLowerCase().includes(qq)
      );
    }

    // sort by name then NIC
    list.sort((a, b) => {
      const aN = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
      const bN = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
      if (aN === bN) return (a.nic || "").localeCompare(b.nic || "");
      return aN.localeCompare(bN);
    });

    return list;
  }, [owners, q, activeFilter]);

  const ownerName = (o) =>
    [o.firstName, o.lastName].filter(Boolean).join(" ").trim() || "—";

  const lastBookings = (nic) => {
    const list = bookings
      .filter((b) => b.ownerNic === nic)
      .sort((a, b) => new Date(b.createdUtc) - new Date(a.createdUtc))
      .slice(0, 5);
    return list;
  };

  /* ---------- actions ---------- */

  const openEdit = (o) => {
    setEditing(o);
    setEditForm({
      firstName: o.firstName || "",
      lastName: o.lastName || "",
      email: o.email || "",
      phone: o.phone || "",
      isActive: !!o.isActive,
    });
  };

  const saveEdit = async () => {
    try {
      await api.put(`/evowners/${editing.nic}`, {
        nic: editing.nic, // server overwrites anyway
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        isActive: editForm.isActive,
      });
      setToast({ msg: "Owner updated.", type: "success" });
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.response?.data || "Failed to update owner";
      setToast({ msg: String(msg), type: "error" });
    }
  };

  const askToggleStatus = (o) => {
    const next = !o.isActive;
    setConfirmFor({
      type: "status",
      owner: o,
      next,
      title: next ? "Activate Owner" : "Deactivate Owner",
      message: next
        ? `Activate owner ${o.nic}?`
        : `Deactivate owner ${o.nic}? The owner won't be able to log in.`,
      confirmClass: next ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-800",
    });
  };

  const toggleStatus = async (nic, next) => {
    try {
      await api.patch(`/evowners/${nic}/status?isActive=${next}`);
      setToast({ msg: `Owner ${next ? "activated" : "deactivated"}.`, type: "success" });
      setConfirmFor(null);
      await load();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.response?.data || "Failed to change status";
      setToast({ msg: String(msg), type: "error" });
    }
  };

  const askDelete = (o) => {
    setConfirmFor({
      type: "delete",
      owner: o,
      title: "Delete Owner",
      message: `Are you sure you want to delete owner ${o.nic}? This cannot be undone.`,
      confirmClass: "bg-red-600 hover:bg-red-700",
    });
  };

  const doDelete = async (nic) => {
    try {
      await api.delete(`/evowners/${nic}`);
      setToast({ msg: "Owner deleted.", type: "success" });
      setConfirmFor(null);
      await load();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.response?.data || "Failed to delete owner";
      setToast({ msg: String(msg), type: "error" });
    }
  };

  /* ---------- render ---------- */

  if (loading)
    return (
      <div className="p-6 text-center text-gray-600">Loading owners…</div>
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header + Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">EV Owners</h1>
            <p className="text-xs text-gray-500 mt-1">Manage EV owner profiles (view, edit, activate/deactivate, delete).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search NIC, name, email, phone…"
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              />
            </div>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">NIC</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.nic} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono">{o.nic}</td>
                <td className="p-3">{ownerName(o)}</td>
                <td className="p-3">{o.email}</td>
                <td className="p-3">{o.phone}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      o.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {o.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setDetailsFor(o)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      <FaInfoCircle /> Details
                    </button>
                    <button
                      onClick={() => openEdit(o)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      <FaUserEdit /> Edit
                    </button>
                    <button
                      onClick={() => askToggleStatus(o)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded text-white ${
                        o.isActive
                          ? "bg-gray-600 hover:bg-gray-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {o.isActive ? <FaToggleOff /> : <FaToggleOn />}{" "}
                      {o.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => askDelete(o)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      <FaTrashAlt /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  No owners found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500 text-sm">
            No owners found.
          </div>
        )}

        {filtered.map((o) => (
          <div key={o.nic} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[12px]">{o.nic}</div>
              <span
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  o.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {o.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-2 text-sm space-y-1">
              <div className="font-medium">{ownerName(o)}</div>
              <div className="text-gray-600">{o.email}</div>
              <div className="text-gray-600">{o.phone}</div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setDetailsFor(o)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                <FaInfoCircle /> Details
              </button>
              <button
                onClick={() => openEdit(o)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600"
              >
                <FaUserEdit /> Edit
              </button>
              <button
                onClick={() => askToggleStatus(o)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded text-white ${
                  o.isActive
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {o.isActive ? <FaToggleOff /> : <FaToggleOn />}{" "}
                {o.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => askDelete(o)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
              >
                <FaTrashAlt /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <Modal title={`Edit Owner (${editing.nic})`} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">First Name</label>
              <input
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Kavindu"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Name</label>
              <input
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Perera"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="owner@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="+94 7X XXX XXXX"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Status</label>
              <select
                value={String(editForm.isActive)}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, isActive: e.target.value === "true" }))
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                (You can also toggle status from the list.)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </Modal>
      )}

      {/* Details modal */}
      {detailsFor && (
        <Modal title={`Owner Details (${detailsFor.nic})`} onClose={() => setDetailsFor(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <div className="text-gray-500">Name</div>
              <div className="font-medium">{ownerName(detailsFor)}</div>
            </div>
            <div>
              <div className="text-gray-500">Email</div>
              <div className="font-medium">{detailsFor.email || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Phone</div>
              <div className="font-medium">{detailsFor.phone || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div className="mt-1">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    detailsFor.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {detailsFor.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <h4 className="mt-5 mb-2 font-semibold">Last 5 bookings</h4>
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-2">Booking ID</th>
                    <th className="p-2">Station</th>
                    <th className="p-2">Start</th>
                    <th className="p-2">End</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lastBookings(detailsFor.nic).map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="p-2 font-mono">{b.id}</td>
                      <td className="p-2">{b.stationId}</td>
                      <td className="p-2">{fmt(b.startTimeUtc)}</td>
                      <td className="p-2">{fmt(b.endTimeUtc)}</td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {lastBookings(detailsFor.nic).length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-3 text-center text-gray-500">
                        No bookings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm dialogs */}
      {confirmFor && confirmFor.type === "delete" && (
        <Confirm
          title={confirmFor.title}
          message={confirmFor.message}
          onCancel={() => setConfirmFor(null)}
          onConfirm={() => doDelete(confirmFor.owner.nic)}
        />
      )}
      {confirmFor && confirmFor.type === "status" && (
        <Confirm
          title={confirmFor.title}
          message={confirmFor.message}
          confirmClass={confirmFor.confirmClass}
          onCancel={() => setConfirmFor(null)}
          onConfirm={() => toggleStatus(confirmFor.owner.nic, confirmFor.next)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
