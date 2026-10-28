import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * Top-level error boundary for the admin panel.
 * Catches unhandled render errors and shows a recovery screen instead of a
 * blank white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback) return fallback(error, this.reset)

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            background: '#0f172a',
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#f87171' }}>
            Admin Panel Error
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '480px' }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={this.reset}
            style={{
              padding: '0.6rem 1.4rem',
              background: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            Try again
          </button>
          {import.meta.env.DEV && (
            <pre
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                textAlign: 'left',
                maxWidth: '640px',
                overflowX: 'auto',
                color: '#fca5a5',
              }}
            >
              {error.stack}
            </pre>
          )}
        </div>
      )
    }

    return children
  }
}
