"""
Unit tests for Basal Ganglia Action Selection.

Tests template loading, action registration, utility setting, and winner-take-all
action selection dynamics.
"""
import pytest
import numpy as np
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from scripts.basal_ganglia import BrainRegionTemplate, BasalGangliaActionSelection


class TestBrainRegionTemplate:
    """Tests for template loading and network building."""
    
    @pytest.fixture
    def template_path(self):
        """Path to basal ganglia template."""
        return os.path.join(
            os.path.dirname(__file__), '..', '..',
            'data', 'brain_region_maps', 'basal_ganglia_action_selection.json'
        )
    
    def test_template_loads(self, template_path):
        """Test that template JSON loads successfully."""
        template = BrainRegionTemplate(template_path)
        assert template.region_name == "Basal Ganglia Action Selection Circuit"
        assert "clusters" in template.template_data
        assert "connections" in template.template_data
    
    def test_neuron_presets_exist(self):
        """Test that all required neuron presets are defined."""
        required_presets = ["medium_spiny", "pyramidal", "pallidal", "thalamic_relay"]
        for preset in required_presets:
            assert preset in BrainRegionTemplate.NEURON_PRESETS
            assert "eqs" in BrainRegionTemplate.NEURON_PRESETS[preset]
            assert "threshold" in BrainRegionTemplate.NEURON_PRESETS[preset]
    
    def test_network_builds(self, template_path):
        """Test that Brian2 network builds without errors."""
        template = BrainRegionTemplate(template_path)
        network = template.build_network()
        assert network is not None
        assert len(template.clusters) > 0
    
    def test_cluster_creation(self, template_path):
        """Test that all clusters are created."""
        template = BrainRegionTemplate(template_path)
        template.build_network()
        
        expected_clusters = [
            "Striatum_D1", "Striatum_D2", "STN", 
            "GPe", "GPi_SNr", "Thalamus"
        ]
        for cluster_id in expected_clusters:
            assert cluster_id in template.clusters


class TestBasalGangliaActionSelection:
    """Tests for action selection mechanism."""
    
    @pytest.fixture
    def template_path(self):
        """Path to basal ganglia template."""
        return os.path.join(
            os.path.dirname(__file__), '..', '..',
            'data', 'brain_region_maps', 'basal_ganglia_action_selection.json'
        )
    
    @pytest.fixture
    def bg_system(self, template_path):
        """Create basal ganglia action selection system."""
        return BasalGangliaActionSelection(template_path)
    
    def test_initialization(self, bg_system):
        """Test that BG system initializes correctly."""
        assert bg_system.striatum_d1 is not None
        assert bg_system.striatum_d2 is not None
        assert bg_system.gpi is not None
        assert bg_system.thalamus is not None
        assert len(bg_system.action_pools) == 0  # No actions registered yet
    
    def test_action_registration(self, bg_system):
        """Test registering actions."""
        bg_system.register_action("REACH", [0, 1, 2], [0, 1, 2])
        assert "REACH" in bg_system.action_pools
        assert len(bg_system.action_pools["REACH"]["d1_indices"]) == 3
    
    def test_multiple_action_registration(self, bg_system):
        """Test registering multiple non-overlapping actions."""
        bg_system.register_action("REACH", [0, 1, 2], [0, 1, 2])
        bg_system.register_action("GRASP", [3, 4, 5], [3, 4, 5])
        bg_system.register_action("RETRACT", [6, 7, 8], [6, 7, 8])
        
        assert len(bg_system.action_pools) == 3
        assert all(
            action in bg_system.action_pools 
            for action in ["REACH", "GRASP", "RETRACT"]
        )
    
    def test_utility_setting(self, bg_system):
        """Test setting action utilities."""
        bg_system.register_action("REACH", [0, 1, 2], [0, 1, 2])
        
        # Should not raise error
        bg_system.set_action_utility("REACH", 0.8)
        
        # Verify input was set (higher utility → higher D1 input)
        assert bg_system.striatum_d1.I_input[0] > 0
        # Lower utility for D2 (less suppression)
        assert bg_system.striatum_d2.I_input[0] < 0.5
    
    def test_utility_invalid_action(self, bg_system):
        """Test that setting utility for unregistered action raises error."""
        with pytest.raises(KeyError):
            bg_system.set_action_utility("INVALID", 0.5)
    
    def test_utility_bounds(self, bg_system):
        """Test that utilities can be set across full range."""
        bg_system.register_action("ACTION", [0], [0])
        
        # Test boundary values
        bg_system.set_action_utility("ACTION", 0.0)  # Minimum utility
        bg_system.set_action_utility("ACTION", 1.0)  # Maximum utility
        bg_system.set_action_utility("ACTION", 0.5)  # Mid-range
    
    def test_action_selection_no_actions(self, bg_system):
        """Test action selection when no actions registered."""
        selected, confidence = bg_system.get_selected_action()
        assert selected is None
        assert confidence == 0.0
    
    def test_reset_state(self, bg_system):
        """Test that reset clears network state."""
        bg_system.register_action("REACH", [0, 1, 2], [0, 1, 2])
        bg_system.set_action_utility("REACH", 1.0)
        
        # Reset should clear inputs
        bg_system.reset()
        assert np.all(bg_system.striatum_d1.I_input == 0.0)
        assert np.all(bg_system.striatum_d2.I_input == 0.0)


class TestActionCompetition:
    """Tests for competitive action selection dynamics."""
    
    @pytest.fixture
    def bg_multi(self):
        """Create BG system with multiple registered actions."""
        template_path = os.path.join(
            os.path.dirname(__file__), '..', '..',
            'data', 'brain_region_maps', 'basal_ganglia_action_selection.json'
        )
        bg = BasalGangliaActionSelection(template_path)
        
        # Register 3 actions with non-overlapping neurons
        bg.register_action("ACTION_A", list(range(0, 30)), list(range(0, 30)))
        bg.register_action("ACTION_B", list(range(30, 60)), list(range(30, 60)))
        bg.register_action("ACTION_C", list(range(60, 90)), list(range(60, 90)))
        
        return bg
    
    def test_winner_take_all_setup(self, bg_multi):
        """Test that all actions can have different utilities."""
        bg_multi.set_action_utility("ACTION_A", 0.9)
        bg_multi.set_action_utility("ACTION_B", 0.5)
        bg_multi.set_action_utility("ACTION_C", 0.2)
        
        # Verify utilities were set differently
        mean_d1_a = np.mean(bg_multi.striatum_d1.I_input[0:30])
        mean_d1_b = np.mean(bg_multi.striatum_d1.I_input[30:60])
        mean_d1_c = np.mean(bg_multi.striatum_d1.I_input[60:90])
        
        assert mean_d1_a > mean_d1_b > mean_d1_c
    
    def test_utility_differential(self, bg_multi):
        """Test that utility differences are reflected in striatal inputs."""
        bg_multi.set_action_utility("ACTION_A", 1.0)
        bg_multi.set_action_utility("ACTION_B", 0.0)
        
        d1_input_a = bg_multi.striatum_d1.I_input[0]
        d1_input_b = bg_multi.striatum_d1.I_input[30]
        
        # High utility should produce higher D1 input
        assert d1_input_a > d1_input_b


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
