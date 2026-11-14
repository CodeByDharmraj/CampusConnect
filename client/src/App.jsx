import AppProviders from './app/AppProviders.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

function App() {
  return (
    <AppProviders>
      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </AppProviders>
  )
}

export default App
