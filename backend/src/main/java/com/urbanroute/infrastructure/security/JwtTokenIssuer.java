package com.urbanroute.infrastructure.security;

import com.urbanroute.application.port.TokenIssuer;
import com.urbanroute.domain.model.Account;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenIssuer implements TokenIssuer {
    private final JwtEncoder encoder;
    private final Duration tokenTtl;
    private final String issuer;

    public JwtTokenIssuer(JwtEncoder encoder, @Value("${app.auth.token-ttl}") Duration tokenTtl,
                          @Value("${app.auth.issuer}") String issuer) {
        this.encoder = encoder;
        this.tokenTtl = tokenTtl;
        this.issuer = issuer;
    }

    @Override
    public String issue(Account account) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(account.username())
                .issuedAt(now).expiresAt(now.plus(tokenTtl))
                .claim("accountId", Long.toString(account.accountId()))
                .claim("role", account.role()).build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
