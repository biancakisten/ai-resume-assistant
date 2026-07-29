import { BrowserRouter, Route, Routes } from "react-router-dom";
import DashboardPage from "../../features/dashboard/pages/DashboardPage";
import ResumeBuilderPage from "../../features/resume-builder/pages/ResumeBuilderPage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/resume-builder" element={<ResumeBuilderPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
