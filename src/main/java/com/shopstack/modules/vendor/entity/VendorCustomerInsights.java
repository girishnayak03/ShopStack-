package com.shopstack.modules.vendor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "vendor_customer_insights",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_vendor_customer_summary_date", columnNames = {"vendor_id", "summary_date"})
    },
    indexes = {
        @Index(name = "idx_cust_insights_vendor_date", columnList = "vendor_id, summary_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorCustomerInsights {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "insight_id")
    private Long insightId;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Builder.Default
    @Column(name = "new_customers", nullable = false)
    private Integer newCustomers = 0;

    @Builder.Default
    @Column(name = "repeat_customers", nullable = false)
    private Integer repeatCustomers = 0;

    @Builder.Default
    @Column(name = "avg_order_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal avgOrderValue = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.newCustomers == null) this.newCustomers = 0;
        if (this.repeatCustomers == null) this.repeatCustomers = 0;
        if (this.avgOrderValue == null) this.avgOrderValue = BigDecimal.ZERO;
    }
}
