#!/usr/bin/env python3
"""Run the Tasks example against its dedicated local SQL Server only."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "AngularApiTemplate.Api"
CONTAINER = "angular-template-tasks-sql"
IMAGE = "mcr.microsoft.com/mssql/server:2022-latest"
DATABASE = "AngularApiTemplate_Tasks_Development"
STATE = ROOT / ".local" / "tasks-sql.json"


def local_environment():
    if not STATE.exists():
        raise RuntimeError("Run 'python3 scripts/tasks-local.py up' first.")
    password = json.loads(STATE.read_text())["password"]
    environment = os.environ.copy()
    connection = (
        f"Server=127.0.0.1,11433;Database={DATABASE};User Id=sa;Password={password};"
        "Encrypt=True;TrustServerCertificate=True"
    )
    environment["ConnectionStrings__ApplicationDatabase"] = connection
    environment["TASKS_TEST_SQL_CONNECTION"] = connection
    environment["DOTNET_ENVIRONMENT"] = "Development"
    environment["ASPNETCORE_ENVIRONMENT"] = "Development"
    return environment


def dotnet(arguments, environment):
    executable = shutil.which("dotnet")
    if not executable:
        raise RuntimeError("Install/select the .NET SDK as documented in README.")
    return subprocess.run([executable, *arguments], cwd=BACKEND, env=environment, check=True)


def up():
    subprocess.run(["docker", "info"], check=True, stdout=subprocess.DEVNULL)
    existing = subprocess.run(["docker", "inspect", CONTAINER], capture_output=True, text=True)
    if existing.returncode == 0:
        info = json.loads(existing.stdout)[0]
        binding = info["HostConfig"]["PortBindings"].get("1433/tcp", [])
        if info["Config"]["Image"] != IMAGE or binding != [{"HostIp": "127.0.0.1", "HostPort": "11433"}]:
            raise RuntimeError("Container name is occupied by a different configuration; refusing to change it.")
        if not STATE.exists():
            raise RuntimeError("Existing container has no matching local credential file; refusing to replace credentials.")
        subprocess.run(["docker", "start", CONTAINER], check=True, stdout=subprocess.DEVNULL)
    else:
        STATE.parent.mkdir(exist_ok=True)
        if not STATE.exists():
            descriptor = os.open(STATE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w") as state:
                json.dump({"password": secrets.token_urlsafe(30) + "aA1!"}, state)
        environment = os.environ.copy()
        environment["MSSQL_SA_PASSWORD"] = json.loads(STATE.read_text())["password"]
        subprocess.run([
            "docker", "run", "-d", "--platform", "linux/amd64", "--name", CONTAINER,
            "-e", "ACCEPT_EULA=Y", "-e", "MSSQL_PID=Developer", "-e", "MSSQL_SA_PASSWORD",
            "-p", "127.0.0.1:11433:1433", IMAGE,
        ], env=environment, check=True, stdout=subprocess.DEVNULL)
    environment = os.environ.copy()
    environment["SQLCMDPASSWORD"] = json.loads(STATE.read_text())["password"]
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        result = subprocess.run([
            "docker", "exec", "-e", "SQLCMDPASSWORD", CONTAINER,
            "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-C", "-Q", "SELECT 1", "-l", "2",
        ], env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode == 0:
            print("Dedicated SQL Server is ready at 127.0.0.1:11433. Credentials remain in ignored .local/.")
            return
        time.sleep(1)
    raise RuntimeError("Dedicated SQL Server did not become ready within 60 seconds.")


def smoke(environment):
    base = "http://127.0.0.1:5111"
    # Refuse to test a different API already occupying the local verification port.
    import socket
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", 5111)) == 0:
            raise RuntimeError("Port 5111 is occupied. Stop that process before running smoke.")

    def request(method, path, body=None, expected=200):
        payload = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + path, data=payload, method=method,
                                     headers={"Content-Type": "application/json"})
        try:
            response = urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            if response.status != expected:
                raise RuntimeError(f"{method} {path}: expected {expected}, got {response.status}")
            data = response.read()
            return (json.loads(data) if data and path != "/health" else None), response.headers

    with tempfile.TemporaryFile(mode="w+t") as log:
        process = subprocess.Popen([
            shutil.which("dotnet"), "run", "--no-build", "--project", "src/AngularApiTemplate.Api",
            "--launch-profile", "http",
        ], cwd=BACKEND, env=environment, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        item_path = None
        try:
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError("API exited before startup. Run the documented API command for diagnostics.")
                try:
                    request("GET", "/health")
                    break
                except (OSError, RuntimeError):
                    time.sleep(0.1)
            else:
                raise RuntimeError("API startup timed out.")
            item, headers = request("POST", "/tasks", {"title": "  HTTP smoke task  "}, 201)
            item_path = f"/tasks/{item['id']}"
            assert headers["Location"].endswith(item_path)
            assert item["title"] == "HTTP smoke task" and item["isCompleted"] is False
            fetched, _ = request("GET", item_path)
            assert fetched == item
            replaced, _ = request("PUT", item_path, {
                "title": "Updated HTTP smoke task", "description": None, "isCompleted": True,
            })
            assert replaced["isCompleted"] is True and replaced["title"] == "Updated HTTP smoke task"
            persisted, _ = request("GET", item_path)
            assert persisted == replaced
            request("DELETE", item_path, expected=204)
            request("GET", item_path, expected=404)
            item_path = None
            print("Live HTTP SQL Server CRUD passed: POST 201 + Location, GET 200, PUT 200, DELETE 204, GET 404.")
        finally:
            if item_path and process.poll() is None:
                try:
                    request("DELETE", item_path, expected=204)
                except (OSError, RuntimeError):
                    pass
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                process.wait(timeout=10)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["up", "migrate", "test", "run", "run-entra", "smoke", "stop"])
    command = parser.parse_args().command
    if command == "up":
        up()
    elif command == "stop":
        subprocess.run(["docker", "stop", CONTAINER], check=True, stdout=subprocess.DEVNULL)
    else:
        environment = local_environment()
        if command == "migrate":
            dotnet(["ef", "database", "update", "--project", "src/AngularApiTemplate.Infrastructure",
                    "--startup-project", "src/AngularApiTemplate.Api"], environment)
        elif command == "test":
            dotnet(["test", "AngularApiTemplate.slnx"], environment)
        elif command in ("run", "run-entra"):
            if command == "run-entra":
                environment["Entra__Enabled"] = "true"
            dotnet(["run", "--project", "src/AngularApiTemplate.Api", "--launch-profile", "http"], environment)
        else:
            smoke(environment)


if __name__ == "__main__":
    main()
