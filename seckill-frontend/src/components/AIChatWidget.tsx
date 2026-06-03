import { useState, useRef, useEffect } from 'react';
import request from '../utils/request';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatWidget: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '您好！我是您的 AI 商家助手。我可以帮您查询库存、分析销售数据、自动进行补货操作。有什么可以帮您的？',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化位置（右下角）
  useEffect(() => {
    setPosition({ x: window.innerWidth - 380, y: window.innerHeight - 520 });
  }, []);

  // 全局鼠标事件监听（修复：可在整个浏览器拖动）
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 根据展开/收缩状态使用不同的尺寸限制
      const widgetW = isExpanded ? 364 : 60;
      const widgetH = isExpanded ? 560 : 60;
      const newX = Math.max(0, Math.min(window.innerWidth - widgetW, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - widgetH, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragOffset, isExpanded]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chat-input-area')) return;
    e.preventDefault();
    setDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res: any = await request.post('http://localhost:8099/chat', {
        message: userMsg,
        chat_history: messages.map(m => [
          m.role === 'user' ? m.content : '',
          m.role === 'assistant' ? m.content : '',
        ]),
      });
      if (res.code === 200 || res.status === 200) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data || '处理完成' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，服务暂时不可用，请稍后重试。' }]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '抱歉，AI 服务连接失败，请确保 Python Agent 服务已启动（端口 8099）。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    '帮我查询库存低于10的商品',
    '帮我把库存低于10的商品补到50',
    '今天销售战况如何？',
    '哪款商品卖得最快？',
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        userSelect: dragging ? 'none' : 'auto',
      }}
    >
      {/* 收缩状态：悬浮按钮 */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          onMouseDown={handleMouseDown}
          title="AI 商家助手"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 18px rgba(102,126,234,0.45)',
            cursor: dragging ? 'grabbing' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'transform 0.2s',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      )}

      {/* 展开状态：完整对话窗口 */}
      {isExpanded && (
        <div
          style={{
            width: 364,
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 标题栏 */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '13px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: dragging ? 'grabbing' : 'grab',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600 }}>AI 商家助手</span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#52c41a',
                boxShadow: '0 0 6px #52c41a',
                display: 'inline-block',
              }} />
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              −
            </button>
          </div>

          {/* 消息区域 */}
          <div style={{ height: 340, overflowY: 'auto', padding: '16px', background: '#f8f9fa', flexShrink: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                {msg.role === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '9px 14px',
                      borderRadius: '14px 14px 4px 14px',
                      maxWidth: '78%',
                      fontSize: 14,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                      </svg>
                    </div>
                    <div style={{
                      background: 'white',
                      color: '#333',
                      padding: '9px 14px',
                      borderRadius: '14px 14px 14px 4px',
                      maxWidth: '78%',
                      fontSize: 14,
                      lineHeight: 1.6,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* AI 思考中动画（Task 8）*/}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                  </svg>
                </div>
                <div style={{
                  background: 'white',
                  borderRadius: '14px 14px 14px 4px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  padding: '12px 16px',
                }}>
                  <div className="chat-loading-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 快捷问题 */}
          <div style={{
            padding: '8px 10px',
            background: '#f0f0f8',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            flexShrink: 0,
          }}>
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                disabled={loading}
                style={{
                  background: 'white',
                  border: '1px solid #e0e0ea',
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: 12,
                  color: '#555',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* 输入区域 */}
          <div
            className="chat-input-area"
            style={{
              padding: '10px 12px',
              borderTop: '1px solid #eee',
              display: 'flex',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="输入您的问题..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 20,
                border: '1.5px solid #ddd',
                outline: 'none',
                fontSize: 14,
                background: '#fafafa',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: '0 18px',
                borderRadius: 20,
                background:
                  loading || !input.trim()
                    ? '#ddd'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                minWidth: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : '发送'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
