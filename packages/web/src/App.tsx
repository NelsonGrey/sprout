import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Route, Switch } from 'wouter';
import { firebaseClient } from './lib/firebase';
import { LoginPage } from './features/auth/LoginPage';
import { ClassroomsPage } from './features/classroom/ClassroomsPage';
import { ClassroomDetailPage } from './features/classroom/ClassroomDetailPage';
import { StudentLedgerPage } from './features/classroom/StudentLedgerPage';

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
  if (!user) return <LoginPage />;

  return (
    <Switch>
      <Route path="/classrooms/:contextId/students/:studentId">
        {(params) => (
          <StudentLedgerPage user={user} contextId={params.contextId} studentId={params.studentId} />
        )}
      </Route>
      <Route path="/classrooms/:contextId">
        {(params) => <ClassroomDetailPage user={user} contextId={params.contextId} />}
      </Route>
      <Route path="/">
        <ClassroomsPage user={user} />
      </Route>
    </Switch>
  );
}

export default App;
