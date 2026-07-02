#!/usr/bin/env python3
import sys
import select

def main():
    # 64KB chunk size balances throughput and memory for raw audio streams
    BUFFER_SIZE = 65536
    TIMEOUT_SECONDS = 10.0

    stdin_b = sys.stdin.buffer
    stdout_b = sys.stdout.buffer

    while True:
        # Wait up to 10 seconds for data to become available on stdin
        ready, _, _ = select.select([stdin_b], [], [], TIMEOUT_SECONDS)

        if not ready:
            sys.stderr.write("\n[Watchdog] Stream stalled for 10 seconds. Terminating.\n")
            sys.exit(124)

        chunk = stdin_b.read(BUFFER_SIZE)
        if not chunk:
            break  # EOF reached cleanly, download completed successfully

        stdout_b.write(chunk)
        stdout_b.flush()

if __name__ == '__main__':
    main()
