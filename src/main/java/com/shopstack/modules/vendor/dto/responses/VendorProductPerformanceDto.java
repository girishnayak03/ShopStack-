package com.shopstack.modules.vendor.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorProductPerformanceDto {

    private Long performanceId;
    private Long vendorId;
    private UUID productId;
    private String productName;
    private LocalDate summaryDate;
    private Integer unitsSold;
    private BigDecimal revenue;
    private Integer views;
    private BigDecimal avgRating;
    private Integer returnCount;
}
