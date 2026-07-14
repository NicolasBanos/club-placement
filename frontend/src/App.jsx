import { useState, useEffect } from 'react'
import api from './api/axios'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    api.get('/')
      .then(response => setMessage(response.data.message))
      .catch(error => setMessage('Error connecting to backend'))
  }, [])

  return (
    <div>
      <h1>ClubsForKids</h1>
      <p>Backend says: {message}</p>
    </div>
  )
}

export default App