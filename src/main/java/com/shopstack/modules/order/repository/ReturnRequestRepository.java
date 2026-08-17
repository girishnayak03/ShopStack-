package com.shopstack.modules.order.repository;

import com.shopstack.modules.order.entity.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, UUID> {
    List<ReturnRequest> findByOrderId(UUID orderId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT r FROM ReturnRequest r JOIN r.order o JOIN o.items i JOIN i.product p " +
        "WHERE p.vendorId = :vendorId AND r.createdAt BETWEEN :start AND :end"
    )
    List<ReturnRequest> findByVendorIdAndCreatedAtBetween(
            @org.springframework.data.repository.query.Param("vendorId") Long vendorId,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}

