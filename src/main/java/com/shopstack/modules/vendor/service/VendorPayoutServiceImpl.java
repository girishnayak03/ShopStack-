package com.shopstack.modules.vendor.service;

import com.shopstack.common.exception.DuplicatePayoutException;
import com.shopstack.common.exception.InvalidPayoutStateException;
import com.shopstack.common.exception.PayoutNotFoundException;
import com.shopstack.common.exception.ResourceNotFoundException;
import com.shopstack.modules.vendor.dto.requests.CreatePayoutRequest;
import com.shopstack.modules.vendor.dto.requests.ProcessPayoutRequest;
import com.shopstack.modules.vendor.dto.responses.VendorPayoutDto;
import com.shopstack.modules.vendor.entity.Vendor;
import com.shopstack.modules.vendor.entity.VendorPayout;
import com.shopstack.modules.vendor.entity.VendorSalesSummary;
import com.shopstack.modules.vendor.enums.PayoutStatus;
import com.shopstack.modules.vendor.repository.VendorPayoutRepository;
import com.shopstack.modules.vendor.repository.VendorRepository;
import com.shopstack.modules.vendor.repository.VendorSalesSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VendorPayoutServiceImpl implements VendorPayoutService {

    private final VendorPayoutRepository payoutRepository;
    private final VendorRepository vendorRepository;
    private final VendorSalesSummaryRepository salesSummaryRepository;
    private final VendorAnalyticsAggregationService aggregationService;

    @Override
    public VendorPayoutDto createPayout(CreatePayoutRequest request) {
        Long vendorId = request.getVendorId();
        LocalDate start = request.getStartDate();
        LocalDate end = request.getEndDate();

        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + vendorId));

        if (start.isAfter(end)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }

        // Idempotency check: prevent duplicate payouts for the exact same period
        boolean duplicate = payoutRepository.existsByVendorIdAndPayoutPeriodStartAndPayoutPeriodEndAndStatusNot(
                vendorId, start, end, PayoutStatus.CANCELLED);
        if (duplicate) {
            throw new DuplicatePayoutException("A payout record already exists for vendor " + vendorId + " for period " + start + " to " + end);
        }

        // Ensure analytics are aggregated for all dates in the payout period
        LocalDate current = start;
        while (!current.isAfter(end)) {
            aggregationService.aggregateVendorAnalyticsForDate(vendorId, current);
            current = current.plusDays(1);
        }

        List<VendorSalesSummary> summaries = salesSummaryRepository
                .findByVendorIdAndSummaryDateBetweenOrderBySummaryDateAsc(vendorId, start, end);

        BigDecimal totalSales = summaries.stream()
                .map(VendorSalesSummary::getGrossRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal commissionAmount = summaries.stream()
                .map(VendorSalesSummary::getCommissionDeducted)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal netAmount = summaries.stream()
                .map(VendorSalesSummary::getNetPayout)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        VendorPayout payout = VendorPayout.builder()
                .vendorId(vendorId)
                .payoutPeriodStart(start)
                .payoutPeriodEnd(end)
                .totalSales(totalSales)
                .commissionAmount(commissionAmount)
                .netAmount(netAmount)
                .status(PayoutStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        VendorPayout saved = payoutRepository.save(payout);
        log.info("Created PENDING payout ID {} for vendor ID {} (Period: {} to {}, Net Amount: {})",
                saved.getPayoutId(), vendorId, start, end, netAmount);

        return mapToDto(saved, vendor.getBusinessName());
    }

    @Override
    public VendorPayoutDto processPayout(Long payoutId, ProcessPayoutRequest request) {
        VendorPayout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new PayoutNotFoundException("Payout not found with id: " + payoutId));

        PayoutStatus currentStatus = payout.getStatus();
        PayoutStatus targetStatus = request.getStatus();

        // Validate safe state transition
        validateStateTransition(currentStatus, targetStatus);

        payout.setStatus(targetStatus);
        if (request.getTransactionRef() != null && !request.getTransactionRef().isBlank()) {
            payout.setTransactionRef(request.getTransactionRef());
        }

        if (targetStatus == PayoutStatus.COMPLETED || targetStatus == PayoutStatus.FAILED || targetStatus == PayoutStatus.PROCESSING) {
            payout.setProcessedAt(LocalDateTime.now());
        }

        VendorPayout saved = payoutRepository.save(payout);
        log.info("Transitioned payout ID {} from {} to {}", payoutId, currentStatus, targetStatus);

        String vendorName = vendorRepository.findById(saved.getVendorId())
                .map(Vendor::getBusinessName)
                .orElse("Unknown Vendor");

        return mapToDto(saved, vendorName);
    }

    @Override
    @Transactional(readOnly = true)
    public VendorPayoutDto getPayoutById(Long payoutId) {
        VendorPayout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new PayoutNotFoundException("Payout not found with id: " + payoutId));

        String vendorName = vendorRepository.findById(payout.getVendorId())
                .map(Vendor::getBusinessName)
                .orElse("Unknown Vendor");

        return mapToDto(payout, vendorName);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VendorPayoutDto> getVendorPayouts(Long vendorId, Pageable pageable) {
        if (!vendorRepository.existsById(vendorId)) {
            throw new ResourceNotFoundException("Vendor not found with id: " + vendorId);
        }

        String vendorName = vendorRepository.findById(vendorId)
                .map(Vendor::getBusinessName)
                .orElse("Vendor #" + vendorId);

        return payoutRepository.findByVendorIdOrderByCreatedAtDesc(vendorId, pageable)
                .map(p -> mapToDto(p, vendorName));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VendorPayoutDto> getAllPayouts(PayoutStatus status, Pageable pageable) {
        Page<VendorPayout> page = status != null
                ? payoutRepository.findByStatus(status, pageable)
                : payoutRepository.findAll(pageable);

        return page.map(p -> {
            String vendorName = vendorRepository.findById(p.getVendorId())
                    .map(Vendor::getBusinessName)
                    .orElse("Vendor #" + p.getVendorId());
            return mapToDto(p, vendorName);
        });
    }

    private void validateStateTransition(PayoutStatus current, PayoutStatus target) {
        if (current == target) {
            return;
        }

        if (current == PayoutStatus.COMPLETED) {
            throw new InvalidPayoutStateException("Cannot change status of a COMPLETED payout");
        }

        if (current == PayoutStatus.CANCELLED) {
            throw new InvalidPayoutStateException("Cannot change status of a CANCELLED payout");
        }

        if (target == PayoutStatus.PROCESSING && current != PayoutStatus.PENDING) {
            throw new InvalidPayoutStateException("Payout can only transition to PROCESSING from PENDING");
        }

        if (target == PayoutStatus.COMPLETED && (current != PayoutStatus.PROCESSING && current != PayoutStatus.PENDING)) {
            throw new InvalidPayoutStateException("Payout can only transition to COMPLETED from PENDING or PROCESSING");
        }

        if (target == PayoutStatus.FAILED && (current != PayoutStatus.PROCESSING && current != PayoutStatus.PENDING)) {
            throw new InvalidPayoutStateException("Payout can only transition to FAILED from PENDING or PROCESSING");
        }
    }

    private VendorPayoutDto mapToDto(VendorPayout p, String vendorBusinessName) {
        return VendorPayoutDto.builder()
                .payoutId(p.getPayoutId())
                .vendorId(p.getVendorId())
                .vendorBusinessName(vendorBusinessName)
                .payoutPeriodStart(p.getPayoutPeriodStart())
                .payoutPeriodEnd(p.getPayoutPeriodEnd())
                .totalSales(p.getTotalSales())
                .commissionAmount(p.getCommissionAmount())
                .netAmount(p.getNetAmount())
                .status(p.getStatus())
                .transactionRef(p.getTransactionRef())
                .processedAt(p.getProcessedAt())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
