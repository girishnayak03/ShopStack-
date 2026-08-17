package com.shopstack.common.exception;

public class DuplicatePayoutException extends ConflictException {
    public DuplicatePayoutException(String message) {
        super(message);
    }
}
