import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { AppLayout } from './components/AppLayout';
import { Loading } from './components/ui';

// Public site
import Home from './pages/public/Home';
const Mission = lazy(() => import('./pages/public/Mission'));
const PolicyLibrary = lazy(() => import('./pages/public/PolicyLibrary'));
const HowItWorks = lazy(() => import('./pages/public/HowItWorks'));
const NetworkMap = lazy(() => import('./pages/public/NetworkMap'));
const PublicLibrary = lazy(() => import('./pages/public/PublicLibrary'));
const PublicRecord = lazy(() => import('./pages/public/PublicRecord'));
const Reports = lazy(() => import('./pages/public/Reports'));
const Join = lazy(() => import('./pages/public/Join'));
const About = lazy(() => import('./pages/public/About'));
const Safeguarding = lazy(() => import('./pages/public/Safeguarding'));
const Contact = lazy(() => import('./pages/public/Contact'));
const SignIn = lazy(() => import('./pages/public/SignIn'));
const GuardianConsent = lazy(() => import('./pages/public/GuardianConsent'));
const WaitingConsent = lazy(() => import('./pages/public/WaitingConsent'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const Ranking = lazy(() => import('./pages/public/Ranking'));

// Member app
const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const Projects = lazy(() => import('./pages/app/Projects'));
const NewProject = lazy(() => import('./pages/app/NewProject'));
const ProjectWorkspace = lazy(() => import('./pages/app/project/ProjectWorkspace'));
const QuickLog = lazy(() => import('./pages/app/QuickLog'));
const Metrics = lazy(() => import('./pages/app/Metrics'));
const Kiosk = lazy(() => import('./pages/app/Kiosk'));
const Library = lazy(() => import('./pages/app/Library'));
const RecordView = lazy(() => import('./pages/app/RecordView'));
const RecordEditor = lazy(() => import('./pages/app/RecordEditor'));
const Network = lazy(() => import('./pages/app/Network'));
const ThreadView = lazy(() => import('./pages/app/ThreadView'));
const Governance = lazy(() => import('./pages/app/Governance'));
const PolicyEditor = lazy(() => import('./pages/app/PolicyEditor'));
const Handover = lazy(() => import('./pages/app/Handover'));
const AppReports = lazy(() => import('./pages/app/AppReports'));
const CohortReport = lazy(() => import('./pages/app/CohortReport'));
const MySchool = lazy(() => import('./pages/app/MySchool'));
const Steward = lazy(() => import('./pages/app/Steward'));
const PartnerDesk = lazy(() => import('./pages/app/PartnerDesk'));
const AuditDesk = lazy(() => import('./pages/app/AuditDesk'));
const Connections = lazy(() => import('./pages/app/Connections'));
const Settings = lazy(() => import('./pages/app/Settings'));

export default function App() {
  return (
    <Suspense fallback={<div className="p-10"><Loading /></div>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="mission" element={<Mission />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="network" element={<NetworkMap />} />
          <Route path="library" element={<PublicLibrary />} />
          <Route path="library/:id" element={<PublicRecord />} />
          <Route path="policies" element={<PolicyLibrary />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/pilot-01" element={<CohortReport publicView />} />
          <Route path="join" element={<Join />} />
          <Route path="about" element={<About />} />
          <Route path="safeguarding" element={<Safeguarding />} />
          <Route path="contact" element={<Contact />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="consent/:token" element={<GuardianConsent />} />
          <Route path="waiting-for-consent" element={<WaitingConsent />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="kiosk/:orgId" element={<Kiosk />} />
        <Route path="app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<NewProject />} />
          <Route path="projects/:id" element={<ProjectWorkspace />} />
          <Route path="log" element={<QuickLog />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="library" element={<Library />} />
          <Route path="library/:id" element={<RecordView />} />
          <Route path="records/:id/edit" element={<RecordEditor />} />
          <Route path="network" element={<Network />} />
          <Route path="network/thread/:id" element={<ThreadView />} />
          <Route path="connections" element={<Connections />} />
          <Route path="governance" element={<Governance />} />
          <Route path="governance/policy/:id" element={<PolicyEditor />} />
          <Route path="handover" element={<Handover />} />
          <Route path="reports" element={<AppReports />} />
          <Route path="reports/cohort" element={<CohortReport />} />
          <Route path="school" element={<MySchool />} />
          <Route path="steward" element={<Steward />} />
          <Route path="partner" element={<PartnerDesk />} />
          <Route path="audit" element={<AuditDesk />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
