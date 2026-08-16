import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseClient } from './lib/firebase';
import { LoginPage } from './features/auth/LoginPage';
import { HomePage } from './features/home/HomePage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(firebaseClient.auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  if (loading) return null;
  return user ? <HomePage user={user} /> : <LoginPage />;
}

export default App;
