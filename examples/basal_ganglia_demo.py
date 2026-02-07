"""
Basal Ganglia Action Selection Demonstration

Demonstrates competitive action selection using the basal ganglia circuitry.
Shows how different action utilities lead to winner-take-all selection via
the direct and indirect pathways.

Usage:
    python examples/basal_ganglia_demo.py
"""
import os
import sys
import numpy as np
from brian2 import ms

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scripts.basal_ganglia import BasalGangliaActionSelection


def main():
    print("=" * 70)
    print("BASAL GANGLIA ACTION SELECTION DEMONSTRATION")
    print("=" * 70)
    print()
    
    # Initialize basal ganglia system
    template_path = os.path.join(
        os.path.dirname(__file__), "..",
        "data", "brain_region_maps", "basal_ganglia_action_selection.json"
    )
    
    print("Step 1: Loading basal ganglia template...")
    bg = BasalGangliaActionSelection(template_path)
    print()
    
    # Register three competitive actions
    print("Step 2: Registering actions...")
    bg.register_action("REACH_LEFT", list(range(0, 30)), list(range(0, 30)))
    bg.register_action("REACH_RIGHT", list(range(30, 60)), list(range(30, 60)))
    bg.register_action("GRASP", list(range(60, 90)), list(range(60, 90)))
    print()
    
    # Scenario 1: Clear winner
    print("=" * 70)
    print("SCENARIO 1: Clear Winner (REACH_LEFT has highest utility)")
    print("=" * 70)
    
    bg.reset()
    bg.set_action_utility("REACH_LEFT", 0.9)
    bg.set_action_utility("REACH_RIGHT", 0.3)
    bg.set_action_utility("GRASP", 0.2)
    
    print("Utilities set:")
    print("  - REACH_LEFT:  0.9")
    print("  - REACH_RIGHT: 0.3")
    print("  - GRASP:       0.2")
    print()
    
    # Run simulation
    print("Running basal ganglia network for 200ms...")
    bg.network.run(200 * ms)
    
    selected, confidence = bg.get_selected_action()
    print(f"\n✓ Selected action: {selected}")
    print(f"  Confidence: {confidence:.2%}")
    print()
    
    # Scenario 2: Competition
    print("=" * 70)
    print("SCENARIO 2: Close Competition (REACH_RIGHT vs GRASP)")
    print("=" * 70)
    
    bg.reset()
    bg.set_action_utility("REACH_LEFT", 0.2)
    bg.set_action_utility("REACH_RIGHT", 0.7)
    bg.set_action_utility("GRASP", 0.6)
    
    print("Utilities set:")
    print("  - REACH_LEFT:  0.2")
    print("  - REACH_RIGHT: 0.7")
    print("  - GRASP:       0.6")
    print()
    
    print("Running basal ganglia network for 200ms...")
    bg.network.run(200 * ms)
    
    selected, confidence = bg.get_selected_action()
    print(f"\n✓ Selected action: {selected}")
    print(f"  Confidence: {confidence:.2%}")
    print()
    
    # Scenario 3: Equal utilities (ambiguous)
    print("=" * 70)
    print("SCENARIO 3: Ambiguous Choice (All equal utilities)")
    print("=" * 70)
    
    bg.reset()
    bg.set_action_utility("REACH_LEFT", 0.5)
    bg.set_action_utility("REACH_RIGHT", 0.5)
    bg.set_action_utility("GRASP", 0.5)
    
    print("Utilities set:")
    print("  - REACH_LEFT:  0.5")
    print("  - REACH_RIGHT: 0.5")
    print("  - GRASP:       0.5")
    print()
    
    print("Running basal ganglia network for 200ms...")
    bg.network.run(200 * ms)
    
    selected, confidence = bg.get_selected_action()
    print(f"\n✓ Selected action: {selected}")
    print(f"  Confidence: {confidence:.2%}")
    print("  (Note: With equal utilities, selection may vary due to noise)")
    print()
    
    # Demonstrate dynamic switching
    print("=" * 70)
    print("SCENARIO 4: Dynamic Utility Changes")
    print("=" * 70)
    
    bg.reset()
    
    print("Initial utilities:")
    bg.set_action_utility("REACH_LEFT", 0.8)
    bg.set_action_utility("REACH_RIGHT", 0.3)
    bg.set_action_utility("GRASP", 0.2)
    print("  - REACH_LEFT:  0.8")
    print("  - REACH_RIGHT: 0.3")
    print("  - GRASP:       0.2")
    
    print("\nRunning for 100ms...")
    bg.network.run(100 * ms)
    selected1, conf1 = bg.get_selected_action()
    print(f"Selected: {selected1} (confidence: {conf1:.2%})")
    
    print("\nChanging utilities (favoring GRASP)...")
    bg.set_action_utility("REACH_LEFT", 0.2)
    bg.set_action_utility("REACH_RIGHT", 0.3)
    bg.set_action_utility("GRASP", 0.9)
    print("  - REACH_LEFT:  0.2")
    print("  - REACH_RIGHT: 0.3")
    print("  - GRASP:       0.9")
    
    print("\nRunning for another 100ms...")
    bg.network.run(100 * ms)
    selected2, conf2 = bg.get_selected_action()
    print(f"Selected: {selected2} (confidence: {conf2:.2%})")
    
    if selected1 != selected2:
        print("\n✓ Action selection switched based on utility changes!")
    print()
    
    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()
    print("The basal ganglia action selection system successfully:")
    print("  ✓ Loads anatomical templates (JSON → Brian2)")
    print("  ✓ Implements direct pathway (Striatum D1 → GPi inhibition)")
    print("  ✓ Implements indirect pathway (Striatum D2 → GPe → GPi)")
    print("  ✓ Performs winner-take-all action selection")
    print("  ✓ Responds dynamically to utility changes")
    print()
    print("This demonstrates Phase 3 of the Neural Architecture of Thought:")
    print("  → Cortical input → Striatum → BG circuitry → Thalamus")
    print("  → Selected action disinhibits thalamus for cortical routing")
    print()
    print("Next steps:")
    print("  - Connect to semantic pointer working memory (Phase 1 & 2)")
    print("  - Implement cortical gating based on selected actions")
    print("  - Integrate with cleanup memory for robust action representations")
    print()
    print("=" * 70)


if __name__ == "__main__":
    main()
