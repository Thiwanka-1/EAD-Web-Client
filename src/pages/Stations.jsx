import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import api from "../api/api.js";
import { AuthContext } from "../context/AuthContext.jsx";
import {
  FaPlus,
  FaSearch,
  FaTrash,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

/* -------------------- UI helpers (purely visual) -------------------- */
const Badge = ({ tone = "gray", children }) => {
  const tones = {
    green: "bg-green-100 text-green-700 ring-green-200",
    red: "bg-red-100 text-red-700 ring-red-200",
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-3"><div className="h-3 w-24 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-3 w-40 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-5 w-12 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-8 w-28 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-3 w-48 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-5 w-16 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-5 w-24 rounded bg-gray-200" /></td>
    <td className="p-3"><div className="h-8 w-40 rounded bg-gray-200" /></td>
  </tr>
);

/* -------------------- default form -------------------- */
const emptyForm = {
  stationId: "",
  name: "",
  latitude: "",
  longitude: "",
  address: "",
  type: "AC",
  availableSlots: 0,
  isActive: true,
  operatorUserIds: [],
};

export default function Stations() {
  const { user } = useContext(AuthContext);

  const [stations, setStations] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  // filters/search
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // modal & form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  // quick slots edit
  const [slotsEditingId, setSlotsEditingId] = useState(null);
  const [slotsValue, setSlotsValue] = useState(0);

  // maps
  const inputRef = useRef(null);
  const [selectedPos, setSelectedPos] = useState(null);

  /* -------------------- data load -------------------- */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [stRes, userRes] = await Promise.all([
        api.get("/stations"),
        api.get("/users"),
      ]);
      setStations(stRes.data || []);
      const ops = (userRes.data || []).filter(
        (u) => u.role === "Operator" && u.isActive
      );
      setOperators(ops);
    } catch (err) {
      console.error(err);
      setError("Failed to load stations or users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  /* -------------------- table derivations -------------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (stations || [])
      .filter((s) =>
        q
          ? s.stationId?.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q) ||
            s.address?.toLowerCase().includes(q)
          : true
      )
      .filter((s) => (typeFilter === "ALL" ? true : s.type === typeFilter))
      .filter((s) =>
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? s.isActive
          : !s.isActive
      );
  }, [stations, search, typeFilter, statusFilter]);

  /* -------------------- modal helpers -------------------- */
  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setSelectedPos(null);
    setIsModalOpen(true);
    setError(null);
  };

  const openEdit = (st) => {
    setForm({
      stationId: st.stationId || "",
      name: st.name || "",
      latitude: st.latitude ?? "",
      longitude: st.longitude ?? "",
      address: st.address || "",
      type: st.type || "AC",
      availableSlots: st.availableSlots ?? 0,
      isActive: !!st.isActive,
      operatorUserIds: st.operatorUserIds || [],
    });
    setSelectedPos(
      st.latitude && st.longitude ? { lat: st.latitude, lng: st.longitude } : null
    );
    setEditing(true);
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setSelectedPos(null);
  };

  // keep marker synced when typing lat/lng
  useEffect(() => {
    if (!isModalOpen) return;
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat && lng) setSelectedPos({ lat, lng });
  }, [form.latitude, form.longitude, isModalOpen]);

  // places autocomplete hookup
  usePlacesAutocomplete(inputRef, setForm, setSelectedPos, isModalOpen);

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onToggleOperatorInForm = (id) => {
    setForm((f) => {
      const exists = f.operatorUserIds.includes(id);
      return {
        ...f,
        operatorUserIds: exists
          ? f.operatorUserIds.filter((x) => x !== id)
          : [...f.operatorUserIds, id],
      };
    });
  };

  const validLat = (lat) => lat >= -90 && lat <= 90;
  const validLng = (lng) => lng >= -180 && lng <= 180;

  /* -------------------- submit (create/update) -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {
      stationId: String(form.stationId || "").trim(),
      name: String(form.name || "").trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      address: String(form.address || "").trim(),
      type: form.type,
      availableSlots: Number(form.availableSlots),
      isActive: Boolean(form.isActive),
      operatorUserIds: form.operatorUserIds,
    };

    if (!payload.stationId) return setError("Station ID is required.");
    if (!validLat(payload.latitude) || !validLng(payload.longitude))
      return setError("Latitude/Longitude is invalid.");
    if (!["AC", "DC"].includes(payload.type))
      return setError("Type must be AC or DC.");
    if (isNaN(payload.availableSlots) || payload.availableSlots < 0)
      return setError("Available slots cannot be negative.");

    try {
      setSaving(true);
      if (editing) {
        await api.put(`/stations/${payload.stationId}`, payload);
      } else {
        await api.post("/stations", payload);
      }

      // ensure slots endpoint in sync (non-breaking if backend already did it)
      try {
        await api.patch(
          `/stations/${payload.stationId}/slots?availableSlots=${payload.availableSlots}`
        );
      } catch (_) {}

      closeModal();
      setBanner(editing ? "Station updated successfully" : "Station created");
      fetchAll();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to save station";
      setError(typeof msg === "string" ? msg : "Failed to save station");
    } finally {
      setSaving(false);
      setTimeout(() => setBanner(null), 3000);
    }
  };

  /* -------------------- row actions -------------------- */
  const handleDelete = async (stationId) => {
    if (!window.confirm(`Delete station ${stationId}?`)) return;
    try {
      await api.delete(`/stations/${stationId}`);
      setBanner("Station deleted");
      fetchAll();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.response?.data || "Delete failed";
      alert(typeof msg === "string" ? msg : "Delete failed");
    } finally {
      setTimeout(() => setBanner(null), 2500);
    }
  };

  const handleToggleActive = async (st) => {
    const next = !st.isActive;
    const confirmMsg = next
      ? `Activate station ${st.stationId}?`
      : `Deactivate station ${st.stationId}? (blocked if station has active bookings)`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/stations/${st.stationId}/status?isActive=${next}`);
      setBanner("Status updated");
      fetchAll();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.response?.data || "Status change failed";
      alert(typeof msg === "string" ? msg : "Status change failed");
    } finally {
      setTimeout(() => setBanner(null), 2500);
    }
  };

  // quick slots inline edit
  const startEditSlots = (st) => {
    setSlotsEditingId(st.stationId);
    setSlotsValue(Number(st.availableSlots ?? 0));
  };
  const cancelEditSlots = () => {
    setSlotsEditingId(null);
    setSlotsValue(0);
  };
  const saveSlots = async (st) => {
    if (slotsValue < 0) return alert("Available slots cannot be negative");
    try {
      await api.patch(`/stations/${st.stationId}/slots?availableSlots=${Number(slotsValue)}`);
      setSlotsEditingId(null);
      setBanner("Slots updated");
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to update slots");
    } finally {
      setTimeout(() => setBanner(null), 2500);
    }
  };

  /* -------------------- guards -------------------- */
  if (user?.role !== "Backoffice") {
    return <div className="p-6 text-center text-red-600 font-medium">Not authorized</div>;
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* banners/errors */}
      {banner && (
        <div className="rounded-md bg-green-50 p-3 text-green-700 ring-1 ring-green-200">
          {banner}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* header + toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Charging Stations</h1>
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-80">
            <FaSearch className="pointer-events-none absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"
          >
            <FaPlus /> Add Station
          </button>
        </div>
      </div>

      {/* quick filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
        >
          <option value="ALL">All types</option>
          <option value="AC">AC</option>
          <option value="DC">DC</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* desktop table */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-700">
                <th className="p-3 font-semibold">Station ID</th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Slots</th>
                <th className="p-3 font-semibold">Location</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Operators</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow /><SkeletonRow /><SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">No stations found.</td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.stationId} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{st.stationId}</td>
                    <td className="p-3">{st.name}</td>
                    <td className="p-3">{st.type}</td>
                    <td className="p-3">
                      {slotsEditingId === st.stationId ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={slotsValue}
                            onChange={(e) => setSlotsValue(Number(e.target.value))}
                            className="w-20 rounded border px-2 py-1"
                          />
                          <button
                            onClick={() => saveSlots(st)}
                            className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditSlots}
                            className="rounded bg-gray-300 px-3 py-1.5 hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{st.availableSlots}</span>
                          <button
                            onClick={() => startEditSlots(st)}
                            className="text-blue-600 hover:underline"
                          >
                            edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-gray-600">
                        {st.latitude?.toFixed?.(5)}, {st.longitude?.toFixed?.(5)}
                      </div>
                      <div className="text-gray-800 truncate max-w-[300px]">{st.address}</div>
                    </td>
                    <td className="p-3">
                      <Badge tone={st.isActive ? "green" : "red"}>
                        {st.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {(st.operatorUserIds || []).length === 0 ? (
                        <span className="text-xs text-gray-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {st.operatorUserIds.map((id) => {
                            const op = operators.find((o) => o.id === id);
                            return (
                              <Badge key={id} tone="blue">
                                {op ? op.username : id}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(st)}
                          className="inline-flex items-center gap-1 rounded bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(st)}
                          className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-white ${
                            st.isActive ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {st.isActive ? <FaToggleOff /> : <FaToggleOn />}{" "}
                          {st.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(st.stationId)}
                          className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                        >
                          <FaTrash /> Delete
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

      {/* mobile card list */}
      <ul className="sm:hidden space-y-3">
        {loading ? (
          <>
            <li className="h-28 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
            <li className="h-28 rounded-xl bg-white border border-gray-200 shadow-sm animate-pulse" />
          </>
        ) : filtered.length === 0 ? (
          <li className="rounded-xl bg-white p-5 text-center text-gray-500 border border-gray-200 shadow-sm">
            No stations found.
          </li>
        ) : (
          filtered.map((st) => (
            <li key={st.stationId} className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">{st.name}</div>
                  <div className="text-xs text-gray-500">{st.stationId} · {st.type}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {st.latitude?.toFixed?.(5)}, {st.longitude?.toFixed?.(5)}
                  </div>
                  <div className="mt-1 text-sm text-gray-800 line-clamp-2">{st.address}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={st.isActive ? "green" : "red"}>
                      {st.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge tone="gray">{st.availableSlots} slots</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => openEdit(st)}
                  className="inline-flex items-center gap-1 rounded bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
                >
                  <FaEdit /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(st)}
                  className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-white ${
                    st.isActive ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {st.isActive ? <FaToggleOff /> : <FaToggleOn />}{" "}
                  {st.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(st.stationId)}
                  className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200 max-h-[95vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? "Edit Station" : "Add Station"}
              </h2>
              <p className="text-sm text-gray-500">
                Click on the map or search a place to set coordinates.
              </p>
            </div>

            {error && (
              <div className="mb-3 rounded-md bg-red-50 p-3 text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* search + map */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm text-gray-600">Search Location</label>
                  <input
                    ref={inputRef}
                    placeholder="Search for a place…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div className="h-64 rounded-lg overflow-hidden shadow border">
                  <Map
                    key={`${editing ? form.stationId : "new"}-${selectedPos?.lat ?? "init"}-${selectedPos?.lng ?? "init"}`}
                    defaultCenter={{
                      lat: selectedPos?.lat || Number(form.latitude) || 6.9271,
                      lng: selectedPos?.lng || Number(form.longitude) || 79.8612,
                    }}
                    defaultZoom={selectedPos ? 14 : 10}
                    onClick={(e) => {
                      const lat = e.detail.latLng.lat;
                      const lng = e.detail.latLng.lng;
                      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                      setSelectedPos({ lat, lng });
                    }}
                    mapId="station-map"
                    style={{ width: "100%", height: "100%" }}
                  >
                    {selectedPos && <AdvancedMarker position={selectedPos} />}
                  </Map>
                </div>
              </div>

              {/* fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Station ID</label>
                  <input
                    name="stationId"
                    value={form.stationId}
                    onChange={onFormChange}
                    disabled={editing}
                    placeholder="ST1001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm disabled:bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onFormChange}
                    placeholder="Kollupitiya Fast Charger"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-600">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={form.latitude}
                    onChange={onFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                    placeholder="6.9056"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={form.longitude}
                    onChange={onFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                    placeholder="79.8520"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-600">Address</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={onFormChange}
                    placeholder="123 Galle Rd, Colombo"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-600">Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={onFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                  >
                    <option value="AC">AC</option>
                    <option value="DC">DC</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-600">Available Slots</label>
                  <input
                    type="number"
                    min="0"
                    name="availableSlots"
                    value={form.availableSlots}
                    onChange={onFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-600">Active</label>
                  <select
                    name="isActive"
                    value={String(form.isActive)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.value === "true" }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                {/* operators */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm text-gray-600">Assign Operators</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 rounded-lg border">
                    {operators.length === 0 ? (
                      <div className="text-sm text-gray-400">No active operators available</div>
                    ) : (
                      operators.map((op) => {
                        const checked = form.operatorUserIds.includes(op.id);
                        return (
                          <label
                            key={op.id}
                            className={`flex items-center gap-2 rounded border px-3 py-2 cursor-pointer transition ${
                              checked ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleOperatorInForm(op.id)}
                            />
                            <span className="text-sm">{op.username}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-white shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Station"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------
 * Places Autocomplete Hook (uses 'places')
 * Requires <APIProvider libraries={['places']}> at app root
 * ----------------------------------------- */
function usePlacesAutocomplete(ref, setForm, setSelectedPos, enabled) {
  const map = useMap();
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!enabled) return;
    if (!places || !ref.current) return;

    const autocomplete = new places.Autocomplete(ref.current, {
      fields: ["geometry", "formatted_address", "name"],
    });

    const onChanged = () => {
      const place = autocomplete.getPlace();
      if (!place?.geometry) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setForm((f) => ({
        ...f,
        latitude: lat,
        longitude: lng,
        address: place.formatted_address || place.name || f.address,
      }));
      setSelectedPos({ lat, lng });
      if (map) map.panTo({ lat, lng });
    };

    autocomplete.addListener("place_changed", onChanged);
    return () => google.maps.event.clearInstanceListeners(autocomplete);
  }, [places, ref, map, enabled, setForm, setSelectedPos]);
}
