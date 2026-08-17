package com.shopstack.modules.vendor.dto.responses;

import com.shopstack.modules.vendor.enums.PayoutStatus;
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
public class VendorPayoutDto {

    private Long payoutId;
    private Long vendorId;
    private String vendorBusinessName;
    private LocalDate payoutPeriodStart;
    private LocalDate payoutPeriodEnd;
    private BigDecimal totalSales;
    private BigDecimal commissionAmount;
    private BigDecimal netAmount;
    private PayoutStatus status;
    private String transactionRef;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
}
