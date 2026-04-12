import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ThreeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error("[Three.js Error] Caught by ErrorBoundary:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0f] text-[#ff3355] border-2 border-[#ff3355]/20 p-6 rounded-lg">
                    <h3 className="font-rajdhani font-bold text-xl uppercase tracking-widest mb-2">3D Scene rendering failure</h3>
                    <p className="font-sans text-[12px] text-gray-500 mb-6">{this.state.error?.message || "An unknown WebGL error occurred"}</p>
                    <button 
                        onClick={this.handleRetry}
                        className="px-4 py-2 border border-[#00d4ff]/50 text-[#00d4ff] text-[12px] font-bold uppercase tracking-wider rounded transition hover:bg-[#00d4ff]/10"
                    >
                        [ RETRY MOUNT ]
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export const WithThreeBoundary = ({ children }: { children: React.ReactNode }) => (
    <ThreeErrorBoundary>{children}</ThreeErrorBoundary>
);
