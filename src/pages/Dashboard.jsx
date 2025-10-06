import React, { useEffect, useState } from "react";
import api from "../api/api.js";
import {
  UsersIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

export default function Dashboard() {
  const [stats, setStats] = useState({
    users: 0,
    owners: 0,
    stations: 0,
    bookings: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, ownersRes, stationsRes, bookingsRes] = await Promise.all([
          api.get("/users"),
          api.get("/evowners"),
          api.get("/stations"),
          api.get("/bookings"),
        ]);

        const allBookings = bookingsRes.data;
        const pendingCount = allBookings.filter((b) => b.status === "Pending").length;

        setStats({
          users: usersRes.data.length,
          owners: ownersRes.data.length,
          stations: stationsRes.data.length,
          bookings: allBookings.length,
          pending: pendingCount,
        });
      } catch (err) {
        console.error("Error fetching stats", err);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { title: "Backoffice/Operators", value: stats.users, icon: UsersIcon, color: "bg-blue-500" },
    { title: "EV Owners", value: stats.owners, icon: UserGroupIcon, color: "bg-green-500" },
    { title: "Stations", value: stats.stations, icon: BuildingOffice2Icon, color: "bg-yellow-500" },
    { title: "Total Bookings", value: stats.bookings, icon: ClipboardDocumentListIcon, color: "bg-purple-500" },
    { title: "Pending Approvals", value: stats.pending, icon: ClipboardDocumentListIcon, color: "bg-red-500" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white shadow rounded-lg p-5 flex items-center space-x-4"
          >
            <div className={`${card.color} p-3 rounded-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{card.title}</p>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
