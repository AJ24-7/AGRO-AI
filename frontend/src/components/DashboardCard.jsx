// Reusable stat card for dashboard
export default function DashboardCard({ title, value, icon, color = "bg-agro" }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      </div>
      <div className={`${color} text-white w-14 h-14 flex items-center justify-center rounded-3xl shadow-md`}>
        {icon}
      </div>
    </div>
  );
}
