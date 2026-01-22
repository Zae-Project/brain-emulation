"""
Pytest Configuration and Fixtures
==================================

Shared fixtures and configuration for brain-emulation test suite.

This module provides:
- Mock Brian2 networks for testing
- WebSocket client fixtures
- Sample neuron data and spike patterns
- Test utilities

Author: Zae Project
License: MIT
"""

import pytest
import numpy as np
import asyncio
from typing import Dict, List, Any


# ============================================================================
# Brian2 Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_brian_network():
    """
    Create a mock Brian2 network state for testing.

    Returns:
        dict: Network state with neuron positions, spikes, and parameters

    Example:
        >>> def test_something(mock_brian_network):
        ...     assert 'positions' in mock_brian_network
    """
    return {
        'positions': np.random.rand(100, 3) * 10,  # 100 neurons in 3D space
        'spikes': np.array([1, 5, 12, 23, 45]),    # Spike indices
        'spike_times': np.array([0.01, 0.015, 0.02, 0.025, 0.03]),
        'num_neurons': 100,
        'dt': 0.1,  # milliseconds
        'network_mode': 'simple'
    }


@pytest.fixture
def realistic_network_config():
    """
    Configuration for realistic network with excitatory/inhibitory neurons.

    Returns:
        dict: Realistic network parameters matching server.py structure
    """
    return {
        'N_exc': 80,  # 80% excitatory
        'N_inh': 20,  # 20% inhibitory
        'exc_params': {
            'v_rest': -70.0,   # mV
            'v_thresh': -50.0,  # mV
            'tau': 10.0,        # ms
        },
        'inh_params': {
            'v_rest': -70.0,
            'v_thresh': -45.0,
            'tau': 5.0,
        }
    }


# ============================================================================
# WebSocket Fixtures
# ============================================================================

@pytest.fixture
def sample_command_messages():
    """
    Sample WebSocket command messages for testing protocol.

    Returns:
        dict: Dictionary of command types to message payloads
    """
    return {
        'set_speed': {
            "cmd": "setSpeed",
            "value": 2.0
        },
        'set_network_size': {
            "cmd": "setNetworkSize",
            "value": 150
        },
        'switch_mode': {
            "cmd": "switchMode",
            "mode": "realistic"
        },
        'inject_spike': {
            "cmd": "injectSpike",
            "neuronIndex": 42
        },
        'reset_network': {
            "cmd": "reset"
        },
        'pause': {
            "cmd": "pause"
        },
        'resume': {
            "cmd": "resume"
        }
    }


@pytest.fixture
def sample_server_responses():
    """
    Sample server response messages for validation.

    Returns:
        dict: Expected server response structures
    """
    return {
        'spike_data': {
            "type": "spikes",
            "spiked": [1, 5, 12],
            "dt": 0.1
        },
        'network_state': {
            "type": "networkState",
            "numNeurons": 100,
            "mode": "simple",
            "paused": False
        },
        'error': {
            "type": "error",
            "message": "Invalid command"
        }
    }


# ============================================================================
# Neuron Data Fixtures
# ============================================================================

@pytest.fixture
def sample_neuron_types():
    """
    Sample neuron type metadata for testing visualization.

    Returns:
        dict: Neuron type definitions with shapes and colors
    """
    return {
        'pyramidal_l5': {
            'slug': 'pyramidal_l5',
            'label': 'Pyramidal (L5)',
            'shape': 'cone',
            'color': '#ff6b6b'
        },
        'parvalbumin_basket': {
            'slug': 'parvalbumin_basket',
            'label': 'Parvalbumin Basket',
            'shape': 'sphere',
            'color': '#4ecdc4'
        },
        'chandelier': {
            'slug': 'chandelier',
            'label': 'Chandelier',
            'shape': 'octahedron',
            'color': '#95e1d3'
        }
    }


@pytest.fixture
def sample_brain_region():
    """
    Sample brain region template for testing JSON import/export.

    Returns:
        dict: Brain region configuration matching manifest format
    """
    return {
        'name': 'Test Motor Cortex',
        'source': 'Test Atlas',
        'description': 'Sample region for testing',
        'neurons': [
            {
                'type': 'pyramidal_l5',
                'count': 60,
                'position': {'x': 0, 'y': 0, 'z': 0}
            },
            {
                'type': 'parvalbumin_basket',
                'count': 30,
                'position': {'x': 2, 'y': 0, 'z': 0}
            },
            {
                'type': 'chandelier',
                'count': 10,
                'position': {'x': -2, 'y': 0, 'z': 0}
            }
        ],
        'connections': [
            {
                'from': 'pyramidal_l5',
                'to': 'parvalbumin_basket',
                'probability': 0.3,
                'weight': 1.0
            }
        ]
    }


# ============================================================================
# Utility Fixtures
# ============================================================================

@pytest.fixture
def spike_pattern_generator():
    """
    Factory fixture for generating test spike patterns.

    Returns:
        callable: Function that generates spike patterns

    Example:
        >>> def test_spikes(spike_pattern_generator):
        ...     pattern = spike_pattern_generator(num_neurons=50, duration=1.0)
        ...     assert len(pattern) > 0
    """
    def _generate_pattern(num_neurons: int, duration: float, rate: float = 10.0):
        """
        Generate Poisson-distributed spike pattern.

        Args:
            num_neurons: Number of neurons
            duration: Duration in seconds
            rate: Average firing rate in Hz

        Returns:
            List of (neuron_id, time) tuples
        """
        spikes = []
        for neuron_id in range(num_neurons):
            # Poisson process for spike times
            num_spikes = np.random.poisson(rate * duration)
            spike_times = np.sort(np.random.uniform(0, duration, num_spikes))
            for t in spike_times:
                spikes.append((neuron_id, t))
        return sorted(spikes, key=lambda x: x[1])

    return _generate_pattern


@pytest.fixture
def validation_schema():
    """
    JSON schemas for validating messages and configurations.

    Returns:
        dict: JSON schemas for different message types
    """
    return {
        'command_schema': {
            'type': 'object',
            'required': ['cmd'],
            'properties': {
                'cmd': {'type': 'string'},
                'value': {'type': ['number', 'string']},
                'mode': {'type': 'string'}
            }
        },
        'neuron_schema': {
            'type': 'object',
            'required': ['type', 'count', 'position'],
            'properties': {
                'type': {'type': 'string'},
                'count': {'type': 'integer', 'minimum': 1},
                'position': {
                    'type': 'object',
                    'required': ['x', 'y', 'z'],
                    'properties': {
                        'x': {'type': 'number'},
                        'y': {'type': 'number'},
                        'z': {'type': 'number'}
                    }
                }
            }
        }
    }


# ============================================================================
# Async Fixtures
# ============================================================================

@pytest.fixture
def event_loop():
    """
    Create event loop for async tests.

    Yields:
        asyncio.AbstractEventLoop: Event loop for async tests
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Parametrize Helpers
# ============================================================================

# Network sizes for parametrized tests
NETWORK_SIZES = [10, 50, 100, 200]

# Speed multipliers for parametrized tests
SPEED_MULTIPLIERS = [0.5, 1.0, 2.0, 5.0, 10.0]

# Network modes for parametrized tests
NETWORK_MODES = ['simple', 'realistic']
