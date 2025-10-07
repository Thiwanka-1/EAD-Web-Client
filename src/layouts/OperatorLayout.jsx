// src/layouts/OperatorLayout.jsx
import React, { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { FaBars, FaUser, FaHome, FaSignOutAlt } from "react-icons/fa";

export default function OperatorLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const navLink =
    "flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 text-gray-700";
  const navActive =
    "bg-blue-600 text-white hover:bg-blue-600";

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 border-b px-4 flex items-center justify-between">
          <div className="font-bold text-lg">Operator Console</div>
          <button
            className="md:hidden text-gray-500"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="p-3 space-y-1">
          <NavLink
            to="/op"
            end
            className={({ isActive }) =>
              `${navLink} ${isActive ? navActive : ""}`
            }
          >
            <FaHome /> <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/op/profile"
            className={({ isActive }) =>
              `${navLink} ${isActive ? navActive : ""}`
            }
          >
            <FaUser /> <span>My Profile</span>
          </NavLink>
        </nav>

        <div className="absolute bottom-0 w-full p-3 border-t">
          <div className="px-3 py-2 text-sm text-gray-600">
            <div className="font-semibold">{user?.username}</div>
            <div className="text-xs">{user?.role}</div>
          </div>
          <button
            onClick={doLogout}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-64">
        <header className="h-16 bg-white shadow flex items-center justify-between px-4">
          <button
            className="md:hidden text-gray-700"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <FaBars />
          </button>
          <div className="font-semibold">Welcome, Operator {user?.username}</div>
          <div />
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
