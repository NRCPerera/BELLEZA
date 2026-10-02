import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '16px',
              background: '#4B2638',
              color: '#FAF7F2',
              fontSize: '14px',
              fontFamily: 'DM Sans, system-ui, sans-serif',
              boxShadow: '0 18px 45px rgba(75, 38, 56, 0.22)',
            },
            success: {
              iconTheme: {
                primary: '#059669',
                secondary: '#FAF7F2',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#FAF7F2',
              },
            },
          }}
        />
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
)
