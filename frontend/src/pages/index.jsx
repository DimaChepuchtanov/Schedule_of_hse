import { Navigate } from "react-router";

export default function HomePage() {
  return <Navigate to="/auth/" replace />;
}
