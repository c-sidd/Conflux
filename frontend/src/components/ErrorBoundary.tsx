import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-bg-canvas text-text-primary p-6">
          <div className="w-full max-w-lg space-y-6 bg-bg-surface border border-border rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-xl)] text-center cfx-scale-in">
            <div className="w-14 h-14 rounded-full bg-danger-light border border-danger/20 text-danger flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-[var(--font-size-h3)] font-bold tracking-tight">Something went wrong</h1>
              <p className="text-[var(--font-size-caption)] text-text-muted leading-relaxed">
                An unexpected runtime error occurred. This could be due to a lost network connection, a temporary server issue, or a layout rendering issue.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-bg-sunken border border-border rounded-[var(--radius-lg)] text-left font-mono text-[var(--font-size-label)] text-text-secondary max-h-48 overflow-y-auto space-y-1">
                <p className="font-bold text-danger">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-text-muted text-[11px] leading-4 overflow-x-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="w-4 h-4" /> Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
