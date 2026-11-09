package com.urbanroute.infrastructure.transaction;

import com.urbanroute.application.port.TransactionRunner;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class SpringTransactionRunner implements TransactionRunner {
    private final TransactionTemplate writeTransaction;
    private final TransactionTemplate readTransaction;

    public SpringTransactionRunner(PlatformTransactionManager manager) {
        writeTransaction = new TransactionTemplate(manager);
        readTransaction = new TransactionTemplate(manager);
        readTransaction.setReadOnly(true);
    }

    @Override
    public <T> T write(Supplier<T> work) {
        return writeTransaction.execute(status -> work.get());
    }

    @Override
    public <T> T readOnly(Supplier<T> work) {
        return readTransaction.execute(status -> work.get());
    }
}
