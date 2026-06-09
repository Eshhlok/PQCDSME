import React, { useState, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";

// Eagerly loaded — needed immediately on first paint
import LoginPage from "./pages/LoginPage";
import { AcceptInvitePage } from "./pages/AcceptInvite";

// Lazy loaded — only fetched when the route is visited
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const ProductionPage  = lazy(() => import("./pages/ProductionPage"));
const QualityPage     = lazy(() => import("./pages/QualityPage"));
const CostPage        = lazy(() => import("./pages/CostPage"));
const DispatchPage    = lazy(() => import("./pages/DispatchPage"));
const SafetyPage      = lazy(() => import("./pages/SafetyPage"));
const MoralePage      = lazy(() => import("./pages/MoralePage"));
const EnvironmentPage = lazy(() => import("./pages/EnvironmentPage"));
const TargetsPage     = lazy(() => import("./pages/TargetPage"));
const AlertsPage      = lazy(() => import("./pages/AlertPage").then(m => ({ default: m.AlertsPage })));
const ReportPage = React.lazy(() => import("./pages/ReportPage"));


const PageLoader = () => (
  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
    Loading...
  </div>
);

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {session ? <Redirect to="/" /> : <LoginPage />}
      </Route>

      <Route path="/accept-invite" component={AcceptInvitePage} />

      <Route>
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex flex-col w-full">
            <Topbar onMenuClick={() => setSidebarOpen(true)} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 p-4 w-full">
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/production" component={ProductionPage} />
                  <Route path="/quality" component={QualityPage} />
                  <Route path="/cost" component={CostPage} />
                  <Route path="/dispatch" component={DispatchPage} />
                  <Route path="/safety" component={SafetyPage} />
                  <Route path="/morale" component={MoralePage} />
                  <Route path="/environment" component={EnvironmentPage} />
                  <Route path="/targets" component={TargetsPage} />
                  <Route path="/alerts" component={AlertsPage} />
                  <Route path="/report" component={ReportPage} />
                  <Route>
                    <div className="flex flex-col items-center justify-center pt-20">
                      <h1 className="text-2xl font-bold text-gray-900">404 - Not Found</h1>
                    </div>
                  </Route>
                </Switch>
              </Suspense>
            </main>
            <Footer />
          </div>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;