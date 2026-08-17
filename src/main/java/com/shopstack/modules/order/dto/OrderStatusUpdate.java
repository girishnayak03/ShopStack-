package com.shopstack.modules.order.dto;

import java.util.UUID;

public record OrderStatusUpdate(
        UUID orderId,
        String status
) {
}