import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: (error: Error) => ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback?.(this.state.error) ?? (
        <div className="p-4 rounded-lg border border-red-800 bg-red-950/30 text-sm text-red-400 font-mono">
          {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
