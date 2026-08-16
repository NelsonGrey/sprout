import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Route, Switch } from 'wouter';
import { firebaseClient } from './lib/firebase';
import { claimPendingInviteIfAny } from './lib/school';
import { LoginPage } from './features/auth/LoginPage';
import { ClassroomsPage } from './features/classroom/ClassroomsPage';
import { ClassroomDetailPage } from './features/classroom/ClassroomDetailPage';
import { StudentLedgerPage } from './features/classroom/StudentLedgerPage';
import { SchoolPage } from './features/school/SchoolPage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(firebaseClient.auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      // No-op unless an admin invited this exact email — activates the
      // access they configured (see plan's "Invite-and-Claim Flow").
      if (nextUser?.email) {
        claimPendingInviteIfAny({
          uid: nextUser.uid,
          email: nextUser.email,
          displayName: nextUser.displayName,
        });
      }
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
      <Route path="/school">
        <SchoolPage user={user} />
      </Route>
      <Route path="/">
        <ClassroomsPage user={user} />
      </Route>
    </Switch>
  );
}

export default App;
