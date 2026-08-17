package com.shopstack.common.exception;

public class PayoutNotFoundException extends ResourceNotFoundException {
    public PayoutNotFoundException(String message) {
        super(message);
    }
}
