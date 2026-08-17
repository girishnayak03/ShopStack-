package com.shopstack.modules.order.service;

import com.shopstack.common.enums.OrderStatus;
import com.shopstack.modules.order.entity.Order;
import com.shopstack.modules.order.entity.OrderItem;
import com.shopstack.modules.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.shopstack.modules.order.dto.OrderStatusUpdate;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final com.shopstack.modules.inventory.service.InventoryService inventoryService;
    private final com.shopstack.modules.notification.service.NotificationService notificationService;
    private final com.shopstack.modules.systemlog.service.SystemLogService systemLogService;
    private final CommissionService commissionService;
    private final SimpMessagingTemplate messagingTemplate;
    

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByVendor(Long vendorId) {
        return orderRepository.findByVendorId(vendorId);
    }

    public List<Order> getOrders(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required to fetch orders");
        }
        return orderRepository.findByUserId(userId);
    }

    public List<Order> getReturns(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required to fetch return orders");
        }
        return orderRepository.findByUserIdAndStatusIn(userId, List.of("RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_PICKED", "RETURN_RECEIVED", "REFUND_INITIATED", "REFUND_COMPLETED", "RETURNED", "REFUNDED"));
    }

    public Order getOrderById(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
    }

    public Order updateStatus(UUID orderId, String status) {
        Order order = getOrderById(orderId);
        order.setStatus(status.toUpperCase());
        Order saved = orderRepository.save(order);

        broadcastOrderStatus(saved);
        
        if ("CONFIRMED".equalsIgnoreCase(status)) {
            commissionService.createCommissionLedger(saved);
        } else if ("CANCELLED".equalsIgnoreCase(status) || "REFUNDED".equalsIgnoreCase(status) || "RETURNED".equalsIgnoreCase(status) || "REFUND_COMPLETED".equalsIgnoreCase(status)) {
            commissionService.createRefundReversalForOrder(orderId);
        }
        
        return saved;
    }

    public void updateOrderStatus(UUID orderId, OrderStatus orderStatus, String s, String system) {
        Order order = orderRepository.getReferenceById(orderId);
        order.setStatus(String.valueOf(orderStatus));
        Order saved = orderRepository.save(order);

        broadcastOrderStatus(saved);
        
        String status = String.valueOf(orderStatus);
        if ("CONFIRMED".equalsIgnoreCase(status)) {
            commissionService.createCommissionLedger(saved);
        } else if ("CANCELLED".equalsIgnoreCase(status) || "REFUNDED".equalsIgnoreCase(status) || "RETURNED".equalsIgnoreCase(status) || "REFUND_COMPLETED".equalsIgnoreCase(status)) {
            commissionService.createRefundReversalForOrder(orderId);
        }
    }

    public Order acceptOrder(UUID orderId) {
        Order order = getOrderById(orderId);
        order.setStatus("CONFIRMED");
        Order saved = orderRepository.save(order);
        
        broadcastOrderStatus(saved);
        commissionService.createCommissionLedger(saved);
        
        try {
            notificationService.sendNotification(
                com.shopstack.modules.notification.dto.SendNotificationRequest.builder()
                    .recipientId(order.getUser().getId())
                    .recipientType("CUSTOMER")
                    .type(com.shopstack.modules.notification.entity.NotificationType.ORDER_UPDATE)
                    .channel(com.shopstack.modules.notification.entity.NotificationChannel.IN_APP)
                    .title("Order Confirmed")
                    .message("Your order #" + orderId + " has been accepted by the merchant and is being prepared.")
                    .build()
            );
        } catch (Exception ignored) {}

        systemLogService.log("ORDER", "Order Accepted", order.getUser() != null ? order.getUser().getId() : null, "Vendor", "INFO", "Order accepted: " + orderId);
        return saved;
    }

    public Order rejectOrder(UUID orderId) {
        Order order = getOrderById(orderId);
        order.setStatus("CANCELLED");
        Order saved = orderRepository.save(order);

        broadcastOrderStatus(saved);

        commissionService.createRefundReversalForOrder(orderId);

        UUID customerId = order.getUser() != null ? order.getUser().getId() : null;
        try {
            inventoryService.releaseStock(orderId, customerId);
        } catch (Exception ignored) {}

        try {
            notificationService.sendNotification(
                com.shopstack.modules.notification.dto.SendNotificationRequest.builder()
                    .recipientId(customerId != null ? customerId : UUID.randomUUID())
                    .recipientType("CUSTOMER")
                    .type(com.shopstack.modules.notification.entity.NotificationType.ORDER_UPDATE)
                    .channel(com.shopstack.modules.notification.entity.NotificationChannel.IN_APP)
                    .title("Order Rejected")
                    .message("Your order #" + orderId + " was rejected by the merchant and has been cancelled. Any payment will be refunded.")
                    .build()
            );
        } catch (Exception ignored) {}

        systemLogService.log("ORDER", "Order Rejected", customerId, "Vendor", "INFO", "Order rejected: " + orderId);
        return saved;
    }

    public Order packOrder(UUID orderId) {
        Order order = getOrderById(orderId);
        order.setStatus("PACKING");
        Order saved = orderRepository.save(order);

        broadcastOrderStatus(saved);

        try {
            notificationService.sendNotification(
                com.shopstack.modules.notification.dto.SendNotificationRequest.builder()
                    .recipientId(order.getUser().getId())
                    .recipientType("CUSTOMER")
                    .type(com.shopstack.modules.notification.entity.NotificationType.ORDER_UPDATE)
                    .channel(com.shopstack.modules.notification.entity.NotificationChannel.IN_APP)
                    .title("Order Packing Started")
                    .message("Your order #" + orderId + " is now packed and preparing for pickup.")
                    .build()
            );
        } catch (Exception ignored) {}

        systemLogService.log("ORDER", "Order Packed", order.getUser() != null ? order.getUser().getId() : null, "Vendor", "INFO", "Order packed: " + orderId);
        return saved;
    }

    public Order readyForPickup(UUID orderId) {
        Order order = getOrderById(orderId);
        order.setStatus("READY_FOR_PICKUP");
        Order saved = orderRepository.save(order);

        broadcastOrderStatus(saved);

        try {
            notificationService.sendNotification(
                com.shopstack.modules.notification.dto.SendNotificationRequest.builder()
                    .recipientId(order.getUser().getId())
                    .recipientType("CUSTOMER")
                    .type(com.shopstack.modules.notification.entity.NotificationType.ORDER_UPDATE)
                    .channel(com.shopstack.modules.notification.entity.NotificationChannel.IN_APP)
                    .title("Order Ready for Courier")
                    .message("Your order #" + orderId + " is ready for courier pickup.")
                    .build()
            );
        } catch (Exception ignored) {}

        systemLogService.log("ORDER", "Order Ready for Pickup", order.getUser() != null ? order.getUser().getId() : null, "Vendor", "INFO", "Order ready for pickup: " + orderId);
        return saved;
    }

    public String generatePackingSlip(UUID orderId) {
        Order order = getOrderById(orderId);
        String filename = "packing_slip_" + orderId + ".pdf";
        java.io.File dir = new java.io.File("invoice-files");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        String filePath = "invoice-files/" + filename;
        com.itextpdf.text.Document document = new com.itextpdf.text.Document();
        try {
            com.itextpdf.text.pdf.PdfWriter.getInstance(document, new java.io.FileOutputStream(filePath));
            document.open();
            document.add(new com.itextpdf.text.Paragraph("ShopStack Packing Slip"));
            document.add(new com.itextpdf.text.Paragraph("Order ID: " + orderId));
            document.add(new com.itextpdf.text.Paragraph("Date: " + order.getCreatedAt()));
            document.add(new com.itextpdf.text.Paragraph("----------------------------------------"));
            if (order.getShippingAddress() != null) {
                document.add(new com.itextpdf.text.Paragraph("Shipping Address:"));
                document.add(new com.itextpdf.text.Paragraph(order.getShippingAddress().getStreet()));
                document.add(new com.itextpdf.text.Paragraph(order.getShippingAddress().getCity() + ", " + order.getShippingAddress().getState() + " - " + order.getShippingAddress().getZipCode()));
            }
            document.add(new com.itextpdf.text.Paragraph("----------------------------------------"));
            document.add(new com.itextpdf.text.Paragraph("Items to Pack:"));
            for (OrderItem item : order.getItems()) {
                document.add(new com.itextpdf.text.Paragraph("- " + item.getProductName() + " (Qty: " + item.getQuantity() + ")"));
            }
            document.close();
            return filePath;
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF packing slip", e);
        }
    }
    private void broadcastOrderStatus(Order order) {
    try {
        UUID customerId = order.getUser() != null
                ? order.getUser().getId()
                : null;

        if (customerId == null) {
            return;
        }

        messagingTemplate.convertAndSend(
                "/topic/orders/" + customerId,
                new OrderStatusUpdate(
                        order.getId(),
                        order.getStatus()
                )
        );

    } catch (Exception e) {
        System.err.println(
                "Failed to broadcast order status: " + e.getMessage()
        );
    }
}
}