package com.shopstack.modules.order.service;

import com.shopstack.modules.cart.entity.Cart;
import com.shopstack.modules.cart.entity.CartItem;
import com.shopstack.modules.cart.repository.CartRepository;
import com.shopstack.modules.order.entity.Order;
import com.shopstack.modules.order.entity.OrderItem;
import com.shopstack.modules.order.entity.ShippingAddress;
import com.shopstack.modules.order.repository.OrderRepository;
import com.shopstack.modules.coupon.dto.responses.CouponValidationResponse;
import com.shopstack.modules.coupon.service.CouponService;
import com.shopstack.modules.payment.entity.Payment;
import com.shopstack.modules.payment.service.PaymentService;
import com.shopstack.modules.product.entity.Product;
import com.shopstack.modules.product.repository.ProductRepository;
import com.shopstack.modules.user.entity.User;
import com.shopstack.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import com.shopstack.modules.customer.repository.CustomerRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final CouponService couponService;
    private final com.shopstack.modules.inventory.service.InventoryService inventoryService;
    private final com.shopstack.modules.notification.service.NotificationService notificationService;
    //private final EmailService emailService;
    private final CustomerRepository customerRepository;

    @Transactional
    public Map<String, Object> processCheckout(Map<String, Object> checkoutRequest) {

        UUID userId = null;
        try {
            if (checkoutRequest.get("userId") != null) {
                userId = UUID.fromString((String) checkoutRequest.get("userId"));
            }
        } catch (Exception ignored) {}

        ShippingAddress shippingAddress = extractShippingAddress(checkoutRequest);

        String addressId = checkoutRequest.get("addressId") != null ? (String) checkoutRequest.get("addressId") : "DEFAULT-ADDRESS";
        String paymentMethod = checkoutRequest.get("paymentMethod") != null ? (String) checkoutRequest.get("paymentMethod") : "COD";
        String couponCode = checkoutRequest.get("couponCode") != null ? (String) checkoutRequest.get("couponCode") : "";

        final UUID targetUserId = userId;
        User user = (targetUserId != null ? userRepository.findById(targetUserId) : java.util.Optional.<User>empty())
                .orElseGet(() -> userRepository.findAll().stream().findFirst().orElse(null));

        Cart cart = targetUserId != null ? cartRepository.findByUserId(targetUserId).orElse(null) : null;
        List<Map<String, Object>> requestItems = (List<Map<String, Object>>) checkoutRequest.get("items");

        double totalAmount = 0.0;
        List<OrderItem> orderItems = new ArrayList<>();

        if (cart != null && cart.getItems() != null && !cart.getItems().isEmpty()) {
            for (CartItem cartItem : cart.getItems()) {
                Product product = cartItem.getProduct();
                if (product.getStockQuantity() < cartItem.getQuantity()) {
                    throw new RuntimeException("Insufficient stock for: " + product.getProductName());
                }
                double lineTotal = product.getPrice().doubleValue() * cartItem.getQuantity();
                totalAmount += lineTotal;

                OrderItem orderItem = new OrderItem();

                orderItem.setProduct(product);
                orderItem.setProductId(product.getId().toString());
                orderItem.setProductName(product.getProductName());
                orderItem.setProductImage(product.getImageUrl());

                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setPrice(product.getPrice().doubleValue());
                orderItems.add(orderItem);

                product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
                productRepository.save(product);
            }
            cart.getItems().clear();
            cartRepository.save(cart);
        } else if (requestItems != null && !requestItems.isEmpty()) {
            for (Map<String, Object> itemMap : requestItems) {
                UUID prodId = UUID.fromString((String) itemMap.get("productId"));
                int qty = ((Number) itemMap.get("quantity")).intValue();

                Product product = productRepository.findById(prodId)
                        .orElseThrow(() -> new RuntimeException("Product not found: " + prodId));

                if (product.getStockQuantity() < qty) {
                    throw new RuntimeException("Insufficient stock for: " + product.getProductName());
                }

                double lineTotal = product.getPrice().doubleValue() * qty;
                totalAmount += lineTotal;

               OrderItem orderItem = new OrderItem();

                orderItem.setProduct(product);
                orderItem.setProductId(product.getId().toString());
                orderItem.setProductName(product.getProductName());
                orderItem.setProductImage(product.getImageUrl());

                orderItem.setQuantity(qty);
                orderItem.setPrice(product.getPrice().doubleValue());
                orderItems.add(orderItem);

                product.setStockQuantity(product.getStockQuantity() - qty);
                productRepository.save(product);
            }
        } else {
            throw new RuntimeException("Cannot checkout with an empty cart");
        }

        java.math.BigDecimal discountApplied = java.math.BigDecimal.ZERO;
        java.util.UUID appliedCouponId = null;

        if (couponCode != null && !couponCode.isBlank()) {
            CouponValidationResponse validation = couponService.validateCoupon(
                    couponCode, targetUserId, java.math.BigDecimal.valueOf(totalAmount));
            discountApplied = validation.getDiscountAmount();
            appliedCouponId = validation.getCouponId();
            totalAmount = totalAmount - discountApplied.doubleValue();
        }

        double gstAmount = totalAmount * 0.18;
        double finalAmount = totalAmount + gstAmount;

        Order order = new Order();
        order.setUser(user);
        order.setAddressId(addressId);
        order.setTotalAmount(finalAmount);
        order.setStatus("COD".equalsIgnoreCase(paymentMethod) ? "CONFIRMED" : "PAYMENT_PENDING");

        order.setShippingAddress(shippingAddress);

        order.setEstimatedDelivery(LocalDateTime.now().plusDays(7));

        for (OrderItem item : orderItems) {
            item.setOrder(order);
        }
        order.setItems(orderItems);
        order = orderRepository.save(order);

        // Reserve stock in inventory
        for (OrderItem item : orderItems) {
            try {
                inventoryService.reserveStock(
                    UUID.fromString(item.getProductId()), 
                    item.getQuantity(), 
                    order.getId(), 
                    user.getId()
                );
            } catch (Exception e) {
                throw new RuntimeException("Failed to reserve stock: " + e.getMessage(), e);
            }
        }

       // Send Order Placed Notification — in-app only
        try {
            notificationService.sendNotification(
                com.shopstack.modules.notification.dto.SendNotificationRequest.builder()
                    .recipientId(user.getId())
                    .recipientType("CUSTOMER")
                    .type(com.shopstack.modules.notification.entity.NotificationType.ORDER_UPDATE)
                    .channel(com.shopstack.modules.notification.entity.NotificationChannel.IN_APP)
                    .title("Order Placed")
                    .message("Your ShopStack order #" + order.getId() + " has been placed successfully. Order Status: " + order.getStatus())
                    .build()
            );
        } catch (Exception e) {
            log.error("Failed to send order placed notification for order {}", order.getId(), e);
        }
        
        if (appliedCouponId != null) {
            couponService.recordCouponUsage(appliedCouponId, targetUserId, order.getId(), discountApplied);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getId().toString());
        response.put("amount", finalAmount);
        response.put("currency", "INR");

        if ("COD".equalsIgnoreCase(paymentMethod)) {
            response.put("paymentId", null);
            response.put("status", "SUCCESS");
        } else {
            try {
                Payment payment = paymentService.createPayment(order.getId(), finalAmount, "INR");
                response.put("paymentId", payment.getRazorpayOrderId());
                response.put("status", "PENDING");
            } catch (Exception e) {
                String mockPaymentId = "order_simulated_" + System.currentTimeMillis();
                response.put("paymentId", mockPaymentId);
                response.put("status", "PENDING");
            }
        }

        return response;
    }

    private ShippingAddress extractShippingAddress(Map<String, Object> checkoutRequest) {

    ShippingAddress address = new ShippingAddress();

    Object shippingAddressObj = checkoutRequest.get("shippingAddress");

    if (shippingAddressObj instanceof Map) {

        Map<String, Object> addressMap =
                (Map<String, Object>) shippingAddressObj;

        address.setStreet(
                getString(addressMap, "street",
                        getString(addressMap, "addressLine1", ""))
        );

        address.setCity(
                getString(addressMap, "city", "")
        );

        address.setState(
                getString(addressMap, "state", "")
        );

        address.setZipCode(
                getString(addressMap, "zipCode",
                        getString(addressMap, "postalCode",
                                getString(addressMap, "zip",
                                        getString(addressMap, "pincode", ""))))
        );

        address.setCountry(
                getString(addressMap, "country", "India")
        );

    } else {

        // Fallback if frontend sends fields directly
        address.setStreet(
                getString(checkoutRequest, "addressLine1",
                        getString(checkoutRequest, "street", ""))
        );

        address.setCity(
                getString(checkoutRequest, "city", "")
        );

        address.setState(
                getString(checkoutRequest, "state", "")
        );

        address.setZipCode(
                getString(checkoutRequest, "zip",
                        getString(checkoutRequest, "zipCode",
                                getString(checkoutRequest, "postalCode",
                                        getString(checkoutRequest, "pincode", ""))))
        );

        address.setCountry(
                getString(checkoutRequest, "country", "India")
        );
    }

    return address;
}

private String getString(Map<String, Object> map, String key, String defaultValue) {

    Object value = map.get(key);

    if (value == null) {
        return defaultValue;
    }

    return String.valueOf(value);
}
}