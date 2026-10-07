import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AuthProvider, GuestOnly, RequireAuth } from "./lib/auth";
import { EditorPage } from "./routes/EditorPage";
import { LibraryPage } from "./routes/LibraryPage";
import { LoginPage, RegisterPage } from "./routes/AuthPages";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/tactics" element={<LibraryPage />} />
            <Route path="/tactics/:id" element={<EditorPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/tactics" replace />} />
          <Route path="*" element={<Navigate to="/tactics" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
