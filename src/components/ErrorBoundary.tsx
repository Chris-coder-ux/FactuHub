"use client";

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: true,
        },
      });
    }
    console.error("Critical error captured by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-md w-full border-red-200 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-600 h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-red-700">Algo no salió como esperábamos</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate-600 text-sm">
                Se ha producido un error inesperado en esta sección de la aplicación.
                {this.state.error && (
                  <span className="block mt-2 font-mono text-xs bg-slate-50 p-2 rounded border border-slate-100 overflow-auto max-h-24">
                    {this.state.error.message}
                  </span>
                )}
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => globalThis.location.reload()}
                  className="flex items-center gap-2"
                >
                  Recargar página
                </Button>
                <Button 
                  onClick={this.handleReset}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Intentar de nuevo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
