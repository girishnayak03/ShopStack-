package com.shopstack.modules.order.service; 
 
import com.shopstack.common.enums.OrderStatus; 
import com.shopstack.modules.order.entity.Order; 
import com.shopstack.modules.order.entity.ReturnRequest; 
import com.shopstack.modules.order.repository.OrderRepository; 
import lombok.RequiredArgsConstructor; 
import lombok.extern.slf4j.Slf4j; 
import org.springframework.stereotype.Service; 
 
@Service 
@RequiredArgsConstructor 
@Slf4j 
public class RefundService { 
 
    private final OrderRepository orderRepository; 
    private final CommissionService commissionService; 
 
    /** 
     * Simulates processing a refund for an approved return request. 
     */ 
    public void processRefund(ReturnRequest returnRequest) { 
        log.info("Processing refund for return request: " + returnRequest.getId() + " - Method: " + returnRequest.getRefundType()); 
         
        Order order = returnRequest.getOrder(); 
        order.setStatus(OrderStatus.REFUNDED.name()); 
        orderRepository.save(order); 
         
        commissionService.createRefundReversalForOrder(order.getId()); 
         
        log.info("Refund processed for order: " + order.getId()); 
    } 
} 
