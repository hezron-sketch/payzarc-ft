import { Navigate } from "react-router-dom";

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";

// Gates on token presence only — Dashboard.js validates the session for real
// via /api/dashboard on mount and bounces to login itself on failure/401.
function ProtectedRoute({ children }) {
  if (DEV_BYPASS_AUTH) return children;

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return <Navigate to="/components/member/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
