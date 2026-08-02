import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useSwipe, type SwipeDirection } from '@/composables/useSwipe'

const mountSwipeSurface = (onSwipe: (direction: SwipeDirection) => void, disabled = false) =>
  mount(
    defineComponent({
      setup() {
        return {
          ...useSwipe({ disabled, onSwipe }),
        }
      },
      template: `
        <div
          class="swipe-surface"
          :style="cardStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        />
      `,
    }),
  )

const dispatchPointer = (element: Element, type: string, clientX: number, clientY: number) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX,
    clientY,
  })
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: 1 },
    pointerType: { value: 'touch' },
  })
  element.dispatchEvent(event)
}

const drag = async (
  wrapper: ReturnType<typeof mountSwipeSurface>,
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  const surface = wrapper.get('.swipe-surface')

  dispatchPointer(surface.element, 'pointerdown', from.x, from.y)
  dispatchPointer(surface.element, 'pointermove', to.x, to.y)
  dispatchPointer(surface.element, 'pointerup', to.x, to.y)
  await wrapper.vm.$nextTick()
}

describe('useSwipe', () => {
  it.each([
    [{ x: 140, y: 20 }, { x: 20, y: 30 }, 'left'],
    [{ x: 20, y: 20 }, { x: 140, y: 30 }, 'right'],
    [{ x: 20, y: 150 }, { x: 25, y: 30 }, 'up'],
  ] as const)('recognizes a %s-to-%s swipe as %s', async (from, to, direction) => {
    const onSwipe = vi.fn<(direction: SwipeDirection) => void>()
    const wrapper = mountSwipeSurface(onSwipe)

    await drag(wrapper, from, to)

    expect(onSwipe).toHaveBeenCalledExactlyOnceWith(direction)
  })

  it('ignores short drags and downward gestures', async () => {
    const onSwipe = vi.fn<(direction: SwipeDirection) => void>()
    const shortDragWrapper = mountSwipeSurface(onSwipe)
    const verticalDragWrapper = mountSwipeSurface(onSwipe)

    await drag(shortDragWrapper, { x: 20, y: 20 }, { x: 70, y: 22 })
    await drag(verticalDragWrapper, { x: 20, y: 20 }, { x: 100, y: 160 })

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('tilts and follows the drag like a Tinder card', async () => {
    const wrapper = mountSwipeSurface(vi.fn())
    const surface = wrapper.get('.swipe-surface')

    dispatchPointer(surface.element, 'pointerdown', 20, 20)
    dispatchPointer(surface.element, 'pointermove', 220, 25)
    await wrapper.vm.$nextTick()

    const style = surface.attributes('style') ?? ''
    expect(style).toContain('translate3d(160px, 1px, 0)')
    expect(style).toContain('rotate(22deg)')
  })

  it('does not start a gesture while disabled', async () => {
    const onSwipe = vi.fn<(direction: SwipeDirection) => void>()
    const wrapper = mountSwipeSurface(onSwipe, true)

    await drag(wrapper, { x: 140, y: 20 }, { x: 20, y: 20 })

    expect(onSwipe).not.toHaveBeenCalled()
  })
})
