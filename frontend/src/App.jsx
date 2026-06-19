import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import UploadLog from "./pages/UploadLog";
import Investigate from "./pages/Investigate";
import Navbar from "./components/Navbar";
import ChatOps from "./pages/ChatOps";
import History from "./pages/History";
import Login from "./pages/Login";

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Unprotected Auth Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Application Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <UploadLog />
          </ProtectedRoute>
        } />
        <Route path="/investigate" element={
          <ProtectedRoute>
            <Investigate />
          </ProtectedRoute>
        } />
        <Route path="/chatops" element={
          <ProtectedRoute>
            <ChatOps />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;