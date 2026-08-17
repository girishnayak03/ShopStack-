package com.shopstack.modules.vendor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "vendor_sales_summary",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_vendor_summary_date", columnNames = {"vendor_id", "summary_date"})
    },
    indexes = {
        @Index(name = "idx_sales_summary_vendor_date", columnList = "vendor_id, summary_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorSalesSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "summary_id")
    private Long summaryId;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Builder.Default
    @Column(name = "total_orders", nullable = false)
    private Integer totalOrders = 0;

    @Builder.Default
    @Column(name = "total_units_sold", nullable = false)
    private Integer totalUnitsSold = 0;

    @Builder.Default
    @Column(name = "gross_revenue", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossRevenue = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "commission_deducted", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionDeducted = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "net_payout", nullable = false, precision = 12, scale = 2)
    private BigDecimal netPayout = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "refunds_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundsAmount = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.grossRevenue == null) this.grossRevenue = BigDecimal.ZERO;
        if (this.commissionDeducted == null) this.commissionDeducted = BigDecimal.ZERO;
        if (this.netPayout == null) this.netPayout = BigDecimal.ZERO;
        if (this.refundsAmount == null) this.refundsAmount = BigDecimal.ZERO;
        if (this.totalOrders == null) this.totalOrders = 0;
        if (this.totalUnitsSold == null) this.totalUnitsSold = 0;
    }
}
