package com.urbanroute.application.auth;

import com.urbanroute.application.error.ApplicationException;
import com.urbanroute.application.error.ApplicationException.Reason;
import com.urbanroute.application.port.AccountRepository;
import com.urbanroute.application.port.PasswordVerifier;
import com.urbanroute.application.port.TokenIssuer;
import com.urbanroute.domain.model.Account;

public class AuthService {
    private final AccountRepository accounts;
    private final PasswordVerifier passwords;
    private final TokenIssuer tokens;

    public AuthService(AccountRepository accounts, PasswordVerifier passwords, TokenIssuer tokens) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.tokens = tokens;
    }

    public AuthSession login(String username, String password) {
        Account account = accounts.findByUsername(username.trim())
                .filter(Account::isActive)
                .filter(user -> passwords.matches(password, user.passwordHash()))
                .orElseThrow(() -> new ApplicationException(Reason.INVALID_CREDENTIALS,
                        "Tài khoản hoặc mật khẩu không chính xác."));
        AccountView user = new AccountView(account.accountId(), account.username(), account.role(),
                account.isActive(), account.fullName(), account.phone());
        return new AuthSession(tokens.issue(account), user);
    }

    public record AuthSession(String token, AccountView user) { }

    public record AccountView(long accountId, String username, String role, boolean isActive,
                              String fullName, String phone) { }
}
