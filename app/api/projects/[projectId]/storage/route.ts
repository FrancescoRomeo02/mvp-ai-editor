import { NextResponse } from 'next/server'
import { getBearerToken, requireSupabaseAdmin } from '../../../../../src/server/supabaseAdmin'

type RouteContext = { params: Promise<{ projectId: string }> }

const DEFAULT_MIME_TYPES = [
  'text/*', 'application/json', 'application/pdf', 'application/zip',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
]

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const token = getBearerToken(request)
    if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

    const admin = requireSupabaseAdmin()
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 })

    const { data: project, error: projectError } = await admin
      .from('projects').select('id, owner_user_id').eq('id', projectId).maybeSingle()
    if (projectError) throw projectError
    if (!project || project.owner_user_id !== authData.user.id) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

    const bucketId = project.id
    const { data: existing } = await admin.storage.getBucket(bucketId)
    if (!existing) {
      const fileSizeLimit = process.env.SUPABASE_PROJECT_FILE_SIZE_LIMIT ?? '50MB'
      const allowedMimeTypes = (process.env.SUPABASE_ALLOWED_MIME_TYPES ?? DEFAULT_MIME_TYPES.join(',')).split(',').map((value) => value.trim()).filter(Boolean)
      const { error: createError } = await admin.storage.createBucket(bucketId, {
        public: false,
        fileSizeLimit,
        allowedMimeTypes,
      })
      if (createError && !/already exists/i.test(createError.message)) throw createError
    }

    return NextResponse.json({ bucketId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to provision project storage.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const token = getBearerToken(request)
    if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    const admin = requireSupabaseAdmin()
    const { data: authData } = await admin.auth.getUser(token)
    const { data: project } = await admin.from('projects').select('id, owner_user_id').eq('id', projectId).maybeSingle()
    if (!authData.user || !project || project.owner_user_id !== authData.user.id) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    const { error: emptyError } = await admin.storage.emptyBucket(projectId)
    if (emptyError && !/not found/i.test(emptyError.message)) throw emptyError
    const { error: deleteError } = await admin.storage.deleteBucket(projectId)
    if (deleteError && !/not found/i.test(deleteError.message)) throw deleteError
    return NextResponse.json({ bucketId: projectId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to remove project storage.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
