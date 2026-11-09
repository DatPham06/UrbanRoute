package com.urbanroute.application.history;

import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.application.port.TransactionRunner;
import com.urbanroute.domain.model.HistoryRecord;
import java.util.List;

public class HistoryService {
    private final HistoryRepository history;
    private final TransactionRunner transactions;

    public HistoryService(HistoryRepository history, TransactionRunner transactions) {
        this.history = history;
        this.transactions = transactions;
    }

    public List<HistoryRecord> findByDriver(long driverId) {
        return transactions.readOnly(() -> history.findByDriver(driverId));
    }

    public List<HistoryRecord> findAll() {
        return transactions.readOnly(history::findAll);
    }
}
