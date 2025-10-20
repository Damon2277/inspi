'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
}

export function useWebSocket(options: WebSocketOptions) {
  const {
    url,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const connect = useCallback(() => {
    try {
      // 模拟 WebSocket 连接（实际项目中使用真实的 WebSocket 服务器）
      // 这里我们使用一个模拟的实现
      const mockWs = {
        readyState: WebSocket.OPEN,
        send: (data: string) => {
          console.log('WebSocket send:', data);
          // 模拟服务器响应
          setTimeout(() => {
            if (onMessage) {
              onMessage(new MessageEvent('message', { data }));
            }
          }, 100);
        },
        close: () => {
          console.log('WebSocket closed');
          setIsConnected(false);
        },
        addEventListener: (event: string, handler: any) => {
          console.log('WebSocket addEventListener:', event);
        },
        removeEventListener: (event: string, handler: any) => {
          console.log('WebSocket removeEventListener:', event);
        },
      };

      // 在生产环境中使用真实的 WebSocket
      // ws.current = new WebSocket(url);
      ws.current = mockWs as any;

      const handleOpen = (event: Event) => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectCount.current = 0;
        onOpen?.(event);
      };

      const handleClose = (event: CloseEvent) => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onClose?.(event);

        // 自动重连
        if (reconnect && reconnectCount.current < reconnectAttempts) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectCount.current++;
            console.log(`Reconnecting... (${reconnectCount.current}/${reconnectAttempts})`);
            connect();
          }, reconnectInterval);
        }
      };

      const handleError = (event: Event) => {
        console.error('WebSocket error:', event);
        onError?.(event);
      };

      const handleMessage = (event: MessageEvent) => {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        setLastMessage(data);
        onMessage?.(event);
      };

      // 模拟连接成功
      setTimeout(() => handleOpen(new Event('open')), 100);

      // 真实 WebSocket 事件监听
      // ws.current.addEventListener('open', handleOpen);
      // ws.current.addEventListener('close', handleClose);
      // ws.current.addEventListener('error', handleError);
      // ws.current.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, [reconnect, reconnectInterval, reconnectAttempts, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (ws.current && isConnected) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.current.send(message);
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [isConnected]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    lastMessage,
    connect,
    disconnect,
  };
}

// 模拟实时评论更新
export function useCommentWebSocket(workId: string | number) {
  const [comments, setComments] = useState<any[]>([]);

  const { isConnected, sendMessage, lastMessage } = useWebSocket({
    url: `ws://localhost:3001/comments/${workId}`,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'comment:new':
            setComments(prev => [data.comment, ...prev]);
            break;
          case 'comment:update':
            setComments(prev =>
              prev.map(comment =>
                (comment.id === data.comment.id ? data.comment : comment),
              ),
            );
            break;
          case 'comment:delete':
            setComments(prev => prev.filter(c => c.id !== data.commentId));
            break;
          case 'comment:like':
            setComments(prev =>
              prev.map(comment =>
                (comment.id === data.commentId
                  ? {
                    ...comment,
                    likes: data.likes,
                    isLiked: data.isLiked,
                  }
                  : comment),
              ),
            );
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
  });

  // 模拟定期收到新评论
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const randomEvent = Math.random();

      if (randomEvent < 0.3) {
        // 模拟新评论
        const newComment = {
          type: 'comment:new',
          comment: {
            id: Date.now().toString(),
            workId,
            userId: 'other-user',
            userName: '其他用户',
            userAvatar: '👥',
            content: `这是一条实时更新的评论 (${new Date().toLocaleTimeString()})`,
            createdAt: new Date().toISOString(),
            likes: 0,
            replies: [],
          },
        };

        setComments(prev => [newComment.comment, ...prev]);
      }
    }, 10000); // 每10秒模拟一次

    return () => clearInterval(interval);
  }, [isConnected, workId]);

  return {
    isConnected,
    comments,
    sendMessage,
    setComments,
  };
}
