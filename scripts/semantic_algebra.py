"""
Semantic Pointer Algebra

Mathematical operations for semantic pointers using the Neural Engineering Framework.
Implements binding (circular convolution), unbinding (circular correlation), and
superposition (vector addition) as described in Eliasmith (2013).

Based on:
- Eliasmith, C. (2013). How to Build a Brain. Oxford University Press.
- Gosmann & Eliasmith (2016). Optimizing Semantic Pointer Representations.

Author: Zae Project
License: MIT
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Union


# =============================================================================
# Core Mathematical Operations
# =============================================================================

def circular_convolution(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """
    Binding operation using circular convolution (A ⊛ B).

    Implements binding in O(n log n) time using FFT. This operation
    combines two semantic pointers to create a new representation
    that is dissimilar to both inputs.

    Args:
        a: First semantic pointer vector (1D array)
        b: Second semantic pointer vector (1D array, same length as a)

    Returns:
        np.ndarray: Bound semantic pointer (normalized)

    Example:
        >>> shape = np.random.randn(50) / np.sqrt(50)
        >>> circle = np.random.randn(50) / np.sqrt(50)
        >>> bound = circular_convolution(shape, circle)  # SHAPE ⊛ CIRCLE
        >>> print(bound.shape)
        (50,)

    References:
        Eliasmith (2013), Section 5.2: "Binding is circular convolution"
    """
    if len(a) != len(b):
        raise ValueError(f"Vector dimensions must match: {len(a)} != {len(b)}")

    # Circular convolution via FFT: A ⊛ B = IFFT(FFT(A) * FFT(B))
    result = np.fft.irfft(np.fft.rfft(a) * np.fft.rfft(b), n=len(a))

    # Normalize to unit vector
    norm = np.linalg.norm(result)
    if norm > 1e-10:  # Avoid division by zero
        result = result / norm

    return result


def circular_correlation(c: np.ndarray, a: np.ndarray) -> np.ndarray:
    """
    Unbinding operation using circular correlation (C ⊛ A').

    Recovers the original semantic pointer from a bound pair. This is the
    approximate inverse of circular convolution. Given C = A ⊛ B, we can
    recover B ≈ C ⊛ A'.

    Args:
        c: Bound semantic pointer (result of A ⊛ B)
        a: Key semantic pointer to unbind with

    Returns:
        np.ndarray: Unbound semantic pointer (normalized), approximately B

    Example:
        >>> # Bind then unbind
        >>> shape = np.random.randn(50) / np.sqrt(50)
        >>> circle = np.random.randn(50) / np.sqrt(50)
        >>> bound = circular_convolution(shape, circle)
        >>> recovered = circular_correlation(bound, circle)
        >>> similarity = np.dot(shape, recovered)  # Should be > 0.90

    References:
        Eliasmith (2013), Section 5.2: "Unbinding uses circular correlation"
    """
    if len(c) != len(a):
        raise ValueError(f"Vector dimensions must match: {len(c)} != {len(a)}")

    # Circular correlation via FFT: C ⊛ A' = IFFT(FFT(C) * conj(FFT(A)))
    result = np.fft.irfft(np.fft.rfft(c) * np.conj(np.fft.rfft(a)), n=len(c))

    # Normalize to unit vector
    norm = np.linalg.norm(result)
    if norm > 1e-10:
        result = result / norm

    return result


def superposition(*vectors: np.ndarray) -> np.ndarray:
    """
    Superposition operation using vector addition (A + B + C + ...).

    Combines multiple semantic pointers into a single representation
    that is similar to all inputs. Used for creating sets or lists.

    Args:
        *vectors: Variable number of semantic pointer vectors

    Returns:
        np.ndarray: Superposed semantic pointer (normalized)

    Example:
        >>> red = np.random.randn(50) / np.sqrt(50)
        >>> square = np.random.randn(50) / np.sqrt(50)
        >>> circle = np.random.randn(50) / np.sqrt(50)
        >>> combined = superposition(red, square, circle)  # RED + SQUARE + CIRCLE

    References:
        Eliasmith (2013), Section 5.1: "Superposition is vector addition"
    """
    if len(vectors) == 0:
        raise ValueError("Must provide at least one vector")

    # Check all vectors have same dimensionality
    dim = len(vectors[0])
    for i, v in enumerate(vectors[1:], 1):
        if len(v) != dim:
            raise ValueError(f"Vector {i} has dimension {len(v)}, expected {dim}")

    # Sum all vectors
    result = np.sum(vectors, axis=0)

    # Normalize to unit vector
    norm = np.linalg.norm(result)
    if norm > 1e-10:
        result = result / norm

    return result


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two semantic pointers.

    For unit vectors, this is simply the dot product. Returns a value
    in [-1, 1] where 1 means identical, 0 means orthogonal, and -1 means
    opposite.

    Args:
        a: First semantic pointer
        b: Second semantic pointer

    Returns:
        float: Similarity score in [-1, 1]

    Example:
        >>> a = np.random.randn(50) / np.sqrt(50)
        >>> b = a + 0.1 * np.random.randn(50)
        >>> b = b / np.linalg.norm(b)
        >>> similarity = cosine_similarity(a, b)  # Should be close to 1.0
    """
    if len(a) != len(b):
        raise ValueError(f"Vector dimensions must match: {len(a)} != {len(b)}")

    # For unit vectors, cosine similarity = dot product
    return float(np.dot(a, b))


# =============================================================================
# Semantic Vocabulary
# =============================================================================

class SemanticVocabulary:
    """
    Manages a collection of named semantic pointers.

    Provides storage and manipulation of semantic pointer vectors with
    human-readable names. Supports creation, binding, unbinding, and
    superposition operations.

    Attributes:
        vectors: Dictionary mapping names to semantic pointer vectors
        dim: Dimensionality of all vectors in this vocabulary

    Example:
        >>> vocab = SemanticVocabulary(dimensionality=50)
        >>> vocab.add("SHAPE")  # Randomly generated
        >>> vocab.add("CIRCLE")
        >>> vocab.bind("SHAPE", "CIRCLE", "SHAPE_CIRCLE")
        >>> similarity = vocab.similarity("SHAPE", "SHAPE_CIRCLE")
        >>> print(similarity)  # Should be close to 0 (dissimilar after binding)
    """

    def __init__(self, dimensionality: int = 50):
        """
        Initialize vocabulary with specified dimensionality.

        Args:
            dimensionality: Vector dimension (default 50 per Eliasmith 2013)
        """
        if dimensionality < 2:
            raise ValueError("Dimensionality must be at least 2")

        self.dim = dimensionality
        self.vectors: Dict[str, np.ndarray] = {}

    def add(self, name: str, vector: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Add a semantic pointer to the vocabulary.

        Args:
            name: Human-readable identifier
            vector: Optional pre-defined vector. If None, generates random unit vector

        Returns:
            np.ndarray: The added vector

        Raises:
            ValueError: If name already exists or vector has wrong dimensionality
        """
        if name in self.vectors:
            raise ValueError(f"Semantic pointer '{name}' already exists")

        if vector is None:
            # Generate random unit vector using Gaussian distribution
            vector = np.random.randn(self.dim)
            vector = vector / np.linalg.norm(vector)
        else:
            if len(vector) != self.dim:
                raise ValueError(f"Vector dimension {len(vector)} != {self.dim}")
            # Ensure unit vector
            norm = np.linalg.norm(vector)
            if norm > 1e-10:
                vector = vector / norm

        self.vectors[name] = vector
        return vector

    def get(self, name: str) -> np.ndarray:
        """
        Retrieve a semantic pointer by name.

        Args:
            name: Identifier of the semantic pointer

        Returns:
            np.ndarray: The semantic pointer vector

        Raises:
            KeyError: If name doesn't exist in vocabulary
        """
        if name not in self.vectors:
            raise KeyError(f"Semantic pointer '{name}' not found in vocabulary")
        return self.vectors[name]

    def bind(self, name_a: str, name_b: str, result_name: str) -> np.ndarray:
        """
        Bind two semantic pointers and store the result.

        Args:
            name_a: Name of first semantic pointer
            name_b: Name of second semantic pointer
            result_name: Name for the bound result

        Returns:
            np.ndarray: The bound semantic pointer
        """
        a = self.get(name_a)
        b = self.get(name_b)
        result = circular_convolution(a, b)
        self.vectors[result_name] = result
        return result

    def unbind(self, bound_name: str, key_name: str, result_name: str) -> np.ndarray:
        """
        Unbind a semantic pointer using a key.

        Args:
            bound_name: Name of bound semantic pointer
            key_name: Name of key to unbind with
            result_name: Name for the unbound result

        Returns:
            np.ndarray: The unbound semantic pointer
        """
        bound = self.get(bound_name)
        key = self.get(key_name)
        result = circular_correlation(bound, key)
        self.vectors[result_name] = result
        return result

    def superpose(self, *names: str, result_name: str) -> np.ndarray:
        """
        Superpose multiple semantic pointers.

        Args:
            *names: Names of semantic pointers to combine
            result_name: Name for the superposed result

        Returns:
            np.ndarray: The superposed semantic pointer
        """
        vectors = [self.get(name) for name in names]
        result = superposition(*vectors)
        self.vectors[result_name] = result
        return result

    def similarity(self, name_a: str, name_b: str) -> float:
        """
        Compute similarity between two semantic pointers.

        Args:
            name_a: Name of first semantic pointer
            name_b: Name of second semantic pointer

        Returns:
            float: Cosine similarity in [-1, 1]
        """
        a = self.get(name_a)
        b = self.get(name_b)
        return cosine_similarity(a, b)

    def __contains__(self, name: str) -> bool:
        """Check if semantic pointer exists in vocabulary."""
        return name in self.vectors

    def __len__(self) -> int:
        """Return number of semantic pointers in vocabulary."""
        return len(self.vectors)

    def __repr__(self) -> str:
        return f"SemanticVocabulary(dim={self.dim}, n_vectors={len(self.vectors)})"


# =============================================================================
# Neural Encoding
# =============================================================================

class NeuralEncoder:
    """
    Encodes semantic pointers as neural firing patterns using NEF principles.

    Each neuron has a preferred direction (encoder) in the semantic pointer
    space. The firing rate is proportional to the projection of the semantic
    pointer onto this preferred direction.

    Attributes:
        n_neurons: Number of neurons in the population
        dim: Dimensionality of semantic pointer space
        encoders: Preferred direction vectors for each neuron (n_neurons × dim)
        decoders: Optimal decoding weights (dim × n_neurons), computed lazily

    Example:
        >>> encoder = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        >>> sp_vector = np.random.randn(50) / np.sqrt(50)
        >>> firing_rates = encoder.encode(sp_vector)
        >>> print(firing_rates.shape)  # (40,)
        >>> recovered = encoder.decode(firing_rates)
        >>> similarity = np.dot(sp_vector, recovered)  # Should be > 0.90

    References:
        Eliasmith & Anderson (2003). Neural Engineering. Chapter 4.
    """

    def __init__(self, n_neurons: int, sp_dimensionality: int = 50, seed: Optional[int] = None):
        """
        Initialize neural encoder with random preferred directions.

        Args:
            n_neurons: Number of neurons in the population
            sp_dimensionality: Dimension of semantic pointer vectors
            seed: Random seed for reproducibility (optional)
        """
        if n_neurons < 1:
            raise ValueError("Must have at least 1 neuron")
        if sp_dimensionality < 2:
            raise ValueError("Dimensionality must be at least 2")

        self.n_neurons = n_neurons
        self.dim = sp_dimensionality

        # Set random seed if provided
        if seed is not None:
            np.random.seed(seed)

        # Generate random encoder directions (preferred directions for each neuron)
        self.encoders = np.random.randn(n_neurons, sp_dimensionality)
        # Normalize to unit vectors
        self.encoders = self.encoders / np.linalg.norm(self.encoders, axis=1, keepdims=True)

        # Decoders computed lazily
        self._decoders: Optional[np.ndarray] = None

    def encode(self, semantic_pointer: np.ndarray, gain: float = 1.0, bias: float = 0.0) -> np.ndarray:
        """
        Encode a semantic pointer as neural firing rates.

        Firing rate of neuron i is: rate[i] = max(0, gain * dot(sp, encoder[i]) + bias)

        Args:
            semantic_pointer: The semantic pointer to encode (dim,)
            gain: Multiplicative scaling factor (default 1.0)
            bias: Additive offset (default 0.0)

        Returns:
            np.ndarray: Firing rates for each neuron (n_neurons,)
        """
        if len(semantic_pointer) != self.dim:
            raise ValueError(f"Semantic pointer dimension {len(semantic_pointer)} != {self.dim}")

        # Project semantic pointer onto each neuron's preferred direction
        # firing_rate[i] = gain * dot(semantic_pointer, encoder[i]) + bias
        firing_rates = gain * (self.encoders @ semantic_pointer) + bias

        # Apply ReLU (neurons can't have negative firing rates)
        firing_rates = np.maximum(0, firing_rates)

        return firing_rates

    @property
    def decoders(self) -> np.ndarray:
        """
        Get optimal decoding weights (computed lazily).

        Decoders are the pseudo-inverse of encoders, providing the optimal
        linear reconstruction of semantic pointers from firing rates.

        Returns:
            np.ndarray: Decoding matrix (dim × n_neurons)
        """
        if self._decoders is None:
            self._decoders = self._compute_decoders()
        return self._decoders

    def _compute_decoders(self, n_samples: int = 1000, noise: float = 0.1) -> np.ndarray:
        """
        Compute optimal decoding weights using least-squares regression.

        Args:
            n_samples: Number of sample semantic pointers for training
            noise: Amount of noise to add to firing rates (regularization)

        Returns:
            np.ndarray: Decoding matrix (dim × n_neurons)
        """
        # Generate random sample semantic pointers
        samples = np.random.randn(n_samples, self.dim)
        samples = samples / np.linalg.norm(samples, axis=1, keepdims=True)

        # Encode each sample
        activities = np.array([self.encode(sample) for sample in samples])

        # Add noise for regularization
        activities = activities + noise * np.random.randn(*activities.shape)

        # Solve least-squares: activities @ decoders.T ≈ samples
        # decoders = (activities.T @ activities)^-1 @ activities.T @ samples
        decoders = np.linalg.lstsq(activities, samples, rcond=None)[0].T

        return decoders

    def decode(self, firing_rates: np.ndarray) -> np.ndarray:
        """
        Decode firing rates back to a semantic pointer.

        Args:
            firing_rates: Neural activity (n_neurons,)

        Returns:
            np.ndarray: Recovered semantic pointer (dim,), normalized
        """
        if len(firing_rates) != self.n_neurons:
            raise ValueError(f"Expected {self.n_neurons} firing rates, got {len(firing_rates)}")

        # Linear decoding: sp = decoders @ firing_rates
        recovered = self.decoders @ firing_rates

        # Normalize to unit vector
        norm = np.linalg.norm(recovered)
        if norm > 1e-10:
            recovered = recovered / norm

        return recovered

    def __repr__(self) -> str:
        return f"NeuralEncoder(n_neurons={self.n_neurons}, dim={self.dim})"


# =============================================================================
# Weight Matrix Generation
# =============================================================================

class SemanticWeightGenerator:
    """
    Generates synaptic weight matrices that implement semantic pointer operations.

    Creates connection weights between neural populations that perform
    transformations in semantic pointer space (identity, binding, unbinding).

    Attributes:
        enc_src: Encoder for source population
        enc_tgt: Encoder for target population

    Example:
        >>> enc_a = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        >>> enc_b = NeuralEncoder(n_neurons=40, sp_dimensionality=50)
        >>> gen = SemanticWeightGenerator(enc_a, enc_b)
        >>> W = gen.identity_weights()  # B = A
        >>> print(W.shape)  # (40, 40)

    References:
        Eliasmith (2013), Chapter 6: "Implementing transformations"
    """

    def __init__(self, encoder_src: NeuralEncoder, encoder_tgt: NeuralEncoder):
        """
        Initialize weight generator.

        Args:
            encoder_src: Encoder for source neural population
            encoder_tgt: Encoder for target neural population
        """
        if encoder_src.dim != encoder_tgt.dim:
            raise ValueError(
                f"Encoder dimensions must match: {encoder_src.dim} != {encoder_tgt.dim}"
            )

        self.enc_src = encoder_src
        self.enc_tgt = encoder_tgt

    def identity_weights(self) -> np.ndarray:
        """
        Generate weights that pass semantic pointer unchanged: B = A.

        Returns:
            np.ndarray: Weight matrix (n_tgt × n_src)
        """
        # W = encoders_tgt @ decoders_src
        # This projects from source space → semantic space → target space
        return self.enc_tgt.encoders @ self.enc_src.decoders

    def binding_weights(self, bind_with_vector: np.ndarray) -> np.ndarray:
        """
        Generate weights that bind with a fixed vector: B = A ⊛ V.

        Args:
            bind_with_vector: Semantic pointer to bind with (dim,)

        Returns:
            np.ndarray: Weight matrix (n_tgt × n_src)
        """
        if len(bind_with_vector) != self.enc_src.dim:
            raise ValueError(
                f"Vector dimension {len(bind_with_vector)} != {self.enc_src.dim}"
            )

        # Create transformation matrix for circular convolution
        transform = self._circular_conv_matrix(bind_with_vector)

        # W = encoders_tgt @ transform @ decoders_src
        return self.enc_tgt.encoders @ transform @ self.enc_src.decoders

    def unbinding_weights(self, unbind_vector: np.ndarray) -> np.ndarray:
        """
        Generate weights that unbind: B = A ⊛ V'.

        Args:
            unbind_vector: Semantic pointer to unbind with (dim,)

        Returns:
            np.ndarray: Weight matrix (n_tgt × n_src)
        """
        if len(unbind_vector) != self.enc_src.dim:
            raise ValueError(
                f"Vector dimension {len(unbind_vector)} != {self.enc_src.dim}"
            )

        # Create transformation matrix for circular correlation
        transform = self._circular_corr_matrix(unbind_vector)

        # W = encoders_tgt @ transform @ decoders_src
        return self.enc_tgt.encoders @ transform @ self.enc_src.decoders

    def _circular_conv_matrix(self, vector: np.ndarray) -> np.ndarray:
        """
        Create circulant matrix for circular convolution with a fixed vector.

        Args:
            vector: Semantic pointer to convolve with

        Returns:
            np.ndarray: Circulant matrix (dim × dim)
        """
        dim = len(vector)
        # Create circulant matrix where each row is a circular shift of vector
        matrix = np.zeros((dim, dim))
        for i in range(dim):
            matrix[i, :] = np.roll(vector, i)
        return matrix

    def _circular_corr_matrix(self, vector: np.ndarray) -> np.ndarray:
        """
        Create circulant matrix for circular correlation with a fixed vector.

        Correlation is the inverse operation of convolution, implemented
        by reversing the vector (except first element).

        Args:
            vector: Semantic pointer to correlate with

        Returns:
            np.ndarray: Circulant matrix (dim × dim)
        """
        # Circular correlation uses reversed vector (except first element)
        reversed_vector = np.concatenate([[vector[0]], vector[1:][::-1]])
        return self._circular_conv_matrix(reversed_vector)

    def __repr__(self) -> str:
        return (f"SemanticWeightGenerator("
                f"src={self.enc_src.n_neurons}, "
                f"tgt={self.enc_tgt.n_neurons}, "
                f"dim={self.enc_src.dim})")


# ============================================================================
# Cleanup Memory (Phase 2: Attractor Network)
# ============================================================================


class CleanupMemory:
    """
    Auto-associative attractor network for semantic pointer cleanup.

    Implements a Hopfield-like network that settles noisy semantic pointers
    into the nearest valid concept from the vocabulary. This addresses the
    "lossy" nature of neural operations by snapping corrupted vectors back
    to stable attractors.

    The cleanup process uses iterative dynamics with tanh activation:
        x_new = tanh(W @ x_old)
    where W is computed from the vocabulary using Hopfield learning.

    Args:
        vocabulary: SemanticVocabulary containing learned concepts
        threshold: Convergence threshold for settling (default: 0.001)

    Example:
        >>> vocab = SemanticVocabulary(dimensionality=50)
        >>> vocab.add("RED")
        >>> vocab.add("BLUE")
        >>> cleanup = CleanupMemory(vocab)
        >>> # Add noise to RED vector
        >>> noisy_red = vocab.get("RED") + 0.5 * np.random.randn(50)
        >>> noisy_red = noisy_red / np.linalg.norm(noisy_red)
        >>> # Clean up the noisy vector
        >>> cleaned = cleanup.cleanup(noisy_red)
        >>> # Verify it's close to original RED
        >>> similarity = cosine_similarity(cleaned, vocab.get("RED"))
        >>> print(f"Similarity: {similarity:.2%}")  # Expected: >90%

    References:
        - Hopfield, J. J. (1982). Neural networks and physical systems with
          emergent collective computational abilities.
        - Eliasmith, C. (2013). How to Build a Brain. Chapter 5: Memory.
    """

    def __init__(self, vocabulary: SemanticVocabulary, threshold: float = 0.001):
        """
        Initialize cleanup memory from vocabulary.

        Args:
            vocabulary: SemanticVocabulary with learned concepts
            threshold: Convergence threshold for settling (default: 0.001)

        Raises:
            ValueError: If vocabulary is empty or threshold is non-positive
        """
        if len(vocabulary.vectors) == 0:
            raise ValueError("Cannot create CleanupMemory with empty vocabulary")
        if threshold <= 0:
            raise ValueError(f"Threshold must be positive, got {threshold}")

        self.vocab = vocabulary
        self.dim = vocabulary.dim
        self.threshold = threshold

        # Compute Hopfield weight matrix from vocabulary
        self.weights = self._compute_hopfield_weights()

    def _compute_hopfield_weights(self) -> np.ndarray:
        """
        Compute recurrent weight matrix from vocabulary vectors.

        Uses Hopfield learning rule: W[i,j] = sum over vocab: v[i] * v[j]
        Self-connections are removed by setting diagonal to zero.

        Returns:
            np.ndarray: Weight matrix (dim × dim)
        """
        W = np.zeros((self.dim, self.dim))

        # Sum outer products of all vocabulary vectors
        for name in self.vocab.vectors:
            v = self.vocab.get(name)
            W += np.outer(v, v)

        # Remove self-connections (standard Hopfield)
        np.fill_diagonal(W, 0)

        return W

    def cleanup(
        self,
        noisy_vector: np.ndarray,
        max_iterations: int = 100,
        return_trajectory: bool = False
    ) -> Union[np.ndarray, Tuple[np.ndarray, List[np.ndarray], int]]:
        """
        Clean up a noisy semantic pointer via attractor dynamics.

        Iteratively applies the transformation:
            x_new = tanh(W @ x_old)
        then normalizes to maintain unit vector constraint. Converges when
        the change between iterations falls below the threshold.

        Args:
            noisy_vector: Noisy semantic pointer to clean (must be 1D array)
            max_iterations: Maximum number of settling iterations (default: 100)
            return_trajectory: If True, return (result, trajectory, n_iters)

        Returns:
            If return_trajectory is False:
                Cleaned semantic pointer (normalized)
            If return_trajectory is True:
                Tuple of (cleaned_vector, trajectory_list, num_iterations)

        Raises:
            ValueError: If vector dimension doesn't match vocabulary

        Example:
            >>> cleanup = CleanupMemory(vocab)
            >>> noisy = np.random.randn(50)
            >>> noisy = noisy / np.linalg.norm(noisy)
            >>> cleaned, traj, n = cleanup.cleanup(noisy, return_trajectory=True)
            >>> print(f"Converged in {n} iterations")
        """
        if len(noisy_vector) != self.dim:
            raise ValueError(
                f"Vector dimension {len(noisy_vector)} doesn't match "
                f"vocabulary dimension {self.dim}"
            )

        # Initialize state
        x = noisy_vector.copy()
        trajectory = [x.copy()] if return_trajectory else []

        # Iterative settling
        for iteration in range(max_iterations):
            # Apply attractor dynamics: x_new = tanh(W @ x)
            x_new = np.tanh(self.weights @ x)

            # Normalize to maintain unit vector
            norm = np.linalg.norm(x_new)
            if norm > 1e-10:  # Avoid division by zero
                x_new = x_new / norm
            else:
                # Degenerate case: reset to noisy vector
                x_new = noisy_vector / np.linalg.norm(noisy_vector)

            # Track trajectory if requested
            if return_trajectory:
                trajectory.append(x_new.copy())

            # Check convergence
            change = np.linalg.norm(x_new - x)
            if change < self.threshold:
                if return_trajectory:
                    return x_new, trajectory, iteration + 1
                else:
                    return x_new

            x = x_new

        # Return best result even if didn't converge
        if return_trajectory:
            return x, trajectory, max_iterations
        else:
            return x

    def find_nearest_match(self, vector: np.ndarray) -> Tuple[str, float]:
        """
        Find the nearest vocabulary vector to the given vector.

        Args:
            vector: Semantic pointer to match against vocabulary

        Returns:
            Tuple of (name, similarity_score) for the nearest match

        Raises:
            ValueError: If vector dimension doesn't match vocabulary

        Example:
            >>> cleanup = CleanupMemory(vocab)
            >>> test_vec = vocab.get("RED") + 0.1 * np.random.randn(50)
            >>> name, sim = cleanup.find_nearest_match(test_vec)
            >>> print(f"Nearest: {name} (similarity: {sim:.2%})")
        """
        if len(vector) != self.dim:
            raise ValueError(
                f"Vector dimension {len(vector)} doesn't match "
                f"vocabulary dimension {self.dim}"
            )

        best_name = None
        best_similarity = -1.0

        for name in self.vocab.vectors:
            vocab_vec = self.vocab.get(name)
            similarity = cosine_similarity(vector, vocab_vec)

            if similarity > best_similarity:
                best_similarity = similarity
                best_name = name

        return best_name, best_similarity

    def get_weights(self) -> np.ndarray:
        """
        Return the weight matrix for inspection/testing.

        Returns:
            np.ndarray: Hopfield weight matrix (dim × dim)
        """
        return self.weights.copy()

    def __repr__(self) -> str:
        return (f"CleanupMemory("
                f"vocab_size={len(self.vocab.vectors)}, "
                f"dim={self.dim}, "
                f"threshold={self.threshold})")
