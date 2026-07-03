#!/usr/bin/env python3
#!/usr/bin/python3
import sys
import select
import os
import signal

def main():
    BUFFER_SIZE = 65536
    timeout_seconds = 10.0
    if len(sys.argv) > 1:
        try:
            timeout_seconds = float(sys.argv[1])
        except ValueError:
            sys.stderr.write(f"Using default 10.0s.\n")

    stdin_b = sys.stdin.buffer
    stdout_b = sys.stdout.buffer

    while True:
        # Pass our dynamic timeout variable to select
        ready, _, _ = select.select([stdin_b], [], [], timeout_seconds)

        if not ready:
            sys.stderr.write(f"\n[Watchdog] Stream stalled for {timeout_seconds} seconds. Terminating pipeline...\n")

            try:
                pgid = os.getpgrp()
                os.killpg(pgid, signal.SIGTERM)
            except ProcessLookupError:
                pass

            sys.exit(124)

        chunk = stdin_b.read(BUFFER_SIZE)
        if not chunk:
            break  # EOF reached cleanly

        stdout_b.write(chunk)
        stdout_b.flush()

if __name__ == '__main__':
    main()
