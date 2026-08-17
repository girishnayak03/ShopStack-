package com.shopstack.modules.vendor.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorSalesSummaryDto {

    private Long summaryId;
    private Long vendorId;
    private LocalDate summaryDate;
    private Integer totalOrders;
    private Integer totalUnitsSold;
    private BigDecimal grossRevenue;
    private BigDecimal commissionDeducted;
    private BigDecimal netPayout;
    private BigDecimal refundsAmount;
    private LocalDateTime createdAt;
}
