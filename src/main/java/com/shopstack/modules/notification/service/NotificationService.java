package com.shopstack.modules.notification.service;
import com.shopstack.common.response.ApiResponse;
import com.shopstack.modules.notification.dto.*;
import com.shopstack.modules.notification.entity.NotificationType;
import java.util.*;
public interface NotificationService { ApiResponse<NotificationResponse> sendNotification(SendNotificationRequest request); ApiResponse<List<NotificationResponse>> getNotificationsForUser(UUID recipientId); ApiResponse<List<NotificationResponse>> getUnreadNotifications(UUID recipientId); ApiResponse<Long> getUnreadCount(UUID recipientId); ApiResponse<Void> markAsRead(UUID notificationId); ApiResponse<Void> markAllAsRead(UUID recipientId);

    // Sends the same event through IN_APP + EMAIL + SMS in one call.
    void sendMultiChannelNotification(UUID recipientId, String recipientType, NotificationType type, String title, String message);

    // Sends to every registered customer — used for "new arrival" / "new offer" broadcasts.
    void broadcastToAllCustomers(NotificationType type, String title, String message);
}