import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/home/Home.jsx'
import Login from './pages/authentication/Login.jsx'
import Signup from './pages/authentication/Signup.jsx'
import VerifyEmail from './pages/authentication/VerifyEmail.jsx'
import ForgotPassword from './pages/authentication/ForgotPassword.jsx'
import Profile from './pages/profile/Profile.jsx'
import { store } from './store/store.js'
import { Provider } from 'react-redux'
import ProtectedRoute from './components/ProtectedRoute.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element:
    (<ProtectedRoute>
      <Home />
    </ProtectedRoute>)
  },
  {
    path: '/profile',
    element:
    (<ProtectedRoute>
      <Profile />
    </ProtectedRoute>)
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />
  }
])

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
    <RouterProvider router={router} />
  </Provider>
)