package com.urbanroute.application.port;

import java.util.function.Supplier;

public interface TransactionRunner {
    <T> T write(Supplier<T> work);

    <T> T readOnly(Supplier<T> work);

    default void write(Runnable work) {
        write(() -> {
            work.run();
            return null;
        });
    }
}
