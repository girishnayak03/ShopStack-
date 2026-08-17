package com.shopstack.modules.vendor.repository;

import com.shopstack.modules.vendor.entity.VendorPayout;
import com.shopstack.modules.vendor.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface VendorPayoutRepository extends JpaRepository<VendorPayout, Long> {

    Page<VendorPayout> findByVendorIdOrderByCreatedAtDesc(Long vendorId, Pageable pageable);

    List<VendorPayout> findByVendorId(Long vendorId);

    Page<VendorPayout> findByStatus(PayoutStatus status, Pageable pageable);

    boolean existsByVendorIdAndPayoutPeriodStartAndPayoutPeriodEndAndStatusNot(
            Long vendorId, LocalDate start, LocalDate end, PayoutStatus status);
}
