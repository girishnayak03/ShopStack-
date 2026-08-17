package com.shopstack.modules.vendor.dto.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorCustomerInsightsDto {

    private Long insightId;
    private Long vendorId;
    private LocalDate summaryDate;
    private Integer newCustomers;
    private Integer repeatCustomers;
    private BigDecimal avgOrderValue;
}
