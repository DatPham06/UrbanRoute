package com.urbanroute.application.error;

public class ApplicationException extends RuntimeException {
    public enum Reason {
        INVALID_INPUT, NOT_FOUND, INVALID_CREDENTIALS
    }

    private final Reason reason;

    public ApplicationException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }
}
