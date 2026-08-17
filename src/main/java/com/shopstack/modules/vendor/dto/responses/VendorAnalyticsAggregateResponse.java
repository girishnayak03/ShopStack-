package com.shopstack.modules.vendor.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorAnalyticsAggregateResponse {

    private Long vendorId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalOrders;
    private Integer totalUnitsSold;
    private BigDecimal grossRevenue;
    private BigDecimal commissionDeducted;
    private BigDecimal refundsAmount;
    private BigDecimal netPayout;

    private List<VendorSalesSummaryDto> dailySummaries;
}
