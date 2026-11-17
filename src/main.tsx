import React from "react";
import ReactDOM from "react-dom/client";
import { CloudSetup } from "./components/CloudSetup";
import { configuration, demoMode } from "./lib/app-config";
const ConnectedApp = React.lazy(() => import("./ConnectedApp"));
const needsSetup = !demoMode && configuration.issue !== null;
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <h1>Let’s get the music back.</h1>
        <p>
          Something unexpected happened. Refresh the page to try again. Your
          collection is saved.
        </p>
        <button onClick={() => location.reload()}>Reload Horicx Music</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {needsSetup ? (
        <CloudSetup />
      ) : (
        <React.Suspense
          fallback={
            <div className="app-loading" role="status">
              <span />
              Opening your music library…
            </div>
          }
        >
          <ConnectedApp />
        </React.Suspense>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
