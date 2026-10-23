import { Navigate } from "react-router-dom";

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";

function ProtectedRoute({ children }) {
  if (DEV_BYPASS_AUTH) return children;

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
