import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/home/Home.jsx'
import Login from './pages/authentication/Login.jsx'
import Signup from './pages/authentication/Signup.jsx'
import Profile from './pages/profile/Profile.jsx'
import UserProfile from './pages/profile/UserProfile.jsx'
import { store } from './store/store.js'
import { Provider } from 'react-redux'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { injectStore } from './components/utilities/axiosinstance.js'
import { ThemeProvider } from './context/ThemeContext.jsx'

injectStore(store);

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
    path: '/profile/:userId',
    element:
    (<ProtectedRoute>
      <UserProfile />
    </ProtectedRoute>)
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  }
])

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider>
      <App />
      <RouterProvider router={router} />
    </ThemeProvider>
  </Provider>
)