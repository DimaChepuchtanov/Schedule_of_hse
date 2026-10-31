import { Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import PageErrorBoundary from "./app/PageErrorBoundary.jsx";
import PageLoading from "./app/PageLoading.jsx";
import { pageRoutes } from "./app/routes.jsx";

function RoutedPages() {
  const location = useLocation();
  return (
    <PageErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {pageRoutes.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </Suspense>
    </PageErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedPages />
    </BrowserRouter>
  );
}
