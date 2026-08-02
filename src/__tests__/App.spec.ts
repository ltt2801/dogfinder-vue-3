import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App.vue'

vi.mock('@faker-js/faker', () => ({
  faker: {
    person: { fullName: () => 'Taylor Walker' },
    string: { uuid: () => 'user-id-123' },
  },
}))

const mountApp = () =>
  mount(App, {
    global: {
      plugins: [createPinia()],
      stubs: {
        RouterLink: RouterLinkStub,
        RouterView: true,
      },
    },
  })

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the application identity', () => {
    const wrapper = mountApp()

    expect(wrapper.text()).toContain('DogFinder')
  })

  it('shows the persisted user profile in the header', () => {
    const wrapper = mountApp()

    expect(wrapper.get('.user-profile__avatar').attributes('src')).toMatch(
      /^data:image\/svg\+xml;base64,/,
    )
    expect(wrapper.get('.user-profile__name').text()).toBe('Taylor Walker')
    expect(wrapper.get('.user-profile__id').text()).toBe('ID: user-id-123')
  })

  it('opens a mobile-friendly user menu with vote history', async () => {
    const wrapper = mountApp()
    const menuButton = wrapper.get('button[aria-label="Open user menu"]')

    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await menuButton.trigger('click')

    expect(menuButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="menu"]').text()).toContain('Vote history')
    expect(
      wrapper.findAllComponents(RouterLinkStub).some((link) => link.props('to') === '/history'),
    ).toBe(true)

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('provides keyboard navigation and an accessible notification region', () => {
    const wrapper = mountApp()

    expect(wrapper.get('.skip-link').attributes('href')).toBe('#main-content')
    expect(wrapper.get('main').attributes('tabindex')).toBe('-1')
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
  })
})
