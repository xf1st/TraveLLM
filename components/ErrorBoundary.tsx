"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCcw, Home } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public handleGoHome = () => {
    window.location.href = "/"
  }

  public render() {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      if (fallback) return fallback

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Упс! Что-то пошло не так</h2>
              <p className="text-sm text-muted-foreground">
                {error?.message || "Произошла непредвиденная ошибка"}
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Попробовать снова
              </Button>
              <Button onClick={this.handleGoHome} className="gap-2">
                <Home className="h-4 w-4" />
                На главную
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

export default ErrorBoundary
