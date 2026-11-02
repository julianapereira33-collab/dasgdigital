import DasGCRM from './DasGCRMv4.jsx'
import AuthGate from './AuthGate.jsx'
export default function App() {
  return (
    <AuthGate>
      <DasGCRM />
    </AuthGate>
  )
}
