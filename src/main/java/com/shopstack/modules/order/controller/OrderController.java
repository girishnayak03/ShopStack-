package com.shopstack.modules.order.controller;

import com.shopstack.modules.order.entity.Order;
import com.shopstack.common.security.SecurityUtil;
import com.shopstack.modules.order.service.OrderService;
import com.shopstack.modules.order.service.ReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;
    private final ReturnService returnService;
    private final SecurityUtil securityUtil;
    private final com.shopstack.modules.order.service.ShipmentService shipmentService;

    @GetMapping
    public ResponseEntity<List<Order>> getOrders() {
        return ResponseEntity.ok(orderService.getOrders(securityUtil.getCurrentUser().getId()));
    }

    @GetMapping("/vendor")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<List<Order>> getVendorOrders() {
        try {
            var vendor = securityUtil.getCurrentVendor();
            if (vendor != null) {
                return ResponseEntity.ok(orderService.getOrdersByVendor(vendor.getVendorId()));
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/returns")
    public ResponseEntity<List<Order>> getReturnOrders() {
        return ResponseEntity.ok(orderService.getReturns(securityUtil.getCurrentUser().getId()));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrderById(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrderById(orderId));
    }

    @RequestMapping(value = "/{orderId}/status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<Order> updateOrderStatus(@PathVariable UUID orderId, @RequestParam String status) {
        return ResponseEntity.ok(orderService.updateStatus(orderId, status));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<Order> cancelOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.updateStatus(orderId, "CANCELLED"));
    }

    @PostMapping("/{orderId}/return")
    public ResponseEntity<?> returnOrder(@PathVariable UUID orderId, @RequestBody(required = false) java.util.Map<String, String> payload) {
        if (payload != null && payload.containsKey("reason")) {
            return ResponseEntity.ok(returnService.initiateReturn(orderId, payload));
        }
        return ResponseEntity.ok(orderService.updateStatus(orderId, "RETURNED"));
    }

    @GetMapping("/{orderId}/timeline")
    public ResponseEntity<List<java.util.Map<String, Object>>> getOrderTimeline(@PathVariable UUID orderId) {
        Order order = orderService.getOrderById(orderId);
        List<java.util.Map<String, Object>> timeline = new java.util.ArrayList<>();
        if (order != null) {
            timeline.add(java.util.Map.of("status", "PLACED", "timestamp", order.getCreatedAt() != null ? order.getCreatedAt().toString() : "Recent"));
            
            try {
                var shipment = shipmentService.getShipmentByOrder(String.valueOf(orderId));
                if (shipment != null && shipment.getTrackingEvents() != null) {
                    for (var event : shipment.getTrackingEvents()) {
                        timeline.add(java.util.Map.of(
                            "status", event.getEventType() != null ? event.getEventType().name() : "IN_TRANSIT",
                            "timestamp", event.getEventTime() != null ? event.getEventTime().toString() : ""
                        ));
                    }
                }
            } catch (Exception ignored) {}
            
            timeline.add(java.util.Map.of("status", order.getStatus() != null ? order.getStatus() : "PROCESSING", "timestamp", "Current"));
        }
        return ResponseEntity.ok(timeline);
    }

    @GetMapping("/{orderId}/tracking")
    public ResponseEntity<java.util.Map<String, Object>> getOrderTracking(@PathVariable UUID orderId) {
        Order order = orderService.getOrderById(orderId);
        java.util.Map<String, Object> tracking = new java.util.HashMap<>();
        tracking.put("orderId", orderId.toString());
        tracking.put("status", order != null ? order.getStatus() : "PENDING");
        
        try {
            var shipment = shipmentService.getShipmentByOrder(String.valueOf(orderId));
            if (shipment != null) {
                tracking.put("carrier", shipment.getCarrier() != null ? shipment.getCarrier() : "BlueDart Express");
                tracking.put("trackingNumber", shipment.getTrackingNumber());
                tracking.put("estimatedDelivery", shipment.getEstimatedDeliveryDate() != null ? shipment.getEstimatedDeliveryDate() : "");
                tracking.put("deliveredAt", shipment.getDeliveredAt() != null ? shipment.getDeliveredAt().toString() : "");
                
                List<java.util.Map<String, Object>> events = new java.util.ArrayList<>();
                if (shipment.getTrackingEvents() != null) {
                    for (var event : shipment.getTrackingEvents()) {
                        events.add(java.util.Map.of(
                            "status", event.getEventType() != null ? event.getEventType().name() : "IN_TRANSIT",
                            "location", event.getLocation() != null ? event.getLocation() : "Transit Hub",
                            "description", event.getDescription() != null ? event.getDescription() : "",
                            "timestamp", event.getEventTime() != null ? event.getEventTime().toString() : ""
                        ));
                    }
                }
                tracking.put("events", events);
                return ResponseEntity.ok(tracking);
            }
        } catch (Exception ignored) {}
        
        tracking.put("carrier", "BlueDart Express");
        tracking.put("trackingNumber", "BD" + Math.abs(orderId.hashCode()));
        tracking.put("events", java.util.Collections.emptyList());
        return ResponseEntity.ok(tracking);
    }

    @PostMapping("/{orderId}/accept")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Order> acceptOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.acceptOrder(orderId));
    }

    @PostMapping("/{orderId}/reject")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Order> rejectOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.rejectOrder(orderId));
    }

    @PostMapping("/{orderId}/pack")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Order> packOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.packOrder(orderId));
    }

    @PostMapping("/{orderId}/ready-pickup")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Order> readyForPickup(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.readyForPickup(orderId));
    }

    @GetMapping("/{orderId}/packing-slip")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('VENDOR', 'WAREHOUSE_STAFF', 'ADMIN')")
    public ResponseEntity<java.util.Map<String, String>> getPackingSlip(@PathVariable UUID orderId) {
        String path = orderService.generatePackingSlip(orderId);
        return ResponseEntity.ok(java.util.Map.of("pdfPath", "/" + path));
    }

    @GetMapping("/admin")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Order>> getAdminAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/admin/returns")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('VENDOR', 'WAREHOUSE_STAFF')")
    public ResponseEntity<List<com.shopstack.modules.order.entity.ReturnRequest>> getAdminAllReturns() {
        try {
            if (securityUtil.getCurrentUser().getRole().getName().equals("VENDOR")) {
                var vendor = securityUtil.getCurrentVendor();
                if (vendor != null) {
                    return ResponseEntity.ok(returnService.getReturnRequestsByVendor(vendor.getVendorId()));
                }
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(returnService.getAllReturnRequests());
    }

    @PutMapping("/admin/returns/{returnRequestId}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('VENDOR', 'WAREHOUSE_STAFF')")
    public ResponseEntity<com.shopstack.modules.order.entity.ReturnRequest> updateReturnStatus(@PathVariable UUID returnRequestId, @RequestParam String status) {
        return ResponseEntity.ok(returnService.updateReturnStatus(returnRequestId, status));
    }
}