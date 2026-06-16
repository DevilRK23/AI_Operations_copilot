import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import UploadLog from "./pages/UploadLog";
import Investigate from "./pages/Investigate";
import Navbar from "./components/Navbar";
import ChatOps from "./pages/ChatOps";
import History from "./pages/History";

function App() {
  return (
    
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadLog />} />
        <Route path="/investigate" element={<Investigate />} />
        <Route path="/chatops" element={<ChatOps />} />
        <Route path="/history"element={<History />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;