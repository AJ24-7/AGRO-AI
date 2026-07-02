import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Farms from "./pages/Farms";
import SoilAnalysis from "./pages/SoilAnalysis";
import CropRecommend from "./pages/CropRecommend";
import Disease from "./pages/Disease";
import Fertilizer from "./pages/Fertilizer";
import Equipment from "./pages/Equipment";
import Notifications from "./pages/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Assistant from "./pages/Assistant";
import { useAuth } from "./context/AuthContext";

function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/farms" element={<Layout><Farms /></Layout>} />
        <Route path="/soil" element={<Layout><SoilAnalysis /></Layout>} />
        <Route path="/crop" element={<Layout><CropRecommend /></Layout>} />
        <Route path="/disease" element={<Layout><Disease /></Layout>} />
        <Route path="/fertilizer" element={<Layout><Fertilizer /></Layout>} />
        <Route path="/tractors" element={<Layout><Equipment /></Layout>} />
        <Route path="/equipment" element={<Layout><Equipment /></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
        <Route path="/assistant" element={<Layout><Assistant /></Layout>} />
      </Route>
    </Routes>
  );
}
