import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import CluesPage from "@/pages/CluesPage";
import EditPage from "@/pages/EditPage";
import ReviewPage from "@/pages/ReviewPage";
import { useAppStore } from "@/store/appStore";

export default function App() {
  const { loadPersistedData } = useAppStore();

  useEffect(() => {
    loadPersistedData();
  }, [loadPersistedData]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/clues" replace />} />
          <Route path="clues" element={<CluesPage />} />
          <Route path="edit" element={<EditPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="*" element={<Navigate to="/clues" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
