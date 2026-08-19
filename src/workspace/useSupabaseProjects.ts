'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { requireSupabase } from '../lib/supabase'
import { ensureProjectStorage } from './supabaseStorage'

export type SupabaseProject = { id: string; title: string; description: string | null; created_at: string; updated_at: string }

export function useSupabaseProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<SupabaseProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) { setProjects([]); setLoading(false); return }
    setLoading(true); setError(null)
    const { data, error: queryError } = await requireSupabase().from('projects').select('id, title, description, created_at, updated_at').order('updated_at', { ascending: false })
    if (queryError) { setError(queryError.message); setProjects([]) } else setProjects(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  const createProject = useCallback(async (title: string) => {
    if (!user) throw new Error('You must be signed in to create a project.')
    const { data, error: insertError } = await requireSupabase().from('projects').insert({ owner_user_id: user.id, title: title.trim() }).select('id, title, description, created_at, updated_at').single()
    if (insertError) throw insertError
    try {
      await ensureProjectStorage(data.id)
    } catch (storageError) {
      await requireSupabase().from('projects').delete().eq('id', data.id)
      throw storageError
    }
    setProjects((current) => [data, ...current])
    return data
  }, [user])

  return { projects, loading, error, refresh, createProject }
}
