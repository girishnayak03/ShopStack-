package com.shopstack.modules.vendor.dto.requests;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePayoutRequest {

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;

    @NotNull(message = "Payout period start date is required")
    private LocalDate startDate;

    @NotNull(message = "Payout period end date is required")
    private LocalDate endDate;
}
