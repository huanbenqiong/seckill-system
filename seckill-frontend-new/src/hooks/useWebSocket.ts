import { useEffect, useRef, useCallback, useState } from 'react'
import type { WsMessage, WsMessageType } from '../types'

interface UseWebSocketOptions {
  url: string
  onMessage?: (msg: WsMessage) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * WebSocket Hook - 支持自动重连、消息订阅
 */
export function useWebSocket({
  url,
  onMessage,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectCountRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const [status, setStatus] = useState<WsStatus>('disconnected')

  const connect = useCallback(() => {
    // 后端未部署时使用 mock 模式
    if (!url || url.includes('undefined')) {
      setStatus('disconnected')
      return
    }

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws
      setStatus('connecting')

      ws.onopen = () => {
        setStatus('connected')
        reconnectCountRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data)
          onMessageRef.current?.(msg)
        } catch {
          console.warn('WebSocket 消息解析失败:', event.data)
        }
      }

      ws.onerror = () => {
        setStatus('error')
      }

      ws.onclose = () => {
        setStatus('disconnected')
        wsRef.current = null
        // 自动重连
        if (reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current++
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }
    } catch {
      setStatus('error')
    }
  }, [url, reconnectInterval, maxReconnectAttempts])

  const send = useCallback((type: WsMessageType, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data, timestamp: Date.now() }))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    reconnectCountRef.current = maxReconnectAttempts // 停止重连
    wsRef.current?.close()
  }, [maxReconnectAttempts])

  useEffect(() => {
    // 仅在有 url 时尝试连接
    if (url) {
      connect()
    }
    return () => disconnect()
  }, [url, connect, disconnect])

  return { status, send }
}
