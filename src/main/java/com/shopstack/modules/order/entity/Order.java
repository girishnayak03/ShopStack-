package com.shopstack.modules.order.entity;

import com.shopstack.common.audit.BaseEntity;
import com.shopstack.modules.order.service.ShipmentService;
import com.shopstack.modules.user.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Order extends BaseEntity {

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "user_id", nullable = true)
        private User user;

    @Column(name = "address_id")
    private String addressId; // Can be a string to allow guests to just store address text or a reference

    @Column(nullable = false)
    private Double totalAmount;
    
    @Column(nullable = false)
    private String status; // PENDING, PAID, FAILED, SHIPPED, DELIVERED

   @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private java.time.LocalDateTime estimatedDelivery;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private java.time.LocalDateTime shippedDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private java.time.LocalDateTime deliveredAt;

    private String trackingNumber;

    @JsonManagedReference
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Embedded 
    private ShippingAddress shippingAddress;

    public List<OrderItem> getItems() {
    if (items == null) {
        items = new ArrayList<>();
    }
    return items;
}
}