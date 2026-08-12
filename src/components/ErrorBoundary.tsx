import React from "react";
import { MdErrorOutline } from "react-icons/md";

type ErrorBoundaryProps = {
  children?: React.ReactNode
  resetKey?: unknown
};

type ErrorBoundaryState = {
  error: Error | null
};

/** Contains a render crash to the panel it wraps instead of white-screening
 * the whole app. The style itself is untouched (it lives in App's state,
 * not here) so switching away from the offending layer recovers cleanly. */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <div className="maputnik-error-boundary">
        <MdErrorOutline size={20} />
        <p>This panel hit a rendering error and couldn't display.</p>
        <p className="maputnik-error-boundary-detail">{this.state.error.message}</p>
      </div>;
    }
    return this.props.children;
  }
}
