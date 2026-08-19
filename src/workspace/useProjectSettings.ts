'use client'

import { useEffect, useState } from 'react'
import type { LatexStyleId } from '../latex'

const STYLE_KEY = 'paper-editor:latex-style'
const validStyles: LatexStyleId[] = ['generic', 'acm', 'nature']

export function useProjectSettings(projectId = 'default') {
  const [style, setStyleState] = useState<LatexStyleId | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STYLE_KEY}:${projectId}`) ?? (projectId === 'default' ? localStorage.getItem(STYLE_KEY) : null)
      if (stored && validStyles.includes(stored as LatexStyleId)) setStyleState(stored as LatexStyleId)
    } finally {
      setHydrated(true)
    }
  }, [projectId])

  const setStyle = (nextStyle: LatexStyleId) => {
    setStyleState(nextStyle)
    localStorage.setItem(`${STYLE_KEY}:${projectId}`, nextStyle)
  }

  return { style, setStyle, hydrated }
}
