import { faker } from '@faker-js/faker'
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

import type { DogFinderUser } from '@/models/user'
import { createAvatar } from '@/utils/avatar'

export const USER_STORAGE_KEY = 'dogfinder:user:v1'

const isDogFinderUser = (value: unknown): value is DogFinderUser => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const user = value as Partial<DogFinderUser>
  return (
    typeof user.subId === 'string' &&
    user.subId.length > 0 &&
    typeof user.fullName === 'string' &&
    user.fullName.length > 0 &&
    typeof user.avatarBase64 === 'string' &&
    user.avatarBase64.startsWith('data:image/svg+xml;base64,')
  )
}

export const useUserStore = defineStore('user', () => {
  const user = useLocalStorage<DogFinderUser | null>(USER_STORAGE_KEY, null, {
    flush: 'sync',
    serializer: StorageSerializers.object,
  })

  const initializeUser = () => {
    if (isDogFinderUser(user.value)) {
      return user.value
    }

    const fullName = faker.person.fullName()
    const newUser: DogFinderUser = {
      subId: faker.string.uuid(),
      fullName,
      avatarBase64: createAvatar(fullName),
    }

    user.value = newUser
    return newUser
  }

  const resetUser = () => {
    user.value = null
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  return { user, initializeUser, resetUser }
})
