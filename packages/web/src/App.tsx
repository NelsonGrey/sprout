import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Route, Switch } from 'wouter';
import { firebaseClient } from './lib/firebase';
import { claimPendingStudentLinkIfAny } from './lib/firestore';
import { claimPendingInviteIfAny } from './lib/school';
import { DeleteAccountPage } from './features/auth/DeleteAccountPage';
import { LoginPage } from './features/auth/LoginPage';
import { LandingRouter } from './features/classroom/LandingRouter';
import { ClassroomDetailPage } from './features/classroom/ClassroomDetailPage';
import { CreateClassroomPage } from './features/classroom/CreateClassroomPage';
import { CreateStudentPage } from './features/classroom/CreateStudentPage';
import { RequestAccessPage } from './features/classroom/RequestAccessPage';
import { AccessRequestsPage } from './features/school/AccessRequestsPage';
import { AddStaffPage } from './features/school/AddStaffPage';
import { GradesOfferedPage } from './features/school/GradesOfferedPage';
import { SchoolPage } from './features/school/SchoolPage';
import { StaffPage } from './features/school/StaffPage';
import { StudentsPage } from './features/students/StudentsPage';
import { StudentImportPage } from './features/students/StudentImportPage';
import { PromoteStudentsPage } from './features/students/PromoteStudentsPage';
import { ArchiveStudentsPage } from './features/students/ArchiveStudentsPage';
import { Layout } from './components/layout/Layout';

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
        claimPendingStudentLinkIfAny({ uid: nextUser.uid, email: nextUser.email });
      }
    });
  }, []);

  if (loading) return null;
  if (!user) {
    return (
      <Layout user={null}>
        <LoginPage />
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <Switch>
        <Route path="/classrooms/new">
          <CreateClassroomPage user={user} />
        </Route>
        <Route path="/classrooms/:contextId/students/new">
          {(params) => <CreateStudentPage user={user} contextId={params.contextId} />}
        </Route>
        <Route path="/classrooms/:contextId/request-access">
          {(params) => <RequestAccessPage user={user} contextId={params.contextId} />}
        </Route>
        <Route path="/classrooms/:contextId/students/:studentId">
          {(params) => (
            <ClassroomDetailPage user={user} contextId={params.contextId} studentId={params.studentId} />
          )}
        </Route>
        <Route path="/classrooms/:contextId">
          {(params) => <ClassroomDetailPage user={user} contextId={params.contextId} />}
        </Route>
        <Route path="/school/staff/new">
          <AddStaffPage user={user} />
        </Route>
        <Route path="/school/staff/:uid">
          {(params) => <StaffPage user={user} selectedUid={params.uid} />}
        </Route>
        <Route path="/school/staff">
          <StaffPage user={user} />
        </Route>
        <Route path="/school/requests">
          <AccessRequestsPage user={user} />
        </Route>
        <Route path="/school/grades">
          <GradesOfferedPage user={user} />
        </Route>
        <Route path="/school">
          <SchoolPage user={user} />
        </Route>
        <Route path="/students/import">
          <StudentImportPage user={user} />
        </Route>
        <Route path="/students/promote">
          <PromoteStudentsPage user={user} />
        </Route>
        <Route path="/students/archive">
          <ArchiveStudentsPage user={user} />
        </Route>
        <Route path="/students">
          <StudentsPage user={user} />
        </Route>
        <Route path="/account/delete">
          <DeleteAccountPage user={user} />
        </Route>
        <Route path="/">
          <LandingRouter user={user} />
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;
