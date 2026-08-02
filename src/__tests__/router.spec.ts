import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { routes } from '@/router'

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes,
  })

describe('router', () => {
  it('routes the root path to the main page', async () => {
    const router = createTestRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('main')
  })

  it('routes breed ids to the details page', async () => {
    const router = createTestRouter()

    await router.push('/breeds/42')

    expect(router.currentRoute.value.name).toBe('breed-details')
    expect(router.currentRoute.value.params.id).toBe('42')
  })

  it('routes vote history to the history page', async () => {
    const router = createTestRouter()

    await router.push('/history')

    expect(router.currentRoute.value.name).toBe('history')
  })

  it('redirects unknown paths to the main page', async () => {
    const router = createTestRouter()

    await router.push('/not-a-route')

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(router.currentRoute.value.name).toBe('main')
  })
})
