import { Component, type ReactNode } from 'react';
import { Icon } from './Icons';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="flex min-h-screen items-center justify-center bg-background-light p-6">
                    <div className="text-center space-y-4 max-w-md">
                        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                            <Icon name="error" className="text-red-500 text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <h2 className="text-xl font-bold text-neutral-text">Something went wrong</h2>
                        <p className="text-gray-500">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="mt-4 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-colors"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}