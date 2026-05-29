"""Container sandbox (phase B) — proves real isolation.

Skips automatically when no Docker runtime is reachable, so it stays green
locally/CI without Docker. GitHub runners (and local Docker) exercise it for
real, including the defining guarantee: a sandboxed run cannot reach the network.
"""

import pytest

from apps.api.app.node_system.nodes.logic.code.sandbox import ContainerExecutor, docker_available


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_container_executes_python():
    if not await docker_available():
        pytest.skip("requires a Docker runtime")
    output, _logs = await ContainerExecutor().run(
        "python", "output = {'sum': 2 + 3}", {}, timeout=90
    )
    assert output["sum"] == 5


@pytest.mark.anyio
async def test_container_blocks_network_egress():
    if not await docker_available():
        pytest.skip("requires a Docker runtime")
    code = (
        "import urllib.request\n"
        "try:\n"
        "    urllib.request.urlopen('http://1.1.1.1', timeout=5)\n"
        "    output = {'reached': True}\n"
        "except Exception:\n"
        "    output = {'reached': False}\n"
    )
    output, _logs = await ContainerExecutor().run("python", code, {}, timeout=90)
    # --network none: the egress attempt must fail inside the sandbox.
    assert output["reached"] is False


@pytest.mark.anyio
async def test_container_cannot_read_host_filesystem():
    if not await docker_available():
        pytest.skip("requires a Docker runtime")
    # The container has its own ephemeral fs; the worker's files are not mounted.
    code = (
        "import os\n"
        "output = {'has_app': os.path.exists('/Users') or os.path.exists('/home/runner')}\n"
    )
    output, _logs = await ContainerExecutor().run("python", code, {}, timeout=90)
    assert output["has_app"] is False
