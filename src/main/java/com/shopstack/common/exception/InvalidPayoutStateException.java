package com.shopstack.common.exception;

public class InvalidPayoutStateException extends BadRequestException {
    public InvalidPayoutStateException(String message) {
        super(message);
    }
}
