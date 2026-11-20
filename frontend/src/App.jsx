import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import StudentManagement from "./pages/StudentManagement.jsx";
import Personnel from "./pages/Personnel.jsx";
import Scanner from "./pages/Scanner.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/students"
          element={<ProtectedRoute roles={["Admin"]}><StudentManagement /></ProtectedRoute>}
        />
        <Route
          path="/scanner"
          element={<ProtectedRoute roles={["Security"]}><Scanner /></ProtectedRoute>}
        />
        <Route
          path="/personnel"
          element={<ProtectedRoute roles={["Admin"]}><Personnel /></ProtectedRoute>}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
