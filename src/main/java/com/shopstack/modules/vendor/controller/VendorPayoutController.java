package com.shopstack.modules.vendor.controller;

import com.shopstack.common.security.SecurityUtil;
import com.shopstack.modules.vendor.dto.requests.CreatePayoutRequest;
import com.shopstack.modules.vendor.dto.requests.ProcessPayoutRequest;
import com.shopstack.modules.vendor.dto.responses.VendorPayoutDto;
import com.shopstack.modules.vendor.entity.Vendor;
import com.shopstack.modules.vendor.enums.PayoutStatus;
import com.shopstack.modules.vendor.service.VendorPayoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class VendorPayoutController {

    private final VendorPayoutService payoutService;
    private final SecurityUtil securityUtil;

    // ---- Vendor Payout Endpoints ----

    @GetMapping("/vendors/me/payouts")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Page<VendorPayoutDto>> getMyPayouts(Pageable pageable) {
        Vendor vendor = securityUtil.getCurrentVendor();
        return ResponseEntity.ok(payoutService.getVendorPayouts(vendor.getVendorId(), pageable));
    }

    @GetMapping("/vendors/{vendorId}/payouts")
    @PreAuthorize("hasAnyRole('VENDOR', 'ADMIN')")
    public ResponseEntity<Page<VendorPayoutDto>> getVendorPayouts(
            @PathVariable Long vendorId,
            Pageable pageable) {

        if (!securityUtil.isCurrentUserAdmin()) {
            Vendor vendor = securityUtil.getCurrentVendor();
            if (!Objects.equals(vendor.getVendorId(), vendorId)) {
                throw new com.shopstack.common.exception.ForbiddenException("Access denied. Vendors can only view their own payouts.");
            }
        }

        return ResponseEntity.ok(payoutService.getVendorPayouts(vendorId, pageable));
    }

    // ---- Admin Payout Endpoints ----

    @GetMapping("/admin/vendor-payouts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<VendorPayoutDto>> getAllPayouts(
            @RequestParam(required = false) PayoutStatus status,
            Pageable pageable) {

        return ResponseEntity.ok(payoutService.getAllPayouts(status, pageable));
    }

    @GetMapping("/admin/vendor-payouts/{payoutId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorPayoutDto> getPayoutById(@PathVariable Long payoutId) {
        return ResponseEntity.ok(payoutService.getPayoutById(payoutId));
    }

    @PostMapping("/admin/vendor-payouts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorPayoutDto> createPayout(@Valid @RequestBody CreatePayoutRequest request) {
        VendorPayoutDto dto = payoutService.createPayout(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/admin/vendor-payouts/{payoutId}/process")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VendorPayoutDto> processPayout(
            @PathVariable Long payoutId,
            @Valid @RequestBody ProcessPayoutRequest request) {

        return ResponseEntity.ok(payoutService.processPayout(payoutId, request));
    }
}
