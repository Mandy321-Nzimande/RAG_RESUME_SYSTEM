import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from '@/components/layout/AppShell';
import { ChatPage } from '@/pages/ChatPage';
import { UploadPage } from '@/pages/UploadPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1e1e28', color: '#f1f1f5', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />
      <AppShell>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
