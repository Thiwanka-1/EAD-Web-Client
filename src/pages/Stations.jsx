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

  const [search, setSearch] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  // Quick edit for slots
  const [slotsEditingId, setSlotsEditingId] = useState(null);
  const [slotsValue, setSlotsValue] = useState(0);

  // Google Maps: autocomplete input & marker position
  const inputRef = useRef(null);
  const [selectedPos, setSelectedPos] = useState(null);

  // Load stations + operators
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [stRes, userRes] = await Promise.all([
        api.get("/stations"),
        api.get("/users"),
      ]);
      setStations(stRes.data || []);

      // Only Operators for assignment
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

  useEffect(() => {
    fetchAll();
  }, []);

  // Filtered table data
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.stationId?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [stations, search]);

  // ----- modal helpers -----
  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setSelectedPos(null);
    setIsModalOpen(true);
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
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setSelectedPos(null);
  };

  // Keep marker in sync if user types lat/lng manually
  useEffect(() => {
    if (!isModalOpen) return;
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat && lng) {
      setSelectedPos({ lat, lng });
    }
  }, [form.latitude, form.longitude, isModalOpen]);

  // Hook up Places Autocomplete for the search input
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

  // ----- create/update submit -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // sanitize
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

    if (!payload.stationId) return setError("StationId is required");
    if (!validLat(payload.latitude) || !validLng(payload.longitude))
      return setError("Invalid latitude/longitude");
    if (!["AC", "DC"].includes(payload.type))
      return setError("Type must be AC or DC");
    if (isNaN(payload.availableSlots) || payload.availableSlots < 0)
      return setError("AvailableSlots cannot be negative");

    try {
      setSaving(true);

      if (editing) {
        await api.put(`/stations/${payload.stationId}`, payload);
      } else {
        await api.post("/stations", payload);
      }

      // 🔧 Fix off-by-one: set slots explicitly using your slots endpoint
      try {
        await api.patch(
          `/stations/${payload.stationId}/slots?availableSlots=${payload.availableSlots}`
        );
      } catch {
        // ignore if backend already set correctly
      }

      closeModal();
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
    }
  };

  // ----- actions: delete, toggle active, update slots -----
  const handleDelete = async (stationId) => {
    if (!window.confirm(`Delete station ${stationId}?`)) return;
    try {
      await api.delete(`/stations/${stationId}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message || err?.response?.data || "Delete failed";
      alert(typeof msg === "string" ? msg : "Delete failed");
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
      fetchAll();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Status change failed";
      alert(typeof msg === "string" ? msg : "Status change failed");
    }
  };

  const startEditSlots = (st) => {
    setSlotsEditingId(st.stationId);
    setSlotsValue(Number(st.availableSlots ?? 0));
  };
  const cancelEditSlots = () => {
    setSlotsEditingId(null);
    setSlotsValue(0);
  };
  const saveSlots = async (st) => {
    if (slotsValue < 0) {
      alert("AvailableSlots cannot be negative");
      return;
    }
    try {
      await api.patch(
        `/stations/${st.stationId}/slots?availableSlots=${Number(slotsValue)}`
      );
      setSlotsEditingId(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to update slots");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-600 text-center">Loading…</div>
    );
  }

  if (user?.role !== "Backoffice") {
    return (
      <div className="p-6 text-red-600 font-medium text-center">
        Not authorized
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Charging Stations
        </h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring focus:ring-blue-200"
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow"
          >
            <FaPlus /> Add Station
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Station ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Slots</th>
              <th className="p-3">Location</th>
              <th className="p-3">Status</th>
              <th className="p-3">Operators</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((st) => (
              <tr key={st.stationId} className="border-b hover:bg-gray-50">
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
                        onChange={(e) =>
                          setSlotsValue(Number(e.target.value))
                        }
                        className="w-20 border rounded px-2 py-1"
                      />
                      <button
                        onClick={() => saveSlots(st)}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditSlots}
                        className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
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
                  <div className="text-[11px] sm:text-xs text-gray-600">
                    {st.latitude?.toFixed?.(5)}, {st.longitude?.toFixed?.(5)}
                  </div>
                  <div className="text-gray-700 truncate max-w-[200px] sm:max-w-none">
                    {st.address}
                  </div>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-[11px] sm:text-xs font-semibold ${
                      st.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {st.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3">
                  {(st.operatorUserIds || []).length === 0 ? (
                    <span className="text-gray-400 text-[11px] sm:text-xs">
                      None
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {st.operatorUserIds.map((id) => {
                        const op = operators.find((o) => o.id === id);
                        return (
                          <span
                            key={id}
                            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] sm:text-xs"
                          >
                            {op ? op.username : id}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => openEdit(st)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-[11px] sm:text-sm"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(st)}
                    className={`inline-flex items-center gap-1 px-3 py-1 text-white rounded text-[11px] sm:text-sm ${
                      st.isActive
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {st.isActive ? <FaToggleOff /> : <FaToggleOn />}{" "}
                    {st.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(st.stationId)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-[11px] sm:text-sm"
                  >
                    <FaTrash /> Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="p-6 text-center text-gray-500 text-sm"
                >
                  No stations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-lg overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {editing ? "Edit Station" : "Add Station"}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700 text-xl"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Search + Map picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-2">
                    Search Location
                  </label>
                  <input
                    ref={inputRef}
                    placeholder="Search for a place…"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2 h-64 rounded-lg overflow-hidden shadow border">
                  <Map
                    // re-mount map when switching between new/edit to get fresh center
                    key={`${editing ? form.stationId : "new"}-${selectedPos?.lat ?? "init"}-${selectedPos?.lng ?? "init"}`}
                    defaultCenter={{
                      lat: selectedPos?.lat || Number(form.latitude) || 6.9271,
                      lng: selectedPos?.lng || Number(form.longitude) || 79.8612,
                    }}
                    defaultZoom={selectedPos ? 14 : 10}
                    onClick={(e) => {
                      const lat = e.detail.latLng.lat;
                      const lng = e.detail.latLng.lng;
                      setForm((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                      }));
                      setSelectedPos({ lat, lng });
                    }}
                    mapId="station-map"
                    style={{ width: "100%", height: "100%" }}
                  >
                    {selectedPos && <AdvancedMarker position={selectedPos} />}
                  </Map>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Station ID
                  </label>
                  <input
                    name="stationId"
                    value={form.stationId}
                    onChange={onFormChange}
                    disabled={editing}
                    placeholder="ST1001"
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onFormChange}
                    placeholder="Kollupitiya Fast Charger"
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={form.latitude}
                    onChange={onFormChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="6.9056"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={form.longitude}
                    onChange={onFormChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="79.8520"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Address
                  </label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={onFormChange}
                    placeholder="123 Galle Rd, Colombo"
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={onFormChange}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="AC">AC</option>
                    <option value="DC">DC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Available Slots
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="availableSlots"
                    value={form.availableSlots}
                    onChange={onFormChange}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Active
                  </label>
                  <select
                    name="isActive"
                    value={String(form.isActive)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isActive: e.target.value === "true",
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                {/* Operator multi-select */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-2">
                    Assign Operators
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 border rounded-lg">
                    {operators.length === 0 && (
                      <div className="text-gray-400 text-sm">
                        No active operators available
                      </div>
                    )}
                    {operators.map((op) => {
                      const checked = form.operatorUserIds.includes(op.id);
                      return (
                        <label
                          key={op.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition ${
                            checked
                              ? "bg-blue-50 border-blue-300"
                              : "hover:bg-gray-50"
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
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {editing ? "Save Changes" : "Create Station"}
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
 * Requires APIProvider libraries={['places']}
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
