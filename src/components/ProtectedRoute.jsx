// // src/components/ProtectedRoute.jsx
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axiosInstance from '../utility/axiosInstance'; // Adjust path if needed

// function ProtectedRoute({ children }) {
//   const navigate = useNavigate();
//   const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking
//   const DEV_BYPASS_AUTH = true;

//   // useEffect(() => {
//   //   //   // development bypass for easier testing - remove in production!
//   //   if (DEV_BYPASS_AUTH) {
//   //     setIsAuthenticated(true);
//   //     return;
//   //   }

//   //   const checkAuth = async () => {
//   //     const token = localStorage.getItem('accessToken');

//   //     // No token → immediately redirect
//   //     if (!token) {
//   //       localStorage.removeItem('accessToken');
//   //       localStorage.removeItem('user');
//   //       navigate('/components/member/login', { replace: true });
//   //       return;
//   //     }

//   //     try {
//   //       // Validate token by calling a protected endpoint
//   //       // This will also trigger your refresh interceptor if needed
//   //       await axiosInstance.get('/api/dashboard');
//   //       setIsAuthenticated(true);
//   //     } catch (err) {
//   //       // Any error (401, network, etc.) → invalid session
//   //       console.error('Authentication failed:', err);
//   //       localStorage.removeItem('accessToken');
//   //       localStorage.removeItem('user');
//   //       navigate('/components/member/login', { replace: true });
//   //     }
//   //   };

//   //   checkAuth();
//   // }, [navigate]);

//   try {
//     setIsAuthenticated(true);
//     return;
//   } catch (err) {
//   }

//   // Show a clean loader while checking (customize style as needed)
//   if (isAuthenticated === null) {
//     return (
//       <div style={{
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         justifyContent: 'center',
//         height: '100vh',
//         backgroundColor: '#f8fafc'
//       }}>
//         <img src="/images/payzarc.png" alt="Payzarc" style={{ width: '120px', marginBottom: '20px' }} />
//         <p>Loading your dashboard...</p>
//       </div>
//     );
//   }

//   // Only render children (Dashboard) if authenticated
//   return isAuthenticated ? children : null;
// }

// export default ProtectedRoute;
function ProtectedRoute({ children }) {
  const DEV_BYPASS_AUTH = true;

  if (DEV_BYPASS_AUTH) {
    return children;
  }

  // normal auth logic here
}
