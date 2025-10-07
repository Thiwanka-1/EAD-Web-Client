import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import api from "../api/api.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Show session expired message if redirected by interceptor
  useEffect(() => {
    if (localStorage.getItem("sessionExpired")) {
      setSessionExpired(true);
      localStorage.removeItem("sessionExpired");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { username, password });
      const token = res.data?.accessToken;
      const role = res.data?.role;
      const loggedInUser = res.data?.username;

      if (!token) throw new Error("No token received from server");

      login({ token, role, username: loggedInUser });
      if (role === "Backoffice") {
      navigate("/dashboard");
    } else if (role === "Operator") {
      navigate("/op");
    } else {
      navigate("/login");
    }
    } catch (err) {
      // 401 here is invalid creds, NOT session expired (we handled that in interceptor)
      const msg =
        err?.response?.status === 401
          ? "Invalid username or password."
          : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 to-blue-200">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <h2 className="text-3xl font-extrabold text-center text-blue-700">
            ⚡ EV Charge Backoffice
          </h2>
          <p className="text-center text-gray-500 text-sm">
            Sign in to manage stations, users, and bookings.
          </p>

          {/* Session expired notice */}
          {sessionExpired && (
            <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded-lg">
              Your session has expired. Please sign in again.
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter username"
                required
              />
            </div>

            {/* Password with toggle */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <p className="text-xs text-center text-gray-500 mt-2">
            © {new Date().getFullYear()} EV Charge Management System
          </p>
        </div>
      </div>

      {/* Right: hero image (hidden on mobile) */}
      <div
        className="hidden md:block bg-cover bg-center"
        // Replace with your own image in /public and use: bg-[url('/login-side.jpg')]
        style={{
          backgroundImage:
            "url('https://www.freepik.com/free-vector/electric-car-background_3515205.htm#fromView=search&page=1&position=28&uuid=de04df9e-e09f-46a3-9495-68767c73d4a1&query=ev+')",
        }}
      />
    </div>
  );
}
