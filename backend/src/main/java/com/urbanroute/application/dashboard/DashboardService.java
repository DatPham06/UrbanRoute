package com.urbanroute.application.dashboard;

import com.urbanroute.application.port.DeliveryPointRepository;
import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.application.port.TransactionRunner;
import com.urbanroute.domain.model.DeliveryPoint;
import com.urbanroute.domain.model.HistoryRecord;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class DashboardService {
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_LABEL = DateTimeFormatter.ofPattern("dd/MM");
    private final DeliveryPointRepository points;
    private final HistoryRepository history;
    private final TransactionRunner transactions;

    public DashboardService(DeliveryPointRepository points, HistoryRepository history, TransactionRunner transactions) {
        this.points = points;
        this.history = history;
        this.transactions = transactions;
    }

    public Stats stats() {
        return transactions.readOnly(() -> {
            List<DeliveryPoint> deliveryPoints = points.findAll(false);
            List<HistoryRecord> records = history.findAll();
            long active = deliveryPoints.stream().filter(DeliveryPoint::isActive).count();
            return new Stats(deliveryPoints.size(), active, deliveryPoints.size() - active, records.size(),
                    countStatus(records, "COMPLETED"), countStatus(records, "NO_PATH"),
                    records.stream().map(HistoryRecord::driverId).distinct().count(), false);
        });
    }

    public List<Trend> trends(int days) {
        return transactions.readOnly(() -> {
            Map<LocalDate, List<HistoryRecord>> byDate = history.findAll().stream()
                    .collect(Collectors.groupingBy(record -> record.searchedAt().toLocalDate()));
            LocalDate firstDay = LocalDate.now(APP_ZONE).minusDays(days - 1L);
            return IntStream.range(0, days).mapToObj(offset -> {
                LocalDate date = firstDay.plusDays(offset);
                List<HistoryRecord> records = byDate.getOrDefault(date, List.of());
                return new Trend(DATE_LABEL.format(date), countStatus(records, "COMPLETED"),
                        countStatus(records, "NO_PATH"), records.size());
            }).toList();
        });
    }

    public List<TopDestination> topDestinations(int limit) {
        return transactions.readOnly(() -> {
            Map<Long, DeliveryPoint> pointsById = points.findAll(false).stream()
                    .collect(Collectors.toMap(DeliveryPoint::pointId, Function.identity()));
            List<HistoryRecord> records = history.findAll();
            Map<Long, Long> counts = records.stream()
                    .collect(Collectors.groupingBy(HistoryRecord::endPointId, Collectors.counting()));
            Map<Long, String> names = records.stream().collect(Collectors.toMap(HistoryRecord::endPointId,
                    record -> record.endPointName() == null ? "Điểm #" + record.endPointId() : record.endPointName(),
                    (first, ignored) -> first));
            return counts.entrySet().stream()
                    .sorted(Map.Entry.<Long, Long>comparingByValue(Comparator.reverseOrder())
                            .thenComparing(Map.Entry.comparingByKey()))
                    .limit(limit)
                    .map(entry -> {
                        DeliveryPoint point = pointsById.get(entry.getKey());
                        return new TopDestination(entry.getKey(), point == null ? names.get(entry.getKey()) : point.pointName(),
                                point == null ? "" : point.address(), entry.getValue());
                    }).toList();
        });
    }

    private long countStatus(List<HistoryRecord> records, String status) {
        return records.stream().filter(record -> status.equals(record.status())).count();
    }

    // Active drivers means distinct accounts that have submitted at least one search.
    public record Stats(long totalDeliveryPoints, long activeDeliveryPoints, long inactiveDeliveryPoints,
                        long totalSearches, long successfulSearches, long noPathSearches,
                        long activeDriversCount, boolean isMockData) {
    }

    public record Trend(String date, long completed, long noPath, long total) {
    }

    public record TopDestination(long pointId, String pointName, String address, long searchCount) {
    }
}
