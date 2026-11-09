package com.urbanroute.application.port;

import com.urbanroute.domain.model.Account;

@FunctionalInterface
public interface TokenIssuer {
    String issue(Account account);
}
