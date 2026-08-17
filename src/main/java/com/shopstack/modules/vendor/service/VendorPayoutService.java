package com.shopstack.modules.vendor.service;

import com.shopstack.modules.vendor.dto.requests.CreatePayoutRequest;
import com.shopstack.modules.vendor.dto.requests.ProcessPayoutRequest;
import com.shopstack.modules.vendor.dto.responses.VendorPayoutDto;
import com.shopstack.modules.vendor.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface VendorPayoutService {

    VendorPayoutDto createPayout(CreatePayoutRequest request);

    VendorPayoutDto processPayout(Long payoutId, ProcessPayoutRequest request);

    VendorPayoutDto getPayoutById(Long payoutId);

    Page<VendorPayoutDto> getVendorPayouts(Long vendorId, Pageable pageable);

    Page<VendorPayoutDto> getAllPayouts(PayoutStatus status, Pageable pageable);
}
