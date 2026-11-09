package com.urbanroute.application.port;

import com.urbanroute.domain.model.Account;
import java.util.Optional;

public interface AccountRepository {
    Optional<Account> findByUsername(String username);
}
