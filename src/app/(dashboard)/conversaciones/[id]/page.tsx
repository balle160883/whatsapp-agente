'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CircleNotch } from '@phosphor-icons/react'

export default function ConversationDetailPageRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  useEffect(() => {
    if (id) {
      router.replace(`/conversaciones?selected=${id}`)
    }
  }, [id, router])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        padding: '4rem',
      }}
    >
      <CircleNotch size={32} style={{ animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}
