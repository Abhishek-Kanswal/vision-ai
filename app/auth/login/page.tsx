"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { Rotate3d } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<'google' | 'twitter' | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'twitter') => {
    setIsLoading(provider);
    setError(null);

    try {
      const { supabaseBrowser } = await import('@/lib/supabase/client');
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

    } catch (err) {
      console.error('OAuth login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
      setIsLoading(null);
    }
  };

  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center space-y-4 sm:space-y-6">
          <div className="flex justify-center">
            <Rotate3d className="h-16 w-16 sm:h-20 sm:w-20 text-primary animate-spin-slow" />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              VisionAI
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-light px-4 sm:px-0">
              Intelligent conversations powered by AI
            </p>
          </div>
        </div>

        {/* Card */}
        <Card className="bg-card/40 border-0">
          <CardHeader className="text-center space-y-2 sm:space-y-3 pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome back
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground">
              Sign in to continue your conversations
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 sm:space-y-4 pb-6 sm:pb-8 px-4 sm:px-6">
            <Button
              onClick={() => handleOAuthLogin("google")}
              variant="outline"
              className="w-full h-12 sm:h-14 border-2 border-border bg-background/50 hover:bg-accent/50 hover:border-primary/50 transition-all duration-300 group relative overflow-hidden"
              disabled={isLoading !== null}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="flex items-center justify-center w-full relative z-10">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-foreground text-sm sm:text-base">
                  {isLoading === "google" ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      Connecting...
                    </span>
                  ) : "Continue with Google"}
                </span>
              </div>
            </Button>

            <Button
              onClick={() => handleOAuthLogin("twitter")}
              variant="outline"
              className="w-full h-12 sm:h-14 border-2 border-border bg-background/50 hover:bg-accent/50 hover:border-border transition-all duration-300 group relative overflow-hidden"
              disabled={isLoading !== null}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="flex items-center justify-center w-full relative z-10">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-foreground">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="font-semibold text-foreground text-sm sm:text-base">
                  {isLoading === "twitter" ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      Connecting...
                    </span>
                  ) : "Continue with X"}
                </span>
              </div>
            </Button>

            {error && (
              <Alert className="border-destructive/20 bg-destructive/10 animate-in fade-in duration-300 mt-2 sm:mt-4">
                <AlertDescription className="flex items-center justify-center text-destructive text-sm sm:text-base">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="relative pt-4 sm:pt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase mt-2">
                <span className="bg-card/80 px-2 text-muted-foreground text-xs">Or</span>
              </div>
            </div>

            <Link
              href="/"
              className="flex items-center justify-center w-full text-sm text-muted-foreground hover:text-foreground transition-all duration-300 group py-3 sm:py-4 rounded-lg hover:bg-accent/50 border-2 border-transparent"
            >
              <span className="font-medium text-sm sm:text-base">
                Continue without signing in
              </span>
              <svg
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}