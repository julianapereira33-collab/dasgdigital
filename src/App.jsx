import DasGCRM from './DasGCRMv4.jsx'
import AuthGate from './AuthGate.jsx'
import QuizPublico from './QuizPublico.jsx'

export default function App() {
  // Quiz da Consultoria Express: link público /?quiz=<token>, abre sem login
  const tokenQuiz = new URLSearchParams(window.location.search).get('quiz')
  if (tokenQuiz) return <QuizPublico token={tokenQuiz} />
  // Raio X do Estilo: link público /?raiox=<token>
  const tokenRaiox = new URLSearchParams(window.location.search).get('raiox')
  if (tokenRaiox) return <QuizPublico token={tokenRaiox} modo="raiox" />
  return (
    <AuthGate>
      <DasGCRM />
    </AuthGate>
  )
}
