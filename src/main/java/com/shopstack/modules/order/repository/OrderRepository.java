package com.shopstack.modules.order.repository;

import com.shopstack.modules.order.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUserId(UUID userId);

    List<Order> findByUserIdAndStatusIn(UUID userId, List<String> statuses);

    long countByStatus(String status);

    @Query("SELECT o FROM Order o WHERE o.createdAt BETWEEN :from AND :to ORDER BY o.createdAt DESC")
    List<Order> findAllInRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status <> 'CANCELLED'")
    Double sumTotalRevenue();

    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i JOIN i.product p WHERE p.vendorId = :vendorId ORDER BY o.createdAt DESC")
    List<Order> findByVendorId(@Param("vendorId") Long vendorId);

    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i JOIN i.product p " +
           "WHERE p.vendorId = :vendorId AND o.createdAt BETWEEN :start AND :end " +
           "AND o.status NOT IN ('CANCELLED', 'FAILED', 'PENDING')")
    List<Order> findQualifyingOrdersByVendorIdAndDateRange(
            @Param("vendorId") Long vendorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT o.id) FROM Order o JOIN o.items i JOIN i.product p " +
           "WHERE p.vendorId = :vendorId AND o.user.id = :userId AND o.createdAt < :before " +
           "AND o.status NOT IN ('CANCELLED', 'FAILED', 'PENDING')")
    long countQualifyingOrdersByVendorAndUserBefore(
            @Param("vendorId") Long vendorId,
            @Param("userId") UUID userId,
            @Param("before") LocalDateTime before);
}