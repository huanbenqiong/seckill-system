package com.seckill.gateway.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SeckillWebSocketHandler implements WebSocketHandler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SeckillWebSocketHandler.class);

    private static final Map<String, WebSocketSession> SESSION_MAP = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String query = session.getHandshakeInfo().getUri().getQuery();
        String userId = getUserIdFromQuery(query);

        if (userId != null) {
            SESSION_MAP.put(userId, session);
            log.info("WebSocket connected for user: {}", userId);
        }

        return session.receive()
                .doFinally(signalType -> {
                    if (userId != null) {
                        SESSION_MAP.remove(userId);
                        log.info("WebSocket disconnected for user: {}", userId);
                    }
                }).then();
    }

    public void sendMessage(String userId, String message) {
        WebSocketSession session = SESSION_MAP.get(userId);
        if (session != null && session.isOpen()) {
            session.send(Mono.just(session.textMessage(message)))
                    .subscribe(
                            null,
                            error -> log.error("Error sending message to user {}: {}", userId, error.getMessage())
                    );
        }
    }

    private String getUserIdFromQuery(String query) {
        if (query == null) return null;
        String[] params = query.split("&");
        for (String param : params) {
            if (param.startsWith("userId=")) {
                return param.substring(7);
            }
        }
        return null;
    }
}
