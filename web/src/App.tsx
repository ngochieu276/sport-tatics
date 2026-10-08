import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/app-shell";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider, GuestOnly, RequireAuth } from "./lib/auth";
import { queryClient } from "./lib/query";
import { EditorPage } from "./routes/EditorPage";
import { LibraryPage } from "./routes/LibraryPage";
import { LoginPage, RegisterPage } from "./routes/AuthPages";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/tactics" element={<LibraryPage />} />
                  <Route path="/tactics/:id" element={<EditorPage />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/tactics" replace />} />
              <Route path="*" element={<Navigate to="/tactics" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
