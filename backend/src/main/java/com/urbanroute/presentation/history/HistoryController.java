package com.urbanroute.presentation.history;

import com.urbanroute.application.history.HistoryService;
import com.urbanroute.domain.model.HistoryRecord;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HistoryController {
    private final HistoryService history;

    public HistoryController(HistoryService history) {
        this.history = history;
    }

    @GetMapping("/api/history/my")
    public List<HistoryRecord> myHistory(@AuthenticationPrincipal Jwt jwt) {
        return history.findByDriver(Long.parseLong(jwt.getClaimAsString("accountId")));
    }

    @GetMapping("/api/admin/history")
    public List<HistoryRecord> allHistory() {
        return history.findAll();
    }
}
