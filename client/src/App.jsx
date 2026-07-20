import { Toaster } from 'react-hot-toast';

function App() {
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
