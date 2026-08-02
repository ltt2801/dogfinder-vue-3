import type { VoteValue } from '@/config/common'

// domain
export interface Vote {
  id: number
  image_id: string
  value: VoteValue
  sub_id?: string
  created_at?: string
  country_code?: string
}

// api
export interface CreateVoteRequest {
  image_id: string
  value: VoteValue
  sub_id?: string // user identifier
}
