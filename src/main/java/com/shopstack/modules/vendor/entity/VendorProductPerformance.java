package com.shopstack.modules.vendor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "vendor_product_performance",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_vendor_product_summary_date", columnNames = {"vendor_id", "product_id", "summary_date"})
    },
    indexes = {
        @Index(name = "idx_prod_perf_vendor_date", columnList = "vendor_id, summary_date"),
        @Index(name = "idx_prod_perf_product_date", columnList = "product_id, summary_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorProductPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "performance_id")
    private Long performanceId;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    @Builder.Default
    @Column(name = "units_sold", nullable = false)
    private Integer unitsSold = 0;

    @Builder.Default
    @Column(name = "revenue", nullable = false, precision = 12, scale = 2)
    private BigDecimal revenue = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "views", nullable = false)
    private Integer views = 0;

    @Builder.Default
    @Column(name = "avg_rating", nullable = false, precision = 3, scale = 2)
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "return_count", nullable = false)
    private Integer returnCount = 0;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        if (this.unitsSold == null) this.unitsSold = 0;
        if (this.revenue == null) this.revenue = BigDecimal.ZERO;
        if (this.views == null) this.views = 0;
        if (this.avgRating == null) this.avgRating = BigDecimal.ZERO;
        if (this.returnCount == null) this.returnCount = 0;
    }
}
