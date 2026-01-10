"""
Test script for simple and realistic network modes.

Usage:
    python test_network_modes.py simple
    python test_network_modes.py realistic
"""
import asyncio
import json
import sys
import websockets


async def test_network_mode(mode="simple"):
    """Test switching between network modes via WebSocket."""
    uri = "ws://localhost:8766"

    print(f"\n{'='*60}")
    print(f"Testing {mode.upper()} Network Mode")
    print(f"{'='*60}\n")

    try:
        async with websockets.connect(uri) as ws:
            print("✓ Connected to server")

            # Test 1: Switch network mode
            print(f"\n1. Switching to {mode} mode...")
            await ws.send(json.dumps({
                "cmd": "setNetworkMode",
                "mode": mode
            }))

            # Wait for response
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(response)

            if "cmd" in data and data["cmd"] == "networkModeChanged":
                print(f"   ✓ Mode changed to: {data.get('mode')}")
                print(f"   ✓ Neuron count: {data.get('neuronCount')}")
            else:
                print(f"   Received data: {response[:200]}")

            # Test 2: Resume simulation
            print("\n2. Resuming simulation...")
            await ws.send(json.dumps({"cmd": "play"}))

            # Test 3: Collect some simulation data
            print("\n3. Collecting simulation data...")
            spike_count = 0
            data_points = 0

            for _ in range(10):  # Collect 10 data frames
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                data = json.loads(msg)

                if "spikes" in data:
                    spike_count += len(data["spikes"])
                    data_points += 1
                    print(f"   Frame {data_points}: "
                          f"t={data.get('t', 0):.1f}ms, "
                          f"spikes={len(data['spikes'])}, "
                          f"neurons={len(data.get('volt', {}))}")

            print(f"\n✓ Collected {data_points} frames")
            print(f"✓ Total spikes: {spike_count}")
            print(f"✓ Avg spikes/frame: {spike_count/data_points:.1f}")

            # Test 4: Pause simulation
            print("\n4. Pausing simulation...")
            await ws.send(json.dumps({"cmd": "pause"}))

            print("\n" + "="*60)
            print(f"✓ {mode.upper()} network test completed successfully!")
            print("="*60 + "\n")

    except asyncio.TimeoutError:
        print("✗ Timeout waiting for server response")
        print("  Make sure the server is running: python server.py")
    except ConnectionRefusedError:
        print("✗ Could not connect to server")
        print("  Make sure the server is running: python server.py")
    except Exception as e:
        print(f"✗ Error: {e}")


async def main():
    """Main test runner."""
    mode = sys.argv[1] if len(sys.argv) > 1 else "simple"

    if mode not in ["simple", "realistic"]:
        print("Usage: python test_network_modes.py [simple|realistic]")
        sys.exit(1)

    await test_network_mode(mode)

    # Optionally test both modes
    if "--both" in sys.argv:
        other_mode = "realistic" if mode == "simple" else "simple"
        await asyncio.sleep(2)
        await test_network_mode(other_mode)


if __name__ == "__main__":
    asyncio.run(main())
