import React from "react";
import { Button } from "@/components/ui/button";

// Full-screen card shared by the 404 page and the crash screen. Uses plain
// location changes, not useNavigate, because ErrorBoundary sits outside the router.
function StatusCard({ title, message, actionLabel, onAction }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 box-border">
      <div className="w-full max-w-[400px] bg-card border border-border flex flex-col items-center p-6 rounded-lg text-center">
        <img src="/images/payzarc.png" alt="Payzarc" className="w-[100px] max-w-[35%] h-auto mb-4" />
        <h1 className="text-lg font-bold mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <Button
          onClick={onAction}
          className="font-bold bg-gold text-[#1a202c] hover:bg-gold-dark"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <StatusCard
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved."
      actionLabel="Go home"
      onAction={() => window.location.assign("/")}
    />
  );
}

export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <StatusCard
        title="Something went wrong"
        message="An unexpected error occurred. Reloading usually fixes it."
        actionLabel="Reload"
        onAction={() => window.location.reload()}
      />
    );
  }
}
