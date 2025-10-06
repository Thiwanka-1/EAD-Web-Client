// src/pages/operator/OperatorDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api.js";
import { jwtDecode } from "jwt-decode";
import { FaBolt, FaCheck, FaPlay, FaStop } from "react-icons/fa";

const STATUS_COLORS = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  InProgress: "bg-blue-100 text-blue-800",
  Completed: "bg-gray-200 text-gray-700",
  Cancelled: "bg-gray-100 text-gray-500",
};
const Badge = ({ status }) => (
  <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}>
    {status}
  </span>
);

const fmt = (dt) => {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d)) return "-";
  return d.toLocaleString();
};

export default function OperatorDashboard() {
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [slotsDraft, setSlotsDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [qrFor, setQrFor] = useState(null); // {id, code}
  const [toast, setToast] = useState(null);

  // derive operator userId from token (NameIdentifier/sub)
  const token = localStorage.getItem("token");
  const userId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      // try a few claim names your backend might use
      return (
        decoded?.nameid ||
        decoded?.nameId ||
        decoded?.sub ||
        decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
        null
      );
    } catch {
      return null;
    }
  }, [token]);

  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const tomorrowLocal = new Date(todayLocal);
  tomorrowLocal.setDate(todayLocal.getDate() + 1);

  const load = async () => {
    setLoading(true);
    try {
      // load all stations and keep only assigned to this operator
      const stRes = await api.get("/stations");
      const all = stRes.data || [];
      const mine = userId
        ? all.filter((s) => (s.operatorUserIds || []).includes(userId))
        : [];

      setStations(mine);

      // gather bookings for each station
      const allBookings = [];
      for (const st of mine) {
        const bRes = await api.get(`/bookings/station/${st.stationId}`);
        const bs = bRes.data || [];
        allBookings.push(...bs);
      }
      setBookings(allBookings);
    } catch (e) {
      console.error(e);
      setToast({ type: "error", msg: "Failed to load stations/bookings" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const todaysBookings = useMemo(() => {
    return bookings.filter((b) => {
      const s = new Date(b.startTimeUtc);
      const e = new Date(b.endTimeUtc);
      return s < tomorrowLocal && e > todayLocal; // overlaps today
    });
  }, [bookings, todayLocal, tomorrowLocal]);

  const kpis = useMemo(() => {
    const totalStations = stations.length;
    const todayCount = todaysBookings.length;
    const inProgress = todaysBookings.filter((b) => b.status === "InProgress")
      .length;
    const pending = todaysBookings.filter((b) => b.status === "Pending").length;
    return { totalStations, todayCount, inProgress, pending };
  }, [stations, todaysBookings]);

  const saveSlots = async (station) => {
    const val = Number(slotsDraft[station.stationId]);
    if (Number.isNaN(val) || val < 0) {
      setToast({ type: "error", msg: "Slots must be a non-negative number" });
      return;
    }
    try {
      setSavingId(station.stationId);
      await api.patch(`/stations/${station.stationId}/slots?availableSlots=${val}`);
      setToast({ type: "success", msg: "Slots updated" });
      await load();
    } catch (e) {
      console.error(e);
      setToast({ type: "error", msg: "Failed to update slots" });
    } finally {
      setSavingId(null);
    }
  };

  const startBooking = async (id, code) => {
    if (!code || !code.trim()) {
      setToast({ type: "error", msg: "QR code token is required" });
      return;
    }
    try {
      await api.patch(`/bookings/${id}/start`, { qrCode: code.trim() });
      setToast({ type: "success", msg: "Session started" });
      setQrFor(null);
      await load();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        "Failed to start session";
      setToast({ type: "error", msg: String(msg) });
    }
  };

  const completeBooking = async (id) => {
    try {
      await api.patch(`/bookings/${id}/complete`);
      setToast({ type: "success", msg: "Session completed" });
      await load();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        "Failed to complete session";
      setToast({ type: "error", msg: String(msg) });
    }
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">My Stations</div>
          <div className="text-2xl font-bold mt-1">{kpis.totalStations}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Bookings Today</div>
          <div className="text-2xl font-bold mt-1">{kpis.todayCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold mt-1">{kpis.inProgress}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold mt-1">{kpis.pending}</div>
        </div>
      </div>

      {/* My Stations */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FaBolt /> My Stations
          </h2>
        </div>

        {stations.length === 0 ? (
          <div className="text-gray-500 text-sm">No stations assigned.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {stations.map((s) => (
              <div key={s.stationId} className="border rounded-lg p-4">
                <div className="font-semibold">
                  {s.name}{" "}
                  <span className="text-gray-400 text-xs">({s.stationId})</span>
                </div>
                <div className="text-xs text-gray-500">
                  {s.type} • {s.address}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm text-gray-600">Available Slots</label>
                  <input
                    type="number"
                    min="0"
                    defaultValue={s.availableSlots}
                    onChange={(e) =>
                      setSlotsDraft((d) => ({
                        ...d,
                        [s.stationId]: e.target.value,
                      }))
                    }
                    className="w-24 border rounded px-2 py-1"
                  />
                  <button
                    onClick={() => saveSlots(s)}
                    disabled={savingId === s.stationId}
                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingId === s.stationId ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Bookings */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Today’s Bookings</h2>
        </div>

        {todaysBookings.length === 0 ? (
          <div className="text-gray-500 text-sm">No bookings today.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3">Owner NIC</th>
                  <th className="p-3">Station</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {todaysBookings
                  .sort(
                    (a, b) =>
                      new Date(a.startTimeUtc) - new Date(b.startTimeUtc)
                  )
                  .map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="p-3">{b.ownerNic}</td>
                      <td className="p-3">
                        {stations.find((s) => s.stationId === b.stationId)?.name ||
                          b.stationId}
                      </td>
                      <td className="p-3">{fmt(b.startTimeUtc)}</td>
                      <td className="p-3">{fmt(b.endTimeUtc)}</td>
                      <td className="p-3">
                        <Badge status={b.status} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {b.status === "Approved" && (
                            <>
                              <button
                                onClick={() =>
                                  setQrFor({ id: b.id, code: "" })
                                }
                                className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                title="Start (QR required)"
                              >
                                <FaPlay /> Start
                              </button>
                            </>
                          )}

                          {b.status === "InProgress" && (
                            <button
                              onClick={() => completeBooking(b.id)}
                              className="inline-flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                              title="Complete Session"
                            >
                              <FaCheck /> Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Start session dialog (QR input) */}
      {qrFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold">Start Session (QR)</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setQrFor(null)}
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-sm text-gray-600">
                Enter QR Code Token from owner’s app
              </label>
              <input
                value={qrFor.code}
                onChange={(e) =>
                  setQrFor((q) => ({ ...q, code: e.target.value }))
                }
                placeholder="e.g., a1b2c3d4..."
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setQrFor(null)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => startBooking(qrFor.id, qrFor.code)}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 bottom-4 z-[60] rounded-lg shadow px-4 py-3 text-sm ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-white"
          }`}
          onAnimationEnd={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
