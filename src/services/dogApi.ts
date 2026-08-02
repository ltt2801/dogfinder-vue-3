import { createFetch } from '@vueuse/core'

import type { DogBreed, DogImage } from '@/models/dog'
import type { CreateVoteRequest, Vote } from '@/models/vote'

const DEFAULT_BASE_URL = 'https://api.thedogapi.com/v1'
const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_LIMIT_BREEDS = 1
const DEFAULT_PAGE_BREEDS = 0
const DEFAULT_ORDER_BREEDS = 'ASC'
const DEFAULT_LIMIT_BREED_IMAGES = 10
const DEFAULT_PAGE_BREED_IMAGES = 0
const DEFAULT_ORDER_BREED_IMAGES = 'RAND'

export interface DogApiClientOptions {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
  fetchFn?: typeof fetch
}

interface ApiErrorBody {
  error?: string
  message?: string
}

export class DogApiError extends Error {
  readonly cause?: unknown
  readonly status?: number

  constructor(message: string, status?: number, cause?: unknown) {
    super(message)
    this.name = 'DogApiError'
    this.status = status
    this.cause = cause
  }
}

export class DogApiConfigurationError extends DogApiError {
  constructor(message: string) {
    super(message)
    this.name = 'DogApiConfigurationError'
  }
}

const getErrorMessage = (data: unknown, error: unknown) => {
  if (typeof data === 'object' && data !== null) {
    const errorBody = data as ApiErrorBody
    const apiMessage = errorBody.message || errorBody.error

    if (apiMessage) {
      return apiMessage
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return typeof error === 'string' ? error : 'An unexpected Dog API error occurred.'
}

export const createDogApiClient = ({
  baseUrl,
  apiKey,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchFn = fetch,
}: DogApiClientOptions) => {
  const normalizedBaseUrl = baseUrl?.trim().replace(/\/+$/, '') ?? ''
  const normalizedApiKey = apiKey?.trim() ?? ''

  const validateConfiguration = () => {
    if (!normalizedApiKey) {
      throw new DogApiConfigurationError('Missing VITE_DOG_API_KEY environment variable.')
    }
  }

  const useDogFetch = createFetch({
    baseUrl: normalizedBaseUrl,
    options: {
      fetch: fetchFn,
      timeout: timeoutMs,
      updateDataOnError: true,
      onFetchError: ({ data, error, response }) => ({
        error: new DogApiError(getErrorMessage(data, error), response?.status, error),
      }),
    },
    fetchOptions: {
      headers: {
        Accept: 'application/json',
        'x-api-key': normalizedApiKey,
      },
    },
  })

  // A common request function that validates the configuration, makes the request, and unwraps the data
  const request = async <T>(
    endpoint: string,
    options: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
  ): Promise<T> => {
    // 1. Validate the configuration
    validateConfiguration()

    // 2.Make the request
    let fetchInstance = useDogFetch(endpoint)

    if (options.method === 'POST') {
      fetchInstance = fetchInstance.post(options.body)
    } else if (options.method === 'DELETE') {
      fetchInstance = fetchInstance.delete(options.body)
    } else {
      fetchInstance = fetchInstance.get()
    }

    const { data, error } = await fetchInstance.json<T>()

    // 3. Unwrap the data and throw an error if there is one
    if (error.value) {
      throw error.value
    }

    if (data.value === null) {
      throw new DogApiError('The Dog API returned an empty response.')
    }

    return data.value
  }

  return {
    getBreeds: (
      limit = DEFAULT_LIMIT_BREEDS,
      page = DEFAULT_PAGE_BREEDS,
      order = DEFAULT_ORDER_BREEDS,
      has_breeds = 1,
    ) =>
      request<DogBreed[]>(
        `/breeds?limit=${limit}&page=${page}&order=${order}&has_breeds=${has_breeds}`,
      ),

    getBreedImages: (
      limit = DEFAULT_LIMIT_BREED_IMAGES,
      page = DEFAULT_PAGE_BREED_IMAGES,
      order = DEFAULT_ORDER_BREED_IMAGES,
      breedId?: number,
    ) => {
      const breedFilter = breedId === undefined ? '' : `&breed_ids=${breedId}`

      return request<DogImage[]>(
        `/images/search?limit=${limit}&page=${page}&size=small&order=${order}&has_breeds=true${breedFilter}`,
      )
    },

    getImageById: (imageId: string) => request<DogImage>(`/images/${imageId}`),

    getBreedIdByImageId: (imageId: string) => request<number>(`/images/${imageId}/breeds`),

    getInfoByBreedId: (breedId: number) => request<DogBreed>(`/breeds/${breedId}`),

    createVote: (payload: CreateVoteRequest) =>
      request<Vote>('/votes', { method: 'POST', body: payload }),

    getVoteBySubId: (subId: string) =>
      request<Vote[]>(`/votes?sub_id=${encodeURIComponent(subId)}`),

    deleteVote: (voteId: number) => request<void>(`/vote/${voteId}`, { method: 'DELETE' }),
  }
}

export const dogApi = createDogApiClient({
  baseUrl: import.meta.env.VITE_DOG_API_URL || DEFAULT_BASE_URL,
  apiKey: import.meta.env.VITE_DOG_API_KEY,
})
