import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar     from './components/Navbar';
import Login      from './pages/Login';
import Welcome from './pages/Welcome';
import Simulator  from './pages/Simulator';
import SimulationScenarios from './pages/SimulationScenarios';
import Dashboard  from './pages/Dashboard';
import RoleManager from './pages/RoleManager';
import BackupData from './pages/BackupData';

function ProtectedLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/welcome" element={<ProtectedLayout><Welcome /></ProtectedLayout>} />
      <Route path="/simulator" element={<ProtectedLayout><Simulator /></ProtectedLayout>} />
      <Route path="/simulator/scenarios" element={<ProtectedLayout><SimulationScenarios /></ProtectedLayout>} />
      <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/roles"     element={<ProtectedLayout><RoleManager /></ProtectedLayout>} />
      <Route path="/backup"    element={<ProtectedLayout><BackupData /></ProtectedLayout>} />
      <Route path="*"          element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
