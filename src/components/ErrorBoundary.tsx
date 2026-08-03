import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called when the student asks to recover (restores the textbook design). */
  onReset: () => void;
}
interface State {
  error: Error | null;
}

/**
 * Last line of defence. Without this, any exception thrown while rendering
 * unmounts the whole React tree and the student sees a blank white page with
 * no way back. Here they get an explanation and a one-click return to the
 * textbook design point.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the details in the console so an instructor can report them.
    console.error('Build-a-Tokamak render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="panel crash-card">
        <h2>That combination broke the display</h2>
        <p>
          The design chain produced something the plots could not draw. This is a
          bug in the app, not in your reasoning — the physics itself is fine.
        </p>
        <p className="crash-detail">{error.message}</p>
        <button
          className="btn"
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        >
          Back to the textbook design
        </button>
      </div>
    );
  }
}
