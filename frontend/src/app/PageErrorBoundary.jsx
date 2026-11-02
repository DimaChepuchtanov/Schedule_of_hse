import { Component } from "react";
import { Link } from "react-router";

export default class PageErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="page-status" role="alert">
        <h1>Не удалось открыть страницу</h1>
        <p>Обновите страницу и попробуйте ещё раз.</p>
        <button type="button" className="page-button" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
        <Link to="/auth/">К странице входа</Link>
      </main>
    );
  }
}
