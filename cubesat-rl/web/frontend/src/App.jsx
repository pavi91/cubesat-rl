import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import Compare from './pages/Compare';
import ModelExplorer from './pages/ModelExplorer';
import About from './pages/About';
import History from './pages/History';

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/"         element={<Dashboard />} />
        <Route path="/simulate" element={<Simulator />} />
        <Route path="/compare"  element={<Compare />} />
        <Route path="/model"    element={<ModelExplorer />} />
        <Route path="/history"  element={<History />} />
        <Route path="/about"    element={<About />} />
      </Routes>
    </Router>
  );
}
