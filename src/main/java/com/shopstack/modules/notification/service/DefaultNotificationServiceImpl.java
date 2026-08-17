package com.shopstack.modules.notification.service;

import com.shopstack.common.exception.ResourceNotFoundException;
import com.shopstack.common.response.ApiResponse;
import com.shopstack.common.response.ApiResponseBuilder;
import com.shopstack.modules.customer.entity.Customer;
import com.shopstack.modules.customer.repository.CustomerRepository;
import com.shopstack.modules.notification.dto.NotificationResponse;
import com.shopstack.modules.notification.dto.SendNotificationRequest;
import com.shopstack.modules.notification.entity.Notification;
import com.shopstack.modules.notification.entity.NotificationChannel;
import com.shopstack.modules.notification.mapper.NotificationMapper;
import com.shopstack.modules.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class DefaultNotificationServiceImpl implements NotificationService {

   private final NotificationRepository repository;
    private final NotificationMapper mapper;
    private final JavaMailSender emailSender;
    private final CustomerRepository customerRepository;

    @Override
    public void sendMultiChannelNotification(UUID recipientId, String recipientType,
            com.shopstack.modules.notification.entity.NotificationType type, String title, String message) {
        for (NotificationChannel channel : new NotificationChannel[]{NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS}) {
            try {
                sendNotification(SendNotificationRequest.builder()
                        .recipientId(recipientId)
                        .recipientType(recipientType)
                        .type(type)
                        .channel(channel)
                        .title(title)
                        .message(message)
                        .build());
            } catch (Exception ex) {
                log.warn("Failed to send {} notification to {}", channel, recipientId, ex);
            }
        }
    }

    @Override
    public void broadcastToAllCustomers(com.shopstack.modules.notification.entity.NotificationType type, String title, String message) {
        List<Customer> allCustomers = customerRepository.findAll();
        for (Customer customer : allCustomers) {
            try {
                sendMultiChannelNotification(customer.getUser().getId(), "CUSTOMER", type, title, message);
            } catch (Exception ex) {
                log.warn("Failed to broadcast notification to customer {}", customer.getId(), ex);
            }
        }
        log.info("Broadcast '{}' sent to {} customers", title, allCustomers.size());
    }

    @Override
    public ApiResponse<NotificationResponse> sendNotification(
            SendNotificationRequest request) {

        Notification notification = mapper.toEntity(request);

        notification.setIsRead(false);
        notification.setSentAt(LocalDateTime.now());

        Notification saved = repository.save(notification);

        switch (saved.getChannel()) {

            case EMAIL -> sendEmail(saved);

            case SMS -> sendSms(saved);

            case PUSH -> sendPush(saved);

            case IN_APP -> log.info(
                    "In-app notification created for user {}",
                    saved.getRecipientId()
            );
        }

        return ApiResponseBuilder.success(
                "Notification sent successfully",
                mapper.toResponse(saved)
        );
    }

    private void sendEmail(Notification notification) {

        try {

            Customer customer = customerRepository
                    .findByUser_Id(notification.getRecipientId())
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Customer not found for user: "
                                            + notification.getRecipientId()
                            )
                    );

            String email = customer.getEmail();

            if (email == null || email.isBlank()) {
                log.warn(
                        "Customer {} does not have an email address",
                        customer.getId()
                );
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();

            message.setTo(email);
            message.setSubject(notification.getTitle());
            message.setText(notification.getMessage());

            emailSender.send(message);

            log.info(
                    "Email notification sent successfully to {}",
                    email
            );

        } catch (Exception ex) {

            log.error(
                    "Email notification could not be sent for user {}",
                    notification.getRecipientId(),
                    ex
            );
        }
    }

    private void sendSms(Notification notification) {

        log.info(
                "SMS notification queued for user {}: {}",
                notification.getRecipientId(),
                notification.getMessage()
        );
    }

    private void sendPush(Notification notification) {

        log.info(
                "Push notification queued for user {}: {}",
                notification.getRecipientId(),
                notification.getMessage()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<NotificationResponse>> getNotificationsForUser(
            UUID id) {

        return ApiResponseBuilder.success(
                "Notifications fetched successfully",
                mapper.toResponseList(
                        repository.findByRecipientIdOrderByCreatedAtDesc(id)
                )
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<NotificationResponse>> getUnreadNotifications(
            UUID id) {

        return ApiResponseBuilder.success(
                "Unread notifications fetched successfully",
                mapper.toResponseList(
                        repository.findByRecipientIdAndIsReadFalse(id)
                )
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<Long> getUnreadCount(UUID id) {

        return ApiResponseBuilder.success(
                "Unread notification count fetched successfully",
                repository.countByRecipientIdAndIsReadFalse(id)
        );
    }

    @Override
    public ApiResponse<Void> markAsRead(UUID id) {

        Notification notification = repository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "NOTIF_001: Notification not found."
                        )
                );

        notification.setIsRead(true);

        repository.save(notification);

        return ApiResponseBuilder.success(
                "Notification marked as read"
        );
    }

    @Override
    public ApiResponse<Void> markAllAsRead(UUID id) {

        List<Notification> notifications =
                repository.findByRecipientIdAndIsReadFalse(id);

        notifications.forEach(notification ->
                notification.setIsRead(true)
        );

        repository.saveAll(notifications);

        return ApiResponseBuilder.success(
                "Notifications marked as read"
        );
    }
}