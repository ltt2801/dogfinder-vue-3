import { computed, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue'

export type SwipeDirection = 'left' | 'right' | 'up'

interface UseSwipeOptions {
  disabled?: MaybeRefOrGetter<boolean>
  threshold?: number
  autoResetFeedback?: boolean
  onSwipe: (direction: SwipeDirection) => void
}

const DRAG_START_DISTANCE = 8
const FEEDBACK_DURATION_MS = 320
const MAX_VISUAL_OFFSET = 160
const MAX_ROTATION_DEG = 22
const VISUAL_DRAG_FACTOR = 0.9

const clampVisualOffset = (value: number) =>
  Math.max(-MAX_VISUAL_OFFSET, Math.min(MAX_VISUAL_OFFSET, value * VISUAL_DRAG_FACTOR))

export const useSwipe = ({
  disabled = false,
  threshold = 56,
  autoResetFeedback = true,
  onSwipe,
}: UseSwipeOptions) => {
  const activePointerId = ref<number | null>(null)
  const startX = ref(0)
  const startY = ref(0)
  const offsetX = ref(0)
  const offsetY = ref(0)
  const isDragging = ref(false)
  const feedback = ref<SwipeDirection | null>(null)
  let suppressClick = false
  let clickSuppressionTimer: ReturnType<typeof setTimeout> | undefined
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined

  const isDisabled = () => toValue(disabled)

  const cardStyle = computed(() => {
    if (!isDragging.value) {
      return undefined
    }

    const rotation = (offsetX.value / MAX_VISUAL_OFFSET) * MAX_ROTATION_DEG

    return {
      transform: `translate3d(${offsetX.value}px, ${offsetY.value}px, 0) rotate(${rotation}deg)`,
      transition: 'none',
    }
  })

  const resetPointer = () => {
    activePointerId.value = null
    offsetX.value = 0
    offsetY.value = 0
    isDragging.value = false
  }

  const resetFeedback = () => {
    clearTimeout(feedbackTimer)
    feedback.value = null
  }

  const onPointerDown = (event: PointerEvent) => {
    if (
      isDisabled() ||
      feedback.value ||
      activePointerId.value !== null ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }

    activePointerId.value = event.pointerId
    startX.value = event.clientX
    startY.value = event.clientY
    if (event.currentTarget instanceof Element) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId.value) {
      return
    }

    const deltaX = event.clientX - startX.value
    const deltaY = event.clientY - startY.value

    if (!isDragging.value && Math.hypot(deltaX, deltaY) < DRAG_START_DISTANCE) {
      return
    }

    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)
    const isUpward = deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX)

    if (!isHorizontal && !isUpward) {
      return
    }

    isDragging.value = true
    offsetX.value = isHorizontal
      ? Math.round(clampVisualOffset(deltaX))
      : Math.round(clampVisualOffset(deltaX * 0.35))
    offsetY.value = isUpward
      ? Math.round(clampVisualOffset(deltaY))
      : isHorizontal
        ? Math.round(clampVisualOffset(deltaY * 0.2))
        : 0
    event.preventDefault()
  }

  const finishSwipe = (event: PointerEvent, cancelled = false) => {
    if (event.pointerId !== activePointerId.value) {
      return
    }

    const deltaX = event.clientX - startX.value
    const deltaY = event.clientY - startY.value
    const didDrag = isDragging.value
    let direction: SwipeDirection | null = null

    if (!cancelled && Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX < 0 ? 'left' : 'right'
    } else if (!cancelled && -deltaY >= threshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      direction = 'up'
    }

    suppressClick = didDrag
    clearTimeout(clickSuppressionTimer)
    clickSuppressionTimer = setTimeout(() => {
      suppressClick = false
    })
    resetPointer()

    if (!direction || isDisabled()) {
      return
    }

    feedback.value = direction
    onSwipe(direction)

    if (autoResetFeedback) {
      feedbackTimer = setTimeout(resetFeedback, FEEDBACK_DURATION_MS)
    }
  }

  const onPointerUp = (event: PointerEvent) => finishSwipe(event)
  const onPointerCancel = (event: PointerEvent) => finishSwipe(event, true)

  const onClickCapture = (event: MouseEvent) => {
    if (!suppressClick) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
    clearTimeout(clickSuppressionTimer)
  }

  onScopeDispose(() => {
    clearTimeout(clickSuppressionTimer)
    clearTimeout(feedbackTimer)
  })

  return {
    cardStyle,
    feedback,
    isDragging,
    resetFeedback,
    onClickCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
