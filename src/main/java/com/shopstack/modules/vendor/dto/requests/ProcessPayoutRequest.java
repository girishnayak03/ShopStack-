package com.shopstack.modules.vendor.dto.requests;

import com.shopstack.modules.vendor.enums.PayoutStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessPayoutRequest {

    @NotNull(message = "Target payout status is required")
    private PayoutStatus status;

    private String transactionRef;
    private String notes;
}
