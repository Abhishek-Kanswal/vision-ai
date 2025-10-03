// app/auth/login/page.tsx
"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<"google" | "twitter" | null>(null)
  const router = useRouter()

  const handleOAuthLogin = async (provider: "google" | "twitter") => {
    setIsLoading(provider)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: false,
        },
      })

      if (error) throw error

      console.log("OAuth initiated:", data)

    } catch (error: unknown) {
      console.error("OAuth login error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during authentication")
      setIsLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70">
            <div 
              className="h-10 w-10 rounded-lg bg-cover bg-center"
              style={{
                backgroundImage: 'url("/sentient.avif")',
              }}
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            SentientAI
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligent conversations powered by AI
          </p>
        </div>

        <Card className="border-0 shadow-lg shadow-black/5 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-1 pb-6">
            <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Sign in to continue your conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleOAuthLogin("google")}
              variant="outline"
              className="w-full h-11 border-2 hover:border-primary/20 hover:bg-accent/50 transition-all duration-200"
              disabled={isLoading !== null}
            >
              <div className="flex items-center justify-center w-full">
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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
                <span className="font-medium">
                  {isLoading === "google" ? "Connecting to Google..." : "Continue with Google"}
                </span>
              </div>
            </Button>

            <Button
              onClick={() => handleOAuthLogin("twitter")}
              variant="outline"
              className="w-full h-11 border-2 hover:border-primary/20 hover:bg-accent/50 transition-all duration-200"
              disabled={isLoading !== null}
            >
              <div className="flex items-center justify-center w-full">
                <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="font-medium">
                  {isLoading === "twitter" ? "Connecting to X..." : "Continue with X"}
                </span>
              </div>
            </Button>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive text-center">{error}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <Link 
                href="/" 
                className="flex items-center justify-center w-full text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
              >
                <span className="group-hover:underline underline-offset-4">
                  Continue without signing in
                </span>
                <svg 
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}