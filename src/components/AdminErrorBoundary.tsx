"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface AdminErrorBoundaryProps {
  children: ReactNode;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
}

export class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AdminErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Admin panel render failure", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
          <section className="max-w-md rounded-lg border border-red-900/60 bg-zinc-900 p-8 text-center">
            <h1 className="text-xl font-semibold text-red-300">Admin panel could not load</h1>
            <p className="mt-3 text-sm text-zinc-400">The panel hit a temporary rendering error. Reload to try again.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300">
              Reload panel
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}