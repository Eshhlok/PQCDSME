import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProductionPage from "./pages/ProductionPage";
import QualityPage from "./pages/QualityPage";
import CostPage from "./pages/CostPage";
import DispatchPage from "./pages/DispatchPage";
import SafetyPage from "./pages/SafetyPage";
import MoralePage from "./pages/MoralePage";
import EnvironmentPage from "./pages/EnvironmentPage";
import TargetsPage from "./pages/TargetPage";
import { AcceptInvitePage } from "./pages/AcceptInvite";
import { AlertsPage } from "./pages/AlertPage";

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
                <Route>
                  <div className="flex flex-col items-center justify-center pt-20">
                    <h1 className="text-2xl font-bold text-gray-900">404 - Not Found</h1>
                  </div>
                </Route>
              </Switch>
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