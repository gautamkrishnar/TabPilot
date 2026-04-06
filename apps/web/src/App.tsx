import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const CreateSession = lazy(() =>
  import('@/pages/CreateSession').then((m) => ({ default: m.CreateSession })),
);
const JoinSession = lazy(() =>
  import('@/pages/JoinSession').then((m) => ({ default: m.JoinSession })),
);
const HostDashboard = lazy(() =>
  import('@/pages/HostDashboard').then((m) => ({ default: m.HostDashboard })),
);
const HostJoin = lazy(() => import('@/pages/HostJoin').then((m) => ({ default: m.HostJoin })));
const ParticipantView = lazy(() =>
  import('@/pages/ParticipantView').then((m) => ({ default: m.ParticipantView })),
);
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateSession />} />
        <Route path="/join" element={<JoinSession />} />
        <Route path="/host/:sessionId" element={<HostDashboard />} />
        <Route path="/host/join/:sessionId" element={<HostJoin />} />
        <Route path="/session/:sessionId" element={<ParticipantView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
