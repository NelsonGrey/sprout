import type { User } from 'firebase/auth';
import { Route, Switch } from 'wouter';
import { AudiencePage } from './AudiencePage';
import { CurriculumPage } from './CurriculumPage';
import { LessonPage } from './LessonPage';
import {
  CookiesPage,
  PrivacyPage,
  SupportPage,
  TermsPage,
} from './LegalPages';
import { MarketingHomePage } from './MarketingHomePage';
import { MarketingLayout } from './MarketingLayout';
import { ReadinessPage } from './ReadinessPage';
import { audiences, getLesson } from './content';

export function MarketingRoutes({ user }: { user: User | null }) {
  return (
    <MarketingLayout user={user}>
      <Switch>
        <Route path="/welcome">
          <MarketingHomePage />
        </Route>
        <Route path="/curriculum/:slug">
          {params => {
            const lesson = getLesson(params.slug);
            return lesson ? <LessonPage lesson={lesson} /> : <CurriculumPage />;
          }}
        </Route>
        <Route path="/curriculum">
          <CurriculumPage />
        </Route>
        <Route path="/readiness">
          <ReadinessPage />
        </Route>
        <Route path="/privacy">
          <PrivacyPage />
        </Route>
        <Route path="/terms">
          <TermsPage />
        </Route>
        <Route path="/cookies">
          <CookiesPage />
        </Route>
        <Route path="/support">
          <SupportPage />
        </Route>
        {audiences.map(audience => (
          <Route key={audience.slug} path={`/${audience.slug}`}>
            <AudiencePage audience={audience} />
          </Route>
        ))}
        <Route>
          <MarketingHomePage />
        </Route>
      </Switch>
    </MarketingLayout>
  );
}
