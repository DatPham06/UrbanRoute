package com.urbanroute.infrastructure.config;

import com.urbanroute.application.auth.AuthService;
import com.urbanroute.application.dashboard.DashboardService;
import com.urbanroute.application.delivery.DeliveryPointService;
import com.urbanroute.application.history.HistoryService;
import com.urbanroute.application.port.AccountRepository;
import com.urbanroute.application.port.DeliveryPointRepository;
import com.urbanroute.application.port.HistoryRepository;
import com.urbanroute.application.port.PasswordVerifier;
import com.urbanroute.application.port.RoadRepository;
import com.urbanroute.application.port.TokenIssuer;
import com.urbanroute.application.port.TransactionRunner;
import com.urbanroute.application.route.RouteService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class UseCaseConfig {
    @Bean
    AuthService authService(AccountRepository accounts, PasswordVerifier passwords, TokenIssuer tokens) {
        return new AuthService(accounts, passwords, tokens);
    }

    @Bean
    DeliveryPointService deliveryPointService(DeliveryPointRepository points, RoadRepository roads,
                                              TransactionRunner transactions) {
        return new DeliveryPointService(points, roads, transactions);
    }

    @Bean
    RouteService routeService(DeliveryPointService points, RoadRepository roads,
                              HistoryRepository history, TransactionRunner transactions) {
        return new RouteService(points, roads, history, transactions);
    }

    @Bean
    HistoryService historyService(HistoryRepository history, TransactionRunner transactions) {
        return new HistoryService(history, transactions);
    }

    @Bean
    DashboardService dashboardService(DeliveryPointRepository points, HistoryRepository history,
                                      TransactionRunner transactions) {
        return new DashboardService(points, history, transactions);
    }
}
