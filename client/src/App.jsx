import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getUserProfileThunk } from './store/slice/user/user.thunk';

// App is rendered outside the RouterProvider so it is always mounted
// regardless of the current route. This is the correct place to kick off
// the one-time authentication check on app startup.
//
// Flow on cold start:
//   1. Redux initialState: screenLoading=true, isAuthenticated=false
//   2. getUserProfileThunk fires here immediately.
//   3. ProtectedRoute (on any protected path) renders null while screenLoading=true.
//   4a. If the server returns a valid profile → fulfilled: isAuthenticated=true,
//       screenLoading=false → ProtectedRoute renders children.
//   4b. If the server returns 401 (no cookie / deleted user / expired token)
//       → rejected: screenLoading=false, isAuthenticated=false
//       → axios 401 interceptor also dispatches resetAuthState()
//       → ProtectedRoute renders <Navigate to="/login" replace />.
//
// This means Home.jsx no longer needs its own getUserProfileThunk() call on
// mount. The call in Home.jsx is harmless but redundant; the auth state will
// already be resolved by the time Home renders.
function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getUserProfileThunk());
  }, []);

  return (
    <div>
      <div className="app-bg" />
      <div className="ambient-blur-right" />
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(20, 20, 30, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#f1f1f6',
            borderRadius: '14px',
            padding: '14px 20px',
            fontSize: '0.875rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#6366F1', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />
    </div>
  )
}

export default App
