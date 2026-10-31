import { Link } from "react-router";
import PageLayout from "../shared/layouts/PageLayout.jsx";

export default function NotFoundPage() {
  return (
    <PageLayout
      title="Страница не найдена"
      description="Проверьте адрес или вернитесь к странице входа."
    >
      <Link className="page-button" to="/auth/">К странице входа</Link>
    </PageLayout>
  );
}
