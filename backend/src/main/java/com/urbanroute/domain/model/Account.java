package com.urbanroute.domain.model;

public record Account(long accountId, String username, String passwordHash,
                      String role, boolean isActive, String fullName, String phone) {
}
