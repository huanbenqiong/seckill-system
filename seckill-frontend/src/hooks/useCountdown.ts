import { useState, useEffect, useRef } from 'react'

interface UseCountdownOptions {
  targetDate: string | Date
  onEnd?: () => void
}

interface CountdownResult {
  days: number
  hours: number
  minutes: number
  seconds: number
  isEnded: boolean
  isStarted: boolean
  totalSeconds: number
}

/**
 * 倒计时 Hook
 */
export function useCountdown({ targetDate, onEnd }: UseCountdownOptions): CountdownResult {
  const target = new Date(targetDate).getTime()
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const getRemaining = () => {
    const now = Date.now()
    const diff = Math.max(0, target - now)
    return {
      totalSeconds: Math.floor(diff / 1000),
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isEnded: diff <= 0,
      isStarted: now >= target,
    }
  }

  const [state, setState] = useState(getRemaining)

  useEffect(() => {
    if (state.isEnded) {
      onEndRef.current?.()
      return
    }
    const timer = setInterval(() => {
      const next = getRemaining()
      setState(next)
      if (next.isEnded) {
        onEndRef.current?.()
        clearInterval(timer)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [target, state.isEnded])

  return state
}
