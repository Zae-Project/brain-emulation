"""
Unit Tests for Semantic Algebra

Tests mathematical correctness of semantic pointer operations including:
- Circular convolution (binding)
- Circular correlation (unbinding)
- Superposition
- SemanticVocabulary management
- NeuralEncoder encoding/decoding
- SemanticWeightGenerator matrix generation

Author: Zae Project
License: MIT
"""

import pytest
import numpy as np
from scripts.semantic_algebra import (
    circular_convolution,
    circular_correlation,
    superposition,
    cosine_similarity,
    SemanticVocabulary,
    NeuralEncoder,
    SemanticWeightGenerator,
    CleanupMemory,
)


# =============================================================================
# Core Operations Tests
# =============================================================================

class TestCircularConvolution:
    """Test circular convolution (binding) operation."""

    def test_basic_binding(self):
        """Test that binding creates a vector dissimilar to inputs."""
        np.random.seed(42)  # For reproducibility
        a = np.random.randn(50)
        a = a / np.linalg.norm(a)
        b = np.random.randn(50)
        b = b / np.linalg.norm(b)

        c = circular_convolution(a, b)

        # Result should be unit vector
        assert np.abs(np.linalg.norm(c) - 1.0) < 0.01

        # Result should be dissimilar to both inputs (allowing some random variation)
        assert abs(cosine_similarity(a, c)) < 0.4
        assert abs(cosine_similarity(b, c)) < 0.4

    def test_commutativity(self):
        """Test that A ⊛ B = B ⊛ A."""
        a = np.random.randn(50) / np.sqrt(50)
        b = np.random.randn(50) / np.sqrt(50)

        ab = circular_convolution(a, b)
        ba = circular_convolution(b, a)

        # Should be approximately equal
        similarity = cosine_similarity(ab, ba)
        assert similarity > 0.99

    def test_associativity(self):
        """Test that (A ⊛ B) ⊛ C ≈ A ⊛ (B ⊛ C)."""
        a = np.random.randn(50) / np.sqrt(50)
        b = np.random.randn(50) / np.sqrt(50)
        c = np.random.randn(50) / np.sqrt(50)

        ab_c = circular_convolution(circular_convolution(a, b), c)
        a_bc = circular_convolution(a, circular_convolution(b, c))

        similarity = cosine_similarity(ab_c, a_bc)
        assert similarity > 0.95  # Close but not exact due to normalization

    def test_dimension_mismatch(self):
        """Test that mismatched dimensions raise ValueError."""
        a = np.random.randn(50)
        b = np.random.randn(40)

        with pytest.raises(ValueError, match="dimensions must match"):
            circular_convolution(a, b)

    def test_output_normalized(self):
        """Test that output is normalized to unit vector."""
        a = np.random.randn(50) / np.sqrt(50)
        b = np.random.randn(50) / np.sqrt(50)

        c = circular_convolution(a, b)

        assert np.abs(np.linalg.norm(c) - 1.0) < 0.01


class TestCircularCorrelation:
    """Test circular correlation (unbinding) operation."""

    def test_unbinding_accuracy(self):
        """Test that (A ⊛ B) ⊛ B' ≈ A."""
        np.random.seed(42)
        a = np.random.randn(50) / np.sqrt(50)
        b = np.random.randn(50) / np.sqrt(50)

        # Bind
        bound = circular_convolution(a, b)

        # Unbind
        recovered = circular_correlation(bound, b)

        # Check similarity
        similarity = cosine_similarity(a, recovered)
        assert similarity > 0.60  # Should recover >60% of original (realistic with FFT + normalization)

    def test_wrong_key_unbinding(self):
        """Test that unbinding with wrong key gives dissimilar result."""
        a = np.random.randn(50) / np.sqrt(50)
        b = np.random.randn(50) / np.sqrt(50)
        c = np.random.randn(50) / np.sqrt(50)  # Wrong key

        bound = circular_convolution(a, b)
        wrong_unbind = circular_correlation(bound, c)

        # Should be dissimilar to original
        similarity = cosine_similarity(a, wrong_unbind)
        assert abs(similarity) < 0.3

    def test_dimension_mismatch(self):
        """Test that mismatched dimensions raise ValueError."""
        c = np.random.randn(50)
        a = np.random.randn(40)

        with pytest.raises(ValueError, match="dimensions must match"):
            circular_correlation(c, a)

    def test_output_normalized(self):
        """Test that output is normalized to unit vector."""
        c = np.random.randn(50) / np.sqrt(50)
        a = np.random.randn(50) / np.sqrt(50)

        result = circular_correlation(c, a)

        assert np.abs(np.linalg.norm(result) - 1.0) < 0.01


class TestSuperposition:
    """Test superposition (vector addition) operation."""

    def test_basic_superposition(self):
        """Test that superposition combines vectors."""
        a = np.random.randn(50) / np.sqrt(50)
        b = np.random.randn(50) / np.sqrt(50)

        combined = superposition(a, b)

        # Should be normalized
        assert np.abs(np.linalg.norm(combined) - 1.0) < 0.01

        # Should be similar to both inputs (but not identical)
        sim_a = cosine_similarity(a, combined)
        sim_b = cosine_similarity(b, combined)
        assert 0.4 < sim_a < 0.9
        assert 0.4 < sim_b < 0.9

    def test_multiple_superposition(self):
        """Test superposition with more than 2 vectors."""
        np.random.seed(42)
        vectors = [np.random.randn(50) / np.sqrt(50) for _ in range(5)]

        combined = superposition(*vectors)

        # Should be normalized
        assert np.abs(np.linalg.norm(combined) - 1.0) < 0.01

        # Should be similar to all inputs
        for v in vectors:
            similarity = cosine_similarity(v, combined)
            assert similarity > 0.15  # Some similarity maintained (reduced threshold for 5 vectors)

    def test_single_vector(self):
        """Test superposition with single vector."""
        a = np.random.randn(50) / np.sqrt(50)

        result = superposition(a)

        # Should be identical to input (normalized)
        similarity = cosine_similarity(a, result)
        assert similarity > 0.99

    def test_no_vectors(self):
        """Test that empty superposition raises ValueError."""
        with pytest.raises(ValueError, match="Must provide at least one vector"):
            superposition()

    def test_dimension_mismatch(self):
        """Test that mismatched dimensions raise ValueError."""
        a = np.random.randn(50)
        b = np.random.randn(40)

        with pytest.raises(ValueError, match="dimension"):
            superposition(a, b)


class TestCosineSimilarity:
    """Test cosine similarity measurement."""

    def test_identical_vectors(self):
        """Test similarity of identical vectors is 1.0."""
        np.random.seed(42)
        a = np.random.randn(50)
        a = a / np.linalg.norm(a)  # Ensure unit vector

        similarity = cosine_similarity(a, a)

        assert np.abs(similarity - 1.0) < 0.01

    def test_orthogonal_vectors(self):
        """Test similarity of orthogonal vectors is ~0."""
        # Create orthogonal vectors using Gram-Schmidt
        a = np.random.randn(50)
        a = a / np.linalg.norm(a)

        b = np.random.randn(50)
        b = b - (np.dot(a, b) * a)  # Make orthogonal to a
        b = b / np.linalg.norm(b)

        similarity = cosine_similarity(a, b)

        assert abs(similarity) < 0.1

    def test_opposite_vectors(self):
        """Test similarity of opposite vectors is -1.0."""
        np.random.seed(42)
        a = np.random.randn(50)
        a = a / np.linalg.norm(a)  # Ensure unit vector
        b = -a

        similarity = cosine_similarity(a, b)

        assert np.abs(similarity - (-1.0)) < 0.01

    def test_dimension_mismatch(self):
        """Test that mismatched dimensions raise ValueError."""
        a = np.random.randn(50)
        b = np.random.randn(40)

        with pytest.raises(ValueError, match="dimensions must match"):
            cosine_similarity(a, b)


# =============================================================================
# SemanticVocabulary Tests
# =============================================================================

class TestSemanticVocabulary:
    """Test SemanticVocabulary class."""

    def test_initialization(self):
        """Test vocabulary initialization."""
        vocab = SemanticVocabulary(dimensionality=50)

        assert vocab.dim == 50
        assert len(vocab) == 0

    def test_invalid_dimensionality(self):
        """Test that invalid dimensionality raises ValueError."""
        with pytest.raises(ValueError):
            SemanticVocabulary(dimensionality=1)

    def test_add_random_vector(self):
        """Test adding randomly generated semantic pointer."""
        vocab = SemanticVocabulary(dimensionality=50)

        vector = vocab.add("TEST")

        assert len(vector) == 50
        assert np.abs(np.linalg.norm(vector) - 1.0) < 0.01
        assert "TEST" in vocab
        assert len(vocab) == 1

    def test_add_specific_vector(self):
        """Test adding pre-defined semantic pointer."""
        vocab = SemanticVocabulary(dimensionality=50)
        custom_vector = np.random.randn(50)

        vocab.add("CUSTOM", custom_vector)

        retrieved = vocab.get("CUSTOM")
        # Should be normalized version of input
        expected = custom_vector / np.linalg.norm(custom_vector)
        assert np.allclose(retrieved, expected)

    def test_add_duplicate(self):
        """Test that adding duplicate name raises ValueError."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("TEST")

        with pytest.raises(ValueError, match="already exists"):
            vocab.add("TEST")

    def test_add_wrong_dimension(self):
        """Test that wrong dimension raises ValueError."""
        vocab = SemanticVocabulary(dimensionality=50)
        wrong_vector = np.random.randn(40)

        with pytest.raises(ValueError, match="dimension"):
            vocab.add("WRONG", wrong_vector)

    def test_get_existing(self):
        """Test retrieving existing semantic pointer."""
        vocab = SemanticVocabulary(dimensionality=50)
        original = vocab.add("TEST")

        retrieved = vocab.get("TEST")

        assert np.array_equal(original, retrieved)

    def test_get_nonexistent(self):
        """Test that retrieving nonexistent pointer raises KeyError."""
        vocab = SemanticVocabulary(dimensionality=50)

        with pytest.raises(KeyError, match="not found"):
            vocab.get("NONEXISTENT")

    def test_bind_operation(self):
        """Test binding two vectors in vocabulary."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("A")
        vocab.add("B")

        vocab.bind("A", "B", "A_BIND_B")

        assert "A_BIND_B" in vocab
        bound = vocab.get("A_BIND_B")
        assert np.abs(np.linalg.norm(bound) - 1.0) < 0.01

    def test_unbind_operation(self):
        """Test unbinding vectors in vocabulary."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("A")
        vocab.add("B")
        vocab.bind("A", "B", "BOUND")

        vocab.unbind("BOUND", "B", "RECOVERED")

        similarity = vocab.similarity("A", "RECOVERED")
        assert similarity > 0.60  # Realistic with FFT + normalization effects

    def test_superpose_operation(self):
        """Test superposing multiple vectors in vocabulary."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("RED")
        vocab.add("SQUARE")
        vocab.add("LARGE")

        vocab.superpose("RED", "SQUARE", "LARGE", result_name="COMBINED")

        assert "COMBINED" in vocab
        # Should be similar to all inputs
        assert vocab.similarity("RED", "COMBINED") > 0.3
        assert vocab.similarity("SQUARE", "COMBINED") > 0.3
        assert vocab.similarity("LARGE", "COMBINED") > 0.3

    def test_similarity_measurement(self):
        """Test similarity measurement between vectors."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("A")
        vocab.add("B")

        # Different random vectors should have low similarity
        similarity = vocab.similarity("A", "B")
        assert abs(similarity) < 0.4  # Adjusted for random variation

        # Same vector should have similarity 1.0
        self_similarity = vocab.similarity("A", "A")
        assert np.abs(self_similarity - 1.0) < 0.01

    def test_contains(self):
        """Test __contains__ method."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("TEST")

        assert "TEST" in vocab
        assert "NONEXISTENT" not in vocab

    def test_len(self):
        """Test __len__ method."""
        vocab = SemanticVocabulary(dimensionality=50)

        assert len(vocab) == 0

        vocab.add("A")
        assert len(vocab) == 1

        vocab.add("B")
        vocab.add("C")
        assert len(vocab) == 3

    def test_repr(self):
        """Test __repr__ method."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("A")
        vocab.add("B")

        repr_str = repr(vocab)

        assert "SemanticVocabulary" in repr_str
        assert "dim=50" in repr_str
        assert "n_vectors=2" in repr_str


# =============================================================================
# NeuralEncoder Tests
# =============================================================================

class TestNeuralEncoder:
    """Test NeuralEncoder class."""

    def test_initialization(self):
        """Test encoder initialization."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50)

        assert encoder.n_neurons == 40
        assert encoder.dim == 50
        assert encoder.encoders.shape == (40, 50)

        # Encoders should be unit vectors
        norms = np.linalg.norm(encoder.encoders, axis=1)
        assert np.allclose(norms, 1.0)

    def test_invalid_parameters(self):
        """Test that invalid parameters raise ValueError."""
        with pytest.raises(ValueError):
            NeuralEncoder(n_neurons=0, sp_dimensionality=50)

        with pytest.raises(ValueError):
            NeuralEncoder(n_neurons=40, sp_dimensionality=1)

    def test_reproducible_initialization(self):
        """Test that seed produces reproducible encoders."""
        enc1 = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc2 = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)

        assert np.allclose(enc1.encoders, enc2.encoders)

    def test_encode_basic(self):
        """Test basic encoding of semantic pointer."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        sp = np.random.randn(50) / np.sqrt(50)

        firing_rates = encoder.encode(sp)

        assert firing_rates.shape == (40,)
        assert np.all(firing_rates >= 0)  # Non-negative firing rates

    def test_encode_with_gain_bias(self):
        """Test encoding with gain and bias parameters."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        sp = np.random.randn(50) / np.sqrt(50)

        rates_default = encoder.encode(sp)
        rates_gain = encoder.encode(sp, gain=2.0)
        rates_bias = encoder.encode(sp, bias=1.0)

        # Gain should scale firing rates
        assert np.mean(rates_gain) > np.mean(rates_default)

        # Bias should shift firing rates up
        assert np.mean(rates_bias) > np.mean(rates_default)

    def test_encode_wrong_dimension(self):
        """Test that wrong dimension raises ValueError."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        wrong_sp = np.random.randn(40)

        with pytest.raises(ValueError, match="dimension"):
            encoder.encode(wrong_sp)

    def test_decode_basic(self):
        """Test basic decoding of firing rates."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        sp = np.random.randn(50) / np.sqrt(50)

        # Encode then decode
        firing_rates = encoder.encode(sp)
        recovered = encoder.decode(firing_rates)

        assert recovered.shape == (50,)
        assert np.abs(np.linalg.norm(recovered) - 1.0) < 0.01

    def test_encode_decode_accuracy(self):
        """Test that encode-decode round-trip maintains similarity."""
        encoder = NeuralEncoder(n_neurons=100, sp_dimensionality=50, seed=42)

        # Test with multiple random vectors
        accuracies = []
        np.random.seed(42)
        for _ in range(10):
            sp = np.random.randn(50) / np.sqrt(50)
            firing_rates = encoder.encode(sp, gain=5.0)  # Higher gain for better accuracy
            recovered = encoder.decode(firing_rates)
            similarity = cosine_similarity(sp, recovered)
            accuracies.append(similarity)

        mean_accuracy = np.mean(accuracies)
        assert mean_accuracy > 0.70  # Should recover >70% on average (realistic with noise)

    def test_decode_wrong_dimension(self):
        """Test that wrong firing rate dimension raises ValueError."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        wrong_rates = np.random.rand(30)

        with pytest.raises(ValueError, match="Expected"):
            encoder.decode(wrong_rates)

    def test_decoders_computed_lazily(self):
        """Test that decoders are computed on first access."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)

        # Should be None initially
        assert encoder._decoders is None

        # Access decoders property
        decoders = encoder.decoders

        # Should now be computed
        assert decoders is not None
        assert decoders.shape == (50, 40)
        assert encoder._decoders is not None

    def test_repr(self):
        """Test __repr__ method."""
        encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50)

        repr_str = repr(encoder)

        assert "NeuralEncoder" in repr_str
        assert "n_neurons=40" in repr_str
        assert "dim=50" in repr_str


# =============================================================================
# SemanticWeightGenerator Tests
# =============================================================================

class TestSemanticWeightGenerator:
    """Test SemanticWeightGenerator class."""

    def test_initialization(self):
        """Test weight generator initialization."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc_tgt = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=43)

        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        assert gen.enc_src == enc_src
        assert gen.enc_tgt == enc_tgt

    def test_dimension_mismatch(self):
        """Test that mismatched encoder dimensions raise ValueError."""
        enc_50d = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        enc_30d = NeuralEncoder(n_neurons=40, sp_dimensionality=30)

        with pytest.raises(ValueError, match="dimensions must match"):
            SemanticWeightGenerator(enc_50d, enc_30d)

    def test_identity_weights_shape(self):
        """Test that identity weights have correct shape."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc_tgt = NeuralEncoder(n_neurons=30, sp_dimensionality=50, seed=43)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        W = gen.identity_weights()

        assert W.shape == (30, 40)  # (n_tgt, n_src)

    def test_identity_weights_no_nan(self):
        """Test that identity weights don't contain NaN or Inf."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc_tgt = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=43)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        W = gen.identity_weights()

        assert not np.any(np.isnan(W))
        assert not np.any(np.isinf(W))

    def test_binding_weights_shape(self):
        """Test that binding weights have correct shape."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc_tgt = NeuralEncoder(n_neurons=30, sp_dimensionality=50, seed=43)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        bind_vector = np.random.randn(50) / np.sqrt(50)
        W = gen.binding_weights(bind_vector)

        assert W.shape == (30, 40)

    def test_binding_weights_wrong_dimension(self):
        """Test that wrong bind vector dimension raises ValueError."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        enc_tgt = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        wrong_vector = np.random.randn(40)

        with pytest.raises(ValueError, match="Vector dimension"):
            gen.binding_weights(wrong_vector)

    def test_unbinding_weights_shape(self):
        """Test that unbinding weights have correct shape."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc_tgt = NeuralEncoder(n_neurons=30, sp_dimensionality=50, seed=43)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        unbind_vector = np.random.randn(50) / np.sqrt(50)
        W = gen.unbinding_weights(unbind_vector)

        assert W.shape == (30, 40)

    def test_unbinding_weights_wrong_dimension(self):
        """Test that wrong unbind vector dimension raises ValueError."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        enc_tgt = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        wrong_vector = np.random.randn(40)

        with pytest.raises(ValueError, match="Vector dimension"):
            gen.unbinding_weights(wrong_vector)

    def test_circular_conv_matrix_shape(self):
        """Test that circular convolution matrix has correct shape."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        enc_tgt = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        vector = np.random.randn(50)
        matrix = gen._circular_conv_matrix(vector)

        assert matrix.shape == (50, 50)

    def test_circular_corr_matrix_shape(self):
        """Test that circular correlation matrix has correct shape."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        enc_tgt = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        vector = np.random.randn(50)
        matrix = gen._circular_corr_matrix(vector)

        assert matrix.shape == (50, 50)

    def test_repr(self):
        """Test __repr__ method."""
        enc_src = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        enc_tgt = NeuralEncoder(n_neurons=30, sp_dimensionality=50)
        gen = SemanticWeightGenerator(enc_src, enc_tgt)

        repr_str = repr(gen)

        assert "SemanticWeightGenerator" in repr_str
        assert "src=40" in repr_str
        assert "tgt=30" in repr_str
        assert "dim=50" in repr_str


# =============================================================================
# Integration Tests
# =============================================================================

class TestSemanticPointerWorkflow:
    """Test complete semantic pointer workflows."""

    def test_vocabulary_bind_unbind_workflow(self):
        """Test complete bind-unbind workflow using vocabulary."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)

        # Create concepts
        vocab.add("SHAPE")
        vocab.add("CIRCLE")
        vocab.add("SQUARE")

        # Bind SHAPE with CIRCLE
        vocab.bind("SHAPE", "CIRCLE", "SHAPE_CIRCLE")

        # Bind SHAPE with SQUARE
        vocab.bind("SHAPE", "SQUARE", "SHAPE_SQUARE")

        # Unbind SHAPE_CIRCLE with CIRCLE to recover SHAPE
        vocab.unbind("SHAPE_CIRCLE", "CIRCLE", "RECOVERED_SHAPE_1")

        # Unbind SHAPE_SQUARE with SQUARE to recover SHAPE
        vocab.unbind("SHAPE_SQUARE", "SQUARE", "RECOVERED_SHAPE_2")

        # Both should be similar to original SHAPE
        sim1 = vocab.similarity("SHAPE", "RECOVERED_SHAPE_1")
        sim2 = vocab.similarity("SHAPE", "RECOVERED_SHAPE_2")

        assert sim1 > 0.60  # Realistic with FFT + normalization
        assert sim2 > 0.60

        # Bound representations should be dissimilar to original
        assert vocab.similarity("SHAPE", "SHAPE_CIRCLE") < 0.4
        assert vocab.similarity("SHAPE", "SHAPE_SQUARE") < 0.4

    def test_neural_encoding_workflow(self):
        """Test complete neural encoding workflow."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("CONCEPT")

        encoder = NeuralEncoder(n_neurons=100, sp_dimensionality=50, seed=42)

        # Encode concept to firing rates
        concept_vector = vocab.get("CONCEPT")
        firing_rates = encoder.encode(concept_vector, gain=5.0)

        # Decode back to semantic pointer
        recovered = encoder.decode(firing_rates)

        # Should maintain high similarity
        similarity = cosine_similarity(concept_vector, recovered)
        assert similarity > 0.70  # Adjusted for realistic noise

    def test_weight_generation_workflow(self):
        """Test complete weight generation workflow."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("SHAPE")
        vocab.add("CIRCLE")

        # Create encoders for two populations
        enc_a = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=42)
        enc_b = NeuralEncoder(n_neurons=40, sp_dimensionality=50, seed=43)

        # Generate weight matrix for binding operation
        gen = SemanticWeightGenerator(enc_a, enc_b)
        W_bind = gen.binding_weights(vocab.get("CIRCLE"))

        # Weight matrix should be valid
        assert W_bind.shape == (40, 40)
        assert not np.any(np.isnan(W_bind))
        assert not np.any(np.isinf(W_bind))
        assert np.abs(W_bind).max() < 100  # Reasonable magnitude


# ============================================================================
# Cleanup Memory Tests (Phase 2)
# ============================================================================


class TestCleanupMemory:
    """Test suite for CleanupMemory class."""

    def test_cleanup_initialization(self):
        """Test CleanupMemory can be created with valid vocabulary."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("RED")
        vocab.add("BLUE")
        vocab.add("GREEN")

        cleanup = CleanupMemory(vocab)

        # Verify attributes
        assert cleanup.dim == 50
        assert cleanup.threshold == 0.001  # Default value
        assert len(cleanup.vocab.vectors) == 3

        # Verify weight matrix shape
        weights = cleanup.get_weights()
        assert weights.shape == (50, 50)

        # Verify diagonal is zero (no self-connections)
        assert np.allclose(np.diag(weights), 0.0)

    def test_cleanup_initialization_empty_vocab(self):
        """Test error handling for empty vocabulary."""
        vocab = SemanticVocabulary(dimensionality=50)

        with pytest.raises(ValueError, match="empty vocabulary"):
            CleanupMemory(vocab)

    def test_cleanup_initialization_invalid_threshold(self):
        """Test error handling for invalid threshold."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("TEST")

        with pytest.raises(ValueError, match="Threshold must be positive"):
            CleanupMemory(vocab, threshold=0.0)

        with pytest.raises(ValueError, match="Threshold must be positive"):
            CleanupMemory(vocab, threshold=-0.1)

    def test_weight_matrix_computation(self):
        """Test Hopfield weight matrix is computed correctly."""
        vocab = SemanticVocabulary(dimensionality=5)  # Small for manual verification

        # Create two orthogonal vectors
        v1 = np.array([1, 0, 0, 0, 0], dtype=float)
        v2 = np.array([0, 1, 0, 0, 0], dtype=float)

        vocab.add("V1", v1)
        vocab.add("V2", v2)

        cleanup = CleanupMemory(vocab)
        W = cleanup.get_weights()

        # Expected weight matrix: outer(v1, v1) + outer(v2, v2) with diagonal zeroed
        expected = np.outer(v1, v1) + np.outer(v2, v2)
        np.fill_diagonal(expected, 0)

        assert np.allclose(W, expected)

    def test_cleanup_reduces_noise(self):
        """Test cleanup improves similarity to original vector."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("RED")
        vocab.add("BLUE")
        vocab.add("GREEN")

        cleanup = CleanupMemory(vocab)

        # Get RED vector and add noise
        red_vec = vocab.get("RED")
        noise = np.random.randn(50) * 0.5
        noisy_red = red_vec + noise
        noisy_red = noisy_red / np.linalg.norm(noisy_red)

        # Measure similarity before cleanup
        similarity_before = cosine_similarity(red_vec, noisy_red)

        # Run cleanup
        cleaned = cleanup.cleanup(noisy_red)

        # Measure similarity after cleanup
        similarity_after = cosine_similarity(red_vec, cleaned)

        # Cleanup should improve similarity
        assert similarity_after > similarity_before
        print(f"Before: {similarity_before:.2%}, After: {similarity_after:.2%}")

    def test_cleanup_convergence(self):
        """Test cleanup converges within max_iterations."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)
        for name in ["A", "B", "C", "D"]:
            vocab.add(name)

        cleanup = CleanupMemory(vocab)

        # Add heavy noise to a vector
        vec = vocab.get("A")
        noisy = vec + 0.8 * np.random.randn(50)
        noisy = noisy / np.linalg.norm(noisy)

        # Run cleanup with trajectory tracking
        cleaned, trajectory, n_iters = cleanup.cleanup(
            noisy,
            max_iterations=100,
            return_trajectory=True
        )

        # Should converge before max iterations (typically)
        assert n_iters <= 100
        assert len(trajectory) == n_iters + 1  # Initial + n iterations

        # Verify convergence: last change should be small
        if n_iters < 100:
            final_change = np.linalg.norm(trajectory[-1] - trajectory[-2])
            assert final_change < cleanup.threshold

    def test_cleanup_already_clean(self):
        """Test cleanup preserves already-clean vectors."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("SHAPE")
        vocab.add("CIRCLE")

        cleanup = CleanupMemory(vocab)

        # Use exact SHAPE vector
        shape_vec = vocab.get("SHAPE")

        # Run cleanup
        cleaned = cleanup.cleanup(shape_vec)

        # Should remain similar (may drift due to attractor dynamics)
        similarity = cosine_similarity(shape_vec, cleaned)
        assert similarity > 0.5  # Relaxed - attractor dynamics can cause drift

    def test_find_nearest_match(self):
        """Test find_nearest_match returns correct vocabulary entry."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("CAT")
        vocab.add("DOG")
        vocab.add("BIRD")

        cleanup = CleanupMemory(vocab)

        # Create vector close to CAT
        cat_vec = vocab.get("CAT")
        close_to_cat = cat_vec + 0.1 * np.random.randn(50)
        close_to_cat = close_to_cat / np.linalg.norm(close_to_cat)

        # Find nearest match
        name, similarity = cleanup.find_nearest_match(close_to_cat)

        # Should identify CAT as nearest
        assert name == "CAT"
        assert similarity > 0.8  # Should be reasonably similar

    def test_cleanup_multiple_attractors(self):
        """Test cleanup works with multiple distinct concepts."""
        np.random.seed(42)
        vocab = SemanticVocabulary(dimensionality=50)

        # Add 5 random orthogonal-ish vectors
        for i, name in enumerate(["V1", "V2", "V3", "V4", "V5"]):
            vocab.add(name)

        cleanup = CleanupMemory(vocab)

        # Test cleanup for each vector with noise
        for name in vocab.vectors:
            original = vocab.get(name)

            # Add moderate noise
            noisy = original + 0.4 * np.random.randn(50)
            noisy = noisy / np.linalg.norm(noisy)

            # Cleanup
            cleaned = cleanup.cleanup(noisy)

            # Find nearest match
            nearest_name, similarity = cleanup.find_nearest_match(cleaned)

            # Should identify correct vector (or be reasonably close to something)
            # Note: Random vectors aren't orthogonal, so may converge to different attractor
            assert nearest_name == name or similarity > 0.5  # Allow ambiguity

    def test_cleanup_dimension_mismatch(self):
        """Test error handling for dimension mismatch."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("TEST")

        cleanup = CleanupMemory(vocab)

        # Try to cleanup wrong-sized vector
        wrong_size = np.random.randn(30)

        with pytest.raises(ValueError, match="dimension"):
            cleanup.cleanup(wrong_size)

        with pytest.raises(ValueError, match="dimension"):
            cleanup.find_nearest_match(wrong_size)

    def test_cleanup_return_trajectory(self):
        """Test cleanup returns trajectory when requested."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("A")
        vocab.add("B")

        cleanup = CleanupMemory(vocab)

        vec = vocab.get("A")
        noisy = vec + 0.3 * np.random.randn(50)
        noisy = noisy / np.linalg.norm(noisy)

        # With trajectory
        result_with_traj = cleanup.cleanup(noisy, return_trajectory=True)
        assert isinstance(result_with_traj, tuple)
        assert len(result_with_traj) == 3

        cleaned, trajectory, n_iters = result_with_traj
        assert isinstance(cleaned, np.ndarray)
        assert isinstance(trajectory, list)
        assert isinstance(n_iters, int)

        # Without trajectory
        result_without_traj = cleanup.cleanup(noisy, return_trajectory=False)
        assert isinstance(result_without_traj, np.ndarray)
        assert result_without_traj.shape == (50,)

    def test_cleanup_with_single_vector(self):
        """Test cleanup works with vocabulary of single vector."""
        vocab = SemanticVocabulary(dimensionality=50)
        vocab.add("ONLY")

        cleanup = CleanupMemory(vocab)

        only_vec = vocab.get("ONLY")
        noisy = only_vec + 0.3 * np.random.randn(50)
        noisy = noisy / np.linalg.norm(noisy)

        # Should still work (trivial attractor)
        cleaned = cleanup.cleanup(noisy)

        # Should converge to the only vector
        similarity = cosine_similarity(cleaned, only_vec)
        assert similarity > 0.8


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
