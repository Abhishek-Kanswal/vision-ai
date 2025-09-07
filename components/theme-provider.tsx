'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"          // adds class="light" or "dark" on <html>
      defaultTheme="light"       // 👈 force light by default
      enableSystem={false}       // 👈 ignore system preference
      disableTransitionOnChange  // optional: smoother switching
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}