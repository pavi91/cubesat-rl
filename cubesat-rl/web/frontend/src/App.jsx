import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import Compare from './pages/Compare';
import ModelExplorer from './pages/ModelExplorer';
import About from './pages/About';
import History from './pages/History';
import Login from './pages/Login';
import MissionPlanner from './pages/MissionPlanner';

// Wrapper that redirects unauthenticated users to /login
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for token check
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"         element={<Dashboard />} />
        <Route path="/simulate" element={<Simulator />} />
        <Route path="/compare"  element={<Compare />} />
        <Route path="/model"    element={<ModelExplorer />} />
        <Route path="/about"    element={<About />} />
        <Route path="/history"  element={<History />} />
        {/* Protected routes */}
        <Route path="/missions" element={
          <ProtectedRoute><MissionPlanner /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
