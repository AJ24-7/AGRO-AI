import { useEffect, useState } from "react";
import api from "../api/axios";
import DashboardCard from "../components/DashboardCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#2e7d32", "#66bb6a", "#a5d6a7", "#81c784", "#388e3c"];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/analytics/summary").then((r) => setData(r.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <DashboardCard title="Farms" value={data.total_farms} icon="🚜" />
        <DashboardCard title="Plots" value={data.total_plots} icon="🌾" />
        <DashboardCard title="Tractors" value={data.total_tractors} icon="🛻" />
        <DashboardCard title="Soil Reports" value={data.soil_reports} icon="🧪" />
        <DashboardCard title="Diseases" value={data.disease_detections} icon="🦠" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4 text-agro-dark">Crop Recommendations</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.crop_chart}>
              <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="count" fill="#2e7d32" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 text-agro-dark">Disease Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.disease_chart} dataKey="count" nameKey="name"
                   cx="50%" cy="50%" outerRadius={90} label>
                {data.disease_chart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend /><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
