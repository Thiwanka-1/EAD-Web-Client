import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api.js";
import {
  FaCheck,
  FaTimes,
  FaFilter,
  FaSearch,
  FaInfoCircle,
  FaTrashAlt,
} from "react-icons/fa";

/** ---- Utilities ---- */
const STATUS_COLORS = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  InProgress: "bg-blue-100 text-blue-800",
  Completed: "bg-gray-200 text-gray-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function fmt(dt) {
  if (!dt) return "-";
  // dt is UTC string; Date() shows in local time automatically
  const d = new Date(dt);
  if (isNaN(d)) return "-";
  return d.toLocaleString(); // local time
}

/** Simple toast */
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

/** Modal wrapper */
function Modal({ title, children, onClose }) {
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

/** Confirm dialog */
function Confirm({ title = "Confirm", message, onCancel, onConfirm }) {
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
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

/** Approve/Reject dialog */
function Decision({ onClose, onSubmit }) {
  const [action, setAction] = useState("approve"); // approve | reject
  const [reason, setReason] = useState("");

  return (
    <Modal title="Approve or Reject" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="decision"
              value="approve"
              checked={action === "approve"}
              onChange={() => setAction("approve")}
            />
            <span>Approve</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="decision"
              value="reject"
              checked={action === "reject"}
              onChange={() => setAction("reject")}
            />
            <span>Reject</span>
          </label>
        </div>

        {action === "reject" && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Rejection reason (optional)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Overlapping bookings / maintenance"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSubmit(action === "approve", action === "reject" ? reason : "")
            }
            className={`px-4 py-2 rounded text-white ${
              action === "approve"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Details modal */
function BookingDetails({ booking, stationName, onClose }) {
  if (!booking) return null;
  return (
    <Modal title="Booking Details" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <div className="text-gray-500">Booking ID</div>
          <div className="font-medium break-all">{booking.id}</div>
        </div>
        <div>
          <div className="text-gray-500">Owner NIC</div>
          <div className="font-medium">{booking.ownerNic}</div>
        </div>
        <div>
          <div className="text-gray-500">Station</div>
          <div className="font-medium">
            {stationName || booking.stationId}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Status</div>
          <div className="mt-1">
            <StatusBadge status={booking.status} />
          </div>
        </div>
        <div>
          <div className="text-gray-500">Start</div>
          <div className="font-medium">{fmt(booking.startTimeUtc)}</div>
        </div>
        <div>
          <div className="text-gray-500">End</div>
          <div className="font-medium">{fmt(booking.endTimeUtc)}</div>
        </div>
        <div>
          <div className="text-gray-500">QR Code Token</div>
          <div className="font-mono text-[12px] break-all">
            {booking.qrCode || "-"}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Rejection Reason</div>
          <div className="text-[13px]">{booking.rejectionReason || "-"}</div>
        </div>
        <div>
          <div className="text-gray-500">Created</div>
          <div className="text-[13px]">{fmt(booking.createdUtc)}</div>
        </div>
        <div>
          <div className="text-gray-500">Updated</div>
          <div className="text-[13px]">{fmt(booking.updatedUtc)}</div>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        * Times shown in your local timezone.
      </p>
    </Modal>
  );
}

/** ---- Main Page ---- */
export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [stationId, setStationId] = useState("All");
  const [date, setDate] = useState(""); // YYYY-MM-DD

  // UI state
  const [selected, setSelected] = useState(null);
  const [decisionFor, setDecisionFor] = useState(null);
  const [confirmCancelFor, setConfirmCancelFor] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/stations"),
      ]);
      setBookings(bRes.data || []);
      setStations(sRes.data || []);
    } catch (e) {
      console.error(e);
      setToast({ msg: "Failed to load bookings/stations", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stationName = (id) =>
    stations.find((s) => s.stationId === id)?.name || id;

  const filtered = useMemo(() => {
    let list = [...bookings];

    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.ownerNic?.toLowerCase().includes(qq) ||
          b.stationId?.toLowerCase().includes(qq) ||
          stationName(b.stationId)?.toLowerCase().includes(qq) ||
          b.id?.toLowerCase().includes(qq)
      );
    }
    if (status !== "All") {
      list = list.filter((b) => b.status === status);
    }
    if (stationId !== "All") {
      list = list.filter((b) => b.stationId === stationId);
    }
    if (date) {
      // keep bookings that touch this date (local day)
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      list = list.filter((b) => {
        const s = new Date(b.startTimeUtc);
        const e = new Date(b.endTimeUtc);
        return s < end && e > start;
      });
    }

    // sort newest first
    list.sort(
      (a, b) =>
        new Date(b.createdUtc).getTime() - new Date(a.createdUtc).getTime()
    );
    return list;
  }, [bookings, q, status, stationId, date, stations]);

  const approveOrReject = async (bookingId, approve, reason) => {
    try {
      await api.patch(`/bookings/${bookingId}/approve`, {
        approve,
        reason: reason || "",
      });
      setToast({
        msg: approve ? "Booking approved." : "Booking rejected.",
        type: approve ? "success" : "info",
      });
      await load();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        "Failed to update booking";
      setToast({ msg: String(msg), type: "error" });
    } finally {
      setDecisionFor(null);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      await api.delete(`/bookings/${bookingId}`);
      setToast({ msg: "Booking cancelled.", type: "success" });
      await load();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        "Failed to cancel booking";
      setToast({ msg: String(msg), type: "error" });
    } finally {
      setConfirmCancelFor(null);
    }
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-600">Loading bookings…</div>
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header + Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Bookings Management
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Times are shown in your local timezone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search NIC, station, ID…"
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="All">All Statuses</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>InProgress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>

            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="All">All Stations</option>
              {stations.map((s) => (
                <option key={s.stationId} value={s.stationId}>
                  {s.name} ({s.stationId})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400 hidden sm:block" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                title="Filter by date"
              />
              {date && (
                <button
                  onClick={() => setDate("")}
                  className="text-xs text-blue-600 hover:underline"
                >
                  clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Booking ID</th>
              <th className="p-3">Owner NIC</th>
              <th className="p-3">Station</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{b.id}</td>
                <td className="p-3">{b.ownerNic}</td>
                <td className="p-3">
                  {stationName(b.stationId)}{" "}
                  <span className="text-gray-400 text-xs">({b.stationId})</span>
                </td>
                <td className="p-3">{fmt(b.startTimeUtc)}</td>
                <td className="p-3">{fmt(b.endTimeUtc)}</td>
                <td className="p-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelected(b)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                      title="Details"
                    >
                      <FaInfoCircle /> Details
                    </button>

                    {(b.status === "Pending" || b.status === "Approved") && (
                      <button
                        onClick={() => setDecisionFor(b)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        title="Approve / Reject"
                      >
                        <FaCheck /> / <FaTimes />
                      </button>
                    )}

                    {b.status !== "Cancelled" &&
                      b.status !== "Completed" && (
                        <button
                          onClick={() => setConfirmCancelFor(b)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                          title="Cancel booking"
                        >
                          <FaTrashAlt /> Cancel
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500 text-sm">
            No bookings found.
          </div>
        )}

        {filtered.map((b) => (
          <div key={b.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] break-all mr-2">{b.id}</div>
              <StatusBadge status={b.status} />
            </div>

            <div className="mt-3 text-sm space-y-1">
              <div>
                <span className="text-gray-500">Owner:</span> {b.ownerNic}
              </div>
              <div>
                <span className="text-gray-500">Station:</span>{" "}
                {stationName(b.stationId)}{" "}
                <span className="text-gray-400">({b.stationId})</span>
              </div>
              <div>
                <span className="text-gray-500">Start:</span>{" "}
                {fmt(b.startTimeUtc)}
              </div>
              <div>
                <span className="text-gray-500">End:</span>{" "}
                {fmt(b.endTimeUtc)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setSelected(b)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                <FaInfoCircle /> Details
              </button>

              {(b.status === "Pending" || b.status === "Approved") && (
                <button
                  onClick={() => setDecisionFor(b)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  <FaCheck /> / <FaTimes />
                </button>
              )}

              {b.status !== "Cancelled" && b.status !== "Completed" && (
                <button
                  onClick={() => setConfirmCancelFor(b)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  <FaTrashAlt /> Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {selected && (
        <BookingDetails
          booking={selected}
          stationName={stationName(selected.stationId)}
          onClose={() => setSelected(null)}
        />
      )}

      {decisionFor && (
        <Decision
          onClose={() => setDecisionFor(null)}
          onSubmit={(approve, reason) =>
            approveOrReject(decisionFor.id, approve, reason)
          }
        />
      )}

      {confirmCancelFor && (
        <Confirm
          title="Cancel Booking"
          message="Are you sure you want to cancel this booking? This cannot be undone."
          onCancel={() => setConfirmCancelFor(null)}
          onConfirm={() => cancelBooking(confirmCancelFor.id)}
        />
      )}

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
