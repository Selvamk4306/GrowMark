import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SalesEntry } from './pages/SalesEntry';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { HealthScore } from './pages/HealthScore';
import { GrowthTips } from './pages/GrowthTips';
import { Profile } from './pages/Profile';
import { ManageItems } from './pages/ManageItems';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { DailyAnalysis } from './pages/DailyAnalysis';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfUse } from './pages/TermsOfUse';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="sales" element={<SalesEntry />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="health" element={<HealthScore />} />
              <Route path="tips" element={<GrowthTips />} />
              <Route path="profile" element={<Profile />} />
              <Route path="items" element={<ManageItems />} />
              <Route path="daily-analysis" element={<DailyAnalysis />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="terms-of-use" element={<TermsOfUse />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

