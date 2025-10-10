import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import api from "../api/api.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { HiBolt } from "react-icons/hi2";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Show session expired message if redirected by interceptor
  useEffect(() => {
    if (localStorage.getItem("sessionExpired")) {
      setSessionExpired(true);
      localStorage.removeItem("sessionExpired");
    }
  }, []);

  // Simple client-side validation
  const fieldErrors = {
    username:
      touched.username && !username.trim()
        ? "Username is required."
        : null,
    password:
      touched.password && !password
        ? "Password is required."
        : touched.password && password.length < 6
        ? "Password must be at least 6 characters."
        : null,
  };

  const hasClientErrors = !!fieldErrors.username || !!fieldErrors.password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    setError(null);

    if (hasClientErrors) return;

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
      // 401 here is invalid creds, NOT session expired (interceptor handles that)
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
      {/* Left: form panel */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-white-50 to-white-200">
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

          {/* Server/submit error */}
          {error && (
            <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:outline-none ${
                  fieldErrors.username
                    ? "border-red-400 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="Enter username"
              />
              {fieldErrors.username && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.username}
                </p>
              )}
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
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  className={`w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:outline-none ${
                    fieldErrors.password
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Enter password"
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
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.password}
                </p>
              )}
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

          <p className="text-xs text-center text-gray-500 mt-2">
            © {new Date().getFullYear()} EV Charge Management System
          </p>
        </div>
      </div>

      {/* Right: hero image (hidden on mobile).
          Use a real image stored in /public/login-side.jpg. */}
      <div className="hidden md:block relative">
        {/* Prefer an <img> so we can detect load/error and avoid a blank half */}
        {imgOk ? (
          <img
            src="/login-side.jpg"
            alt="EV charging illustration"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          // Fallback when image fails (no blank white panel)
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
            <div className="text-white/90 text-center px-8">
              <div className="flex justify-center mb-3">
                <HiBolt className="w-10 h-10" />
              </div>
              <p className="text-lg font-semibold">Charge smarter</p>
              <p className="text-sm text-white/80">Secure backoffice access</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
