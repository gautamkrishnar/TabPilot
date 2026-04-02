import { Route, Routes } from 'react-router-dom';
import { CreateSession } from '@/pages/CreateSession';
import { Home } from '@/pages/Home';
import { HostDashboard } from '@/pages/HostDashboard';
import { HostJoin } from '@/pages/HostJoin';
import { JoinSession } from '@/pages/JoinSession';
import { NotFound } from '@/pages/NotFound';
import { ParticipantView } from '@/pages/ParticipantView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateSession />} />
      <Route path="/join" element={<JoinSession />} />
      <Route path="/host/:sessionId" element={<HostDashboard />} />
      <Route path="/host/join/:sessionId" element={<HostJoin />} />
      <Route path="/session/:sessionId" element={<ParticipantView />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
