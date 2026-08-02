import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DogFinderUser } from '@/models/user'
import { USER_STORAGE_KEY, useUserStore } from '@/stores/user'
import { createAvatar } from '@/utils/avatar'

const fakerMocks = vi.hoisted(() => ({
  fullName: vi.fn<() => string>(() => 'Taylor Nguyen'),
  uuid: vi.fn<() => string>(() => 'user-uuid'),
}))

vi.mock('@faker-js/faker', () => ({
  faker: {
    person: { fullName: fakerMocks.fullName },
    string: { uuid: fakerMocks.uuid },
  },
}))

describe('user store', () => {
  beforeEach(() => {
    localStorage.clear()
    fakerMocks.fullName.mockClear()
    fakerMocks.uuid.mockClear()
    setActivePinia(createPinia())
  })

  it('creates and persists a user only once', () => {
    const store = useUserStore()

    const firstUser = store.initializeUser()
    const secondUser = store.initializeUser()

    expect(secondUser).toEqual(firstUser)
    expect(firstUser).toMatchObject({
      subId: 'user-uuid',
      fullName: 'Taylor Nguyen',
    })
    expect(firstUser.avatarBase64).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(fakerMocks.fullName).toHaveBeenCalledOnce()
    expect(fakerMocks.uuid).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? 'null')).toEqual(firstUser)
  })

  it('hydrates an existing valid profile without generating another one', () => {
    const persistedUser: DogFinderUser = {
      subId: 'persisted-user',
      fullName: 'Existing User',
      avatarBase64: createAvatar('Existing User', () => 0),
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(persistedUser))

    expect(useUserStore().initializeUser()).toEqual(persistedUser)
    expect(fakerMocks.fullName).not.toHaveBeenCalled()
    expect(fakerMocks.uuid).not.toHaveBeenCalled()
  })

  it('replaces invalid persisted data and supports resetting the identity', () => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ subId: 123 }))
    const store = useUserStore()

    expect(store.initializeUser().subId).toBe('user-uuid')

    store.resetUser()

    expect(store.user).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
  })
})

describe('createAvatar', () => {
  it('returns a UTF-8-safe Base64 SVG data URI with initials', () => {
    const avatar = createAvatar('Đặng Ánh', () => 0.5)
    const encodedSvg = avatar.replace('data:image/svg+xml;base64,', '')
    const bytes = Uint8Array.from(atob(encodedSvg), (character) => character.charCodeAt(0))
    const svg = new TextDecoder().decode(bytes)

    expect(svg).toContain('ĐÁ')
    expect(svg).toContain('hsl(180 60% 45%)')
  })
})
