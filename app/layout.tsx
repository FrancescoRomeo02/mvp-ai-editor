import type { Metadata } from 'next'
import 'katex/dist/katex.min.css'
import '../src/styles.css'
import { AuthProvider } from '../src/auth/AuthProvider'

export const metadata: Metadata = {
  title: 'Paper editor',
  description: 'A focused block editor for academic papers with LaTeX export',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>
}
