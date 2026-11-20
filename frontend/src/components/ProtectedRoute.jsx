import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

// roles omitted = any signed-in staff member
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.staffRole)) return <Navigate to="/" replace />;
  return children;
}
