"""
Basal Ganglia Action Selection

Implements the basal ganglia circuitry for action selection using the template
from basal_ganglia_action_selection.json. Includes the direct pathway (Go),
indirect pathway (No-Go), and hyperdirect pathway for competitive action selection.

References:
    Gurney, K., Prescott, T. J., & Redgrave, P. (2001). A computational model
    of action selection in the basal ganglia. Biological Cybernetics.
    
    Eliasmith, C. (2013). How to Build a Brain: A Neural Architecture for
    Biological Cognition. Oxford University Press.
"""
import json
from typing import Dict, List, Optional, Tuple
import numpy as np
from brian2 import NeuronGroup, Synapses, Network, ms, Hz


# =============================================================================
# Template Loader
# =============================================================================

class BrainRegionTemplate:
    """
    Loads and manages brain region templates from JSON files.
    
    Provides conversion from JSON specifications to Brian2 network objects,
    handling neuron groups, connectivity patterns, and metadata.
    
    Attributes:
        template_data: Raw JSON template data
        region_name: Human-readable region name
        clusters: Dict mapping cluster IDs to neuron group objects
        synapses: List of Brian2 Synapse objects
    """
    
    # Neuron presets with Brian2-compatible equations
    NEURON_PRESETS = {
        "medium_spiny": {
            "eqs": """
            dv/dt = (-v + I_input + I_syn)/tau : 1
            I_input : 1
            I_syn : 1
            """,
            "threshold": "v > 1",
            "reset": "v = 0",
            "tau": 20  # ms
        },
        "pyramidal": {
            "eqs": """
            dv/dt = (-v + I_input + I_syn)/tau : 1
            I_input : 1
            I_syn : 1
            """,
            "threshold": "v > 1",
            "reset": "v = 0",
            "tau": 15  # ms
        },
        "pallidal": {
            "eqs": """
            dv/dt = (-v + I_input + I_syn)/tau : 1
            I_input : 1
            I_syn : 1
            """,
            "threshold": "v > 1",
            "reset": "v = 0",
            "tau": 10  # ms (faster)
        },
        "thalamic_relay": {
            "eqs": """
            dv/dt = (-v + I_input + I_syn)/tau : 1
            I_input : 1
            I_syn : 1
            """,
            "threshold": "v > 1",
            "reset": "v = 0",
            "tau": 20  # ms
        }
    }
    
    def __init__(self, template_path: str):
        """
        Load brain region template from JSON file.
        
        Args:
            template_path: Path to JSON template file
        """
        with open(template_path, 'r') as f:
            self.template_data = json.load(f)
        
        self.region_name = self.template_data.get("regionName", "Unknown")
        self.clusters = {}
        self.synapses = []
        self._neuron_groups = {}  # cluster_id -> NeuronGroup
    
    def build_network(self) -> Network:
        """
        Build Brian2 network from template.
        
        Creates all neuron groups and synaptic connections as specified
        in the template JSON.
        
        Returns:
            Network: Brian2 network ready to simulate
        """
        # Create all neuron groups
        for cluster in self.template_data["clusters"]:
            cluster_id = cluster["id"]
            neuron_groups = []
            
            for group_spec in cluster["neuronGroups"]:
                preset_name = group_spec["preset"]
                count = group_spec["count"]
                
                if preset_name not in self.NEURON_PRESETS:
                    raise ValueError(f"Unknown neuron preset: {preset_name}")
                
                preset = self.NEURON_PRESETS[preset_name]
                
                # Create Brian2 NeuronGroup
                ng = NeuronGroup(
                    count,
                    preset["eqs"],
                    threshold=preset["threshold"],
                    reset=preset["reset"],
                    method='euler'
                )
                
                # Initialize voltages
                ng.v = 'rand() * 0.3'
                ng.I_input = 0.0
                ng.I_syn = 0.0
                
                neuron_groups.append({
                    "preset": preset_name,
                    "group": ng,
                    "count": count
                })
            
            self._neuron_groups[cluster_id] = neuron_groups
            self.clusters[cluster_id] = {
                "name": cluster["name"],
                "groups": neuron_groups,
                "metadata": cluster.get("metadata", {})
            }
        
        # Create internal connectivity
        for cluster in self.template_data["clusters"]:
            cluster_id = cluster["id"]
            for conn_spec in cluster.get("internalConnectivity", []):
                self._create_connections(cluster_id, cluster_id, conn_spec)
        
        # Create inter-cluster connectivity
        for conn in self.template_data.get("connections", []):
            from_cluster = conn["fromCluster"]
            to_cluster = conn["toCluster"]
            
            for conn_spec in conn["connectivity"]:
                self._create_connections(from_cluster, to_cluster, conn_spec)
        
        # Create network with all objects
        all_objects = []
        for cluster_data in self.clusters.values():
            for group_data in cluster_data["groups"]:
                all_objects.append(group_data["group"])
        all_objects.extend(self.synapses)
        
        net = Network(*all_objects)
        print(f"✓ Built network '{self.region_name}' with {len(all_objects)} objects")
        return net
    
    def _create_connections(self, from_cluster: str, to_cluster: str, conn_spec: dict):
        """
        Create synaptic connections between neuron groups.
        
        Args:
            from_cluster: Source cluster ID
            to_cluster: Target cluster ID
            conn_spec: Connection specification from template
        """
        from_preset = conn_spec["from"]
        to_preset = conn_spec["to"]
        
        # Find matching neuron groups
        from_groups = self._find_groups_by_preset(from_cluster, from_preset)
        to_groups = self._find_groups_by_preset(to_cluster, to_preset)
        
        if not from_groups or not to_groups:
            raise ValueError(
                f"Could not find groups: {from_preset} in {from_cluster} "
                f"or {to_preset} in {to_cluster}"
            )
        
        # Take first matching group (templates typically have one group per preset)
        src_group = from_groups[0]["group"]
        tgt_group = to_groups[0]["group"]
        
        # Determine synapse equation based on type
        weight = conn_spec.get("weight", 1.0)
        delay = conn_spec.get("delay", 1.0)  # ms
        
        if conn_spec["type"] == "inhibitory":
            on_pre = f"I_syn -= {weight}"
        elif conn_spec["type"] == "excitatory":
            on_pre = f"I_syn += {weight}"
        else:
            raise ValueError(f"Unknown connection type: {conn_spec['type']}")
        
        # Create synapse with delay
        syn = Synapses(
            src_group,
            tgt_group,
            on_pre=on_pre,
            delay=delay * ms
        )
        syn.connect(p=conn_spec.get("probability", 1.0))
        
        self.synapses.append(syn)
        print(
            f"  → {from_cluster}.{from_preset} → {to_cluster}.{to_preset} "
            f"({conn_spec['type']}, w={weight})"
        )
    
    def _find_groups_by_preset(self, cluster_id: str, preset_name: str) -> List[dict]:
        """
        Find neuron groups matching a preset within a cluster.
        
        Args:
            cluster_id: Cluster ID
            preset_name: Neuron preset name
            
        Returns:
            List of matching group dicts
        """
        if cluster_id not in self._neuron_groups:
            return []
        
        return [
            g for g in self._neuron_groups[cluster_id]
            if g["preset"] == preset_name
        ]
    
    def get_cluster_group(self, cluster_id: str, preset_name: str) -> Optional[NeuronGroup]:
        """
        Get a specific neuron group by cluster and preset.
        
        Args:
            cluster_id: Cluster identifier (e.g., "Striatum_D1")
            preset_name: Neuron preset (e.g., "medium_spiny")
            
        Returns:
            NeuronGroup if found, None otherwise
        """
        groups = self._find_groups_by_preset(cluster_id, preset_name)
        return groups[0]["group"] if groups else None


# =============================================================================
# Action Selection
# =============================================================================

class BasalGangliaActionSelection:
    """
    Implements action selection using the basal ganglia template.
    
    Provides high-level interface for:
    - Setting action utilities (cortical input to striatum)
    - Selecting winner-take-all action (via GPi → Thalamus disinhibition)
    - Gating cortical information flow based on selected action
    
    Attributes:
        template: BrainRegionTemplate instance
        network: Brian2 network
        action_pools: Dict mapping action names to input interfaces
    """
    
    def __init__(self, template_path: str):
        """
        Initialize action selection system from template.
        
        Args:
            template_path: Path to basal ganglia JSON template
        """
        self.template = BrainRegionTemplate(template_path)
        self.network = self.template.build_network()
        self.action_pools = {}  # action_name -> {"D1": group, "D2": group}
        
        # Get key neuron groups
        self.striatum_d1 = self.template.get_cluster_group("Striatum_D1", "medium_spiny")
        self.striatum_d2 = self.template.get_cluster_group("Striatum_D2", "medium_spiny")
        self.gpi = self.template.get_cluster_group("GPi_SNr", "pallidal")
        self.thalamus = self.template.get_cluster_group("Thalamus", "thalamic_relay")
        
        if not all([self.striatum_d1, self.striatum_d2, self.gpi, self.thalamus]):
            raise ValueError("Missing critical basal ganglia components in template")
        
        print(f"✓ Basal Ganglia Action Selection initialized")
        print(f"  - Striatum D1: {len(self.striatum_d1)} neurons")
        print(f"  - Striatum D2: {len(self.striatum_d2)} neurons")
        print(f"  - GPi/SNr: {len(self.gpi)} neurons")
        print(f"  - Thalamus: {len(self.thalamus)} neurons")
    
    def register_action(self, action_name: str, d1_indices: List[int], d2_indices: List[int]):
        """
        Register an action with specific striatal neuron pools.
        
        Args:
            action_name: Human-readable action identifier
            d1_indices: Indices in Striatum D1 for this action
            d2_indices: Indices in Striatum D2 for this action
        """
        self.action_pools[action_name] = {
            "d1_indices": d1_indices,
            "d2_indices": d2_indices
        }
        print(f"✓ Registered action '{action_name}' (D1: {len(d1_indices)}, D2: {len(d2_indices)} neurons)")
    
    def set_action_utility(self, action_name: str, utility: float):
        """
        Set the utility (desirability) of an action.
        
        Higher utility increases input to the direct pathway (D1) and decreases
        input to the indirect pathway (D2), facilitating action selection.
        
        Args:
            action_name: Registered action name
            utility: Action utility (0.0 to 1.0, higher = more desirable)
        """
        if action_name not in self.action_pools:
            raise KeyError(f"Action '{action_name}' not registered")
        
        pool = self.action_pools[action_name]
        
        # Direct pathway: higher utility → higher input
        for idx in pool["d1_indices"]:
            self.striatum_d1.I_input[idx] = utility * 0.5
        
        # Indirect pathway: higher utility → lower input (less suppression)
        for idx in pool["d2_indices"]:
            self.striatum_d2.I_input[idx] = (1.0 - utility) * 0.3
    
    def get_selected_action(self) -> Tuple[Optional[str], float]:
        """
        Determine which action is currently selected.
        
        The selected action is the one with the highest thalamic activity,
        which occurs when GPi is most inhibited (disinhibition).
        
        Returns:
            Tuple of (action_name, confidence) where confidence is the
            normalized thalamic activity. Returns (None, 0.0) if no clear winner.
        """
        # Map thalamic neurons to actions (simplified: equal distribution)
        n_actions = len(self.action_pools)
        if n_actions == 0:
            return None, 0.0
        
        thal_activity = self.thalamus.v[:]
        neurons_per_action = len(thal_activity) // n_actions
        
        action_scores = {}
        for i, action_name in enumerate(self.action_pools.keys()):
            start_idx = i * neurons_per_action
            end_idx = (i + 1) * neurons_per_action if i < n_actions - 1 else len(thal_activity)
            action_scores[action_name] = float(np.mean(thal_activity[start_idx:end_idx]))
        
        # Winner-take-all selection
        if not action_scores:
            return None, 0.0
        
        winner = max(action_scores, key=action_scores.get)
        confidence = action_scores[winner]
        
        return winner, confidence
    
    def reset(self):
        """Reset all neuron voltages and inputs to baseline."""
        if self.striatum_d1:
            self.striatum_d1.v = 'rand() * 0.3'
            self.striatum_d1.I_input = 0.0
        if self.striatum_d2:
            self.striatum_d2.v = 'rand() * 0.3'
            self.striatum_d2.I_input = 0.0
        if self.gpi:
            self.gpi.v = 'rand() * 0.3'
            self.gpi.I_input = 0.1  # Tonic activity
        if self.thalamus:
            self.thalamus.v = 'rand() * 0.3'
            self.thalamus.I_input = 0.0
        
        print("✓ Basal ganglia state reset")
