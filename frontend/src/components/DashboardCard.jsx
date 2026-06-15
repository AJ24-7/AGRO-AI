// Reusable stat card for dashboard
export default function DashboardCard({ title, value, icon, color = "bg-agro" }) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-3xl font-bold text-agro-dark">{value}</p>
      </div>
      <div className={`${color} text-white text-2xl w-12 h-12 flex items-center justify-center rounded-full`}>
        {icon}
      </div>
    </div>
  );
}
