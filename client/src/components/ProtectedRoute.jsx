import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

// ProtectedRoute gates access to authenticated pages.
//
// Three-state logic:
//   1. screenLoading=true  → render null (spinner-free blank) while we wait
//      for getUserProfileThunk to complete on app startup. This prevents any
//      flash of protected content before authentication is confirmed.
//   2. isAuthenticated=false → replace-navigate to /login. Using <Navigate
//      replace> removes the protected route from history so Back button cannot
//      return the user to an authenticated page after logout / account deletion.
//   3. isAuthenticated=true  → render children normally.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, screenLoading } = useSelector(
    (state) => state.userReducer
  );

  if (screenLoading) {
    // Return null while the auth check is in flight.
    // ProtectedRoute must never render children until authentication is
    // confirmed — this prevents the brief flash of the dashboard that was
    // visible before the previous useEffect-based navigate fired.
    return null;
  }

  if (!isAuthenticated) {
    // replace=true ensures this navigation replaces the history entry, so the
    // user cannot press Back to get back to the protected page after logout
    // or account deletion.
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
