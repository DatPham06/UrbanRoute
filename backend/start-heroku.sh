#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${PORT:?Heroku must provide PORT}"
: "${ORACLE_SSH_HOST:?Set ORACLE_SSH_HOST}"
: "${ORACLE_SSH_USER:?Set ORACLE_SSH_USER}"
: "${ORACLE_SSH_KEY_B64:?Set ORACLE_SSH_KEY_B64}"
: "${ORACLE_SSH_KNOWN_HOSTS:?Set ORACLE_SSH_KNOWN_HOSTS}"

ssh_dir=$(mktemp -d)
printf '%s' "$ORACLE_SSH_KEY_B64" | base64 --decode > "$ssh_dir/id_ed25519"
printf '%s\n' "$ORACLE_SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
unset ORACLE_SSH_KEY_B64

tunnel_port=11521
if [[ "$PORT" == "$tunnel_port" ]]; then
    tunnel_port=11522
fi
export DB_URL="jdbc:oracle:thin:@//127.0.0.1:$tunnel_port/URBANROUTE"

ssh -nNT -i "$ssh_dir/id_ed25519" \
    -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$ssh_dir/known_hosts" \
    -o GlobalKnownHostsFile=/dev/null -o UpdateHostKeys=no \
    -o ExitOnForwardFailure=yes -o ServerAliveInterval=20 -o ServerAliveCountMax=3 \
    -L "127.0.0.1:$tunnel_port:127.0.0.1:1521" \
    "$ORACLE_SSH_USER@$ORACLE_SSH_HOST" &
ssh_pid=$!
java_pid=

stop_processes() {
    for pid in "$ssh_pid" "$java_pid"; do
        if [[ -n "$pid" ]]; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait || true
}
trap stop_processes EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

for attempt in {1..60}; do
    if (exec 3<>"/dev/tcp/127.0.0.1/$tunnel_port") 2>/dev/null; then
        break
    fi
    if ! kill -0 "$ssh_pid" 2>/dev/null || [[ "$attempt" == 60 ]]; then
        printf '%s\n' 'Oracle SSH tunnel did not open.' >&2
        exit 1
    fi
    sleep 0.2
done

read -r -a java_options <<< "${JAVA_OPTS:-}"
java "${java_options[@]}" -Dserver.port="$PORT" \
    -Dspring.web.resources.static-locations=file:./target/heroku-frontend/ -jar "$1" &
java_pid=$!

# If either process stops, the dyno can restart with a fresh tunnel and app.
wait -n "$ssh_pid" "$java_pid"
