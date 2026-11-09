package com.urbanroute.application.port;

@FunctionalInterface
public interface PasswordVerifier {
    boolean matches(String rawPassword, String passwordHash);
}
