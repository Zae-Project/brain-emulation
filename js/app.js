// Fixed SNN Visualizer with a stable orbit camera system

class SNNVisualizer {
  constructor() {
    this.state = {
      isRunning: true,
      showWeights: false,
      speed: 1,
      firingRate: 0.0002, // Much lower default firing rate
      pulseDecay: 0.95,
      threshold: 1.0,
      pauseSpikes: false,
      selectedNeuron: null,
    };

    this.config = {
      networkSize: 120,
      connectionProb: 0.3,
      neuronSize: 1.0,
      pulseIntensity: 1.5,
      cameraMoveSpeed: 0.3,
    };

    this.CLUSTER_COLORS = [
      {
        primary: { r: 0.22, g: 0.31, b: 0.52 }, // Neural blue
        glow: { r: 0.4, g: 0.5, b: 0.7 },
        name: "Neural",
      },
      {
        primary: { r: 0.53, g: 0.47, b: 0.56 }, // Pulse purple
        glow: { r: 0.7, g: 0.6, b: 0.75 },
        name: "Pulse",
      },
      {
        primary: { r: 0.54, g: 0.35, b: 0.45 }, // Highlight rose
        glow: { r: 0.75, g: 0.5, b: 0.65 },
        name: "Highlight",
      },
      {
        primary: { r: 0.29, g: 0.21, b: 0.32 }, // Deep purple
        glow: { r: 0.5, g: 0.4, b: 0.55 },
        name: "Deep",
      },
    ];

    this.neurons = [];
    this.connections = [];
    this.voltageHistory = [];

    // Make this instance globally accessible for lesson buttons
    window.snnVisualizer = this;

    this.init();
  }

  init() {
    this.initDOM();
    this.initCanvas();
    this.createNetwork();
    this.bindUI();
    this.initLessons();

    // Debug: Log network creation
    console.log(`Network initialized with ${this.neurons.length} neurons`);

    // Start animation immediately
    this.animate();

    // Initialize tooltip positioning
    this.initTooltips();
  }

  initDOM() {
    this.dom = {
      canvas: document.getElementById("three-canvas"),
      playBtn: document.getElementById("play"),
      speedSlider: document.getElementById("speed"),
      networkSizeSlider: document.getElementById("networkSize"),
      sizeValueLabel: document.getElementById("sizeValue"),
      connectionProbSlider: document.getElementById("connectionProb"),
      probValueLabel: document.getElementById("probValue"),
      firingRateSlider: document.getElementById("firingRate"),
      firingValueLabel: document.getElementById("firingValue"),
      pulseDecaySlider: document.getElementById("pulseDecay"),
      decayValueLabel: document.getElementById("decayValue"),
      thresholdSlider: document.getElementById("threshold"),
      thresholdValueLabel: document.getElementById("thresholdValue"),
      resetBtn: document.getElementById("resetNetwork"),
      showWeightsBtn: document.getElementById("showWeights"),
      pauseSpikesBtn: document.getElementById("pauseSpikes"),
      injectSpikeBtn: document.getElementById("injectSpike"),
      lessonSelect: document.getElementById("lessonSelect"),
      lessonContent: document.getElementById("lessonContent"),
      voltageValue: document.getElementById("voltageValue"),
      trace: document.getElementById("trace"),
      errEl: document.getElementById("err"),
    };

    // Initialize trace canvas
    if (this.dom.trace) {
      this.traceCtx = this.dom.trace.getContext("2d");
      this.clearTrace();
    }
  }

  initCanvas() {
    if (!this.dom.canvas) {
      console.error("Canvas element not found!");
      return;
    }

    this.ctx = this.dom.canvas.getContext("2d");
    this.resizeCanvas();

    // Set up a proper orbit camera system
    this.camera = {
      position: { x: 0, y: 0, z: 0 }, // Calculated from orbit
      target: { x: 0, y: 0, z: 0 },
      rotation: { pitch: 0.2, yaw: -0.5 },
      distance: 1800, // Adjusted for a closer view
      mouse: {
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        isLeftDown: false,
        isRightDown: false,
        sensitivity: 0.006,
      },
      moveSpeed: 3.0,
      move: { forward: 0, right: 0, up: 0 },
    };

    this.initCameraControls();

    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.dom.canvas.width = window.innerWidth;
    this.dom.canvas.height = window.innerHeight;
    this.dom.canvas.style.width = window.innerWidth + "px";
    this.dom.canvas.style.height = window.innerHeight + "px";
  }

  initCameraControls() {
    this.dom.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.dom.canvas.addEventListener("wheel", (e) => this.onWheel(e));
    this.dom.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.dom.canvas.addEventListener("click", (e) => this.onCanvasClick(e));
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
  }

  onMouseDown(e) {
    if (e.button === 0) this.camera.mouse.isLeftDown = true;
    if (e.button === 2) this.camera.mouse.isRightDown = true;
    this.camera.mouse.lastX = e.clientX;
    this.camera.mouse.lastY = e.clientY;
  }

  onMouseUp(e) {
    if (e.button === 0) this.camera.mouse.isLeftDown = false;
    if (e.button === 2) this.camera.mouse.isRightDown = false;
  }

  onMouseMove(e) {
    const deltaX = e.clientX - this.camera.mouse.lastX;
    const deltaY = e.clientY - this.camera.mouse.lastY;
    this.camera.mouse.lastX = e.clientX;
    this.camera.mouse.lastY = e.clientY;

    if (this.camera.mouse.isLeftDown) {
      // Orbit mode
      this.camera.rotation.yaw -= deltaX * this.camera.mouse.sensitivity;
      this.camera.rotation.pitch -= deltaY * this.camera.mouse.sensitivity;
      this.camera.rotation.pitch = Math.max(
        -Math.PI / 2.1,
        Math.min(Math.PI / 2.1, this.camera.rotation.pitch)
      );
    } else if (this.camera.mouse.isRightDown) {
      // Pan mode
      const right = this.getCameraRight();
      const up = this.getCameraUp();
      const panSpeed = 0.9;

      // Pan the target
      this.camera.target.x -= (right.x * deltaX - up.x * deltaY) * panSpeed;
      this.camera.target.y -= (right.y * deltaX - up.y * deltaY) * panSpeed;
      this.camera.target.z -= (right.z * deltaX - up.z * deltaY) * panSpeed;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 40;
    this.camera.distance += (e.deltaY > 0 ? 1 : -1) * zoomSpeed;
    this.camera.distance = Math.max(200, Math.min(5000, this.camera.distance));
  }

  onCanvasClick(e) {
    // Detect neuron clicks for selection
    const rect = this.dom.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestNeuron = null;
    let closestDistance = Infinity;

    this.neurons.forEach((neuron) => {
      const projected = this.project3D(neuron.position);
      const distance = Math.sqrt(
        (mouseX - projected.x) ** 2 + (mouseY - projected.y) ** 2
      );

      if (distance < 30 && distance < closestDistance) {
        closestDistance = distance;
        closestNeuron = neuron;
      }
    });

    if (closestNeuron) {
      this.state.selectedNeuron = closestNeuron;
      this.voltageHistory = [];
    }
  }

  onKeyDown(e) {
    if (e.code === "KeyW") this.camera.move.forward = 1;
    if (e.code === "KeyS") this.camera.move.forward = -1;
    if (e.code === "KeyD") this.camera.move.right = 1;
    if (e.code === "KeyA") this.camera.move.right = -1;
    if (e.code === "KeyE") this.camera.move.up = 1;
    if (e.code === "KeyQ") this.camera.move.up = -1;
    if (e.code === "Space") {
      e.preventDefault();
      this.resetCamera();
    }
  }

  onKeyUp(e) {
    if (e.code === "KeyW" || e.code === "KeyS") this.camera.move.forward = 0;
    if (e.code === "KeyA" || e.code === "KeyD") this.camera.move.right = 0;
    if (e.code === "KeyQ" || e.code === "KeyE") this.camera.move.up = 0;
  }

  getCameraForward() {
    return this.normalize({
      x: this.camera.target.x - this.camera.position.x,
      y: this.camera.target.y - this.camera.position.y,
      z: this.camera.target.z - this.camera.position.z,
    });
  }

  getCameraRight() {
    return this.normalize(
      this.cross({ x: 0, y: 1, z: 0 }, this.getCameraForward())
    );
  }

  getCameraUp() {
    return this.cross(this.getCameraForward(), this.getCameraRight());
  }

  normalize(v) {
    const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (l === 0) return { x: 0, y: 1, z: 0 };
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  }

  cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  updateCameraPosition() {
    const cam = this.camera;

    // Handle WASD panning (moves the target)
    const speed = cam.moveSpeed;
    const lookDir = this.getCameraForward();
    const forward = this.normalize({ x: lookDir.x, y: 0, z: lookDir.z });
    const right = this.getCameraRight();

    cam.target.x +=
      (forward.x * cam.move.forward + right.x * cam.move.right) * speed;
    cam.target.z +=
      (forward.z * cam.move.forward + right.z * cam.move.right) * speed;
    cam.target.y += cam.move.up * speed;

    // Calculate camera position based on orbit (distance, rotation, target)
    const hDist = cam.distance * Math.cos(cam.rotation.pitch);
    const vDist = cam.distance * Math.sin(cam.rotation.pitch);

    cam.position.x = cam.target.x - hDist * Math.sin(cam.rotation.yaw);
    cam.position.y = cam.target.y + vDist;
    cam.position.z = cam.target.z - hDist * Math.cos(cam.rotation.yaw);
  }

  resetCamera() {
    this.camera.target = { x: 0, y: 0, z: 0 };
    this.camera.rotation = { pitch: 0.2, yaw: -0.5 };
    this.camera.distance = 1800;
  }

  project3D(pos) {
    const cam = this.camera;
    const fwd = this.getCameraForward();
    const right = this.getCameraRight();
    const up = this.getCameraUp();

    const dx = pos.x - cam.position.x;
    const dy = pos.y - cam.position.y;
    const dz = pos.z - cam.position.z;

    const x2 = dx * right.x + dy * right.y + dz * right.z;
    const y2 = dx * up.x + dy * up.y + dz * up.z;
    const z2 = dx * fwd.x + dy * fwd.y + dz * fwd.z;

    const fov = 1000; // Adjusted field of view factor
    const distance = Math.max(1, z2);
    const scale = fov / distance;

    return {
      x: this.dom.canvas.width / 2 + x2 * scale,
      y: this.dom.canvas.height / 2 - y2 * scale,
      scale: scale,
      depth: z2,
    };
  }

  // Test function to force render visible neurons
  testRender() {
    // Clear canvas
    this.ctx.fillStyle = "#0a0c12";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    // Draw test circle to verify canvas works
    this.ctx.fillStyle = "#ff0000";
    this.ctx.beginPath();
    this.ctx.arc(100, 100, 30, 0, Math.PI * 2);
    this.ctx.fill();

    // Check if neurons exist
    if (!this.neurons || this.neurons.length === 0) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "24px Arial";
      this.ctx.fillText("No neurons created!", 200, 200);
      return;
    }

    // Draw neurons at fixed positions to test visibility
    this.neurons.forEach((neuron, i) => {
      const x = 200 + (i % 10) * 60;
      const y = 200 + Math.floor(i / 10) * 60;
      const radius = 20;

      // Draw neuron
      const color = neuron.colors.primary;
      this.ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(
        color.g * 255
      )}, ${Math.floor(color.b * 255)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw neuron ID
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "12px Arial";
      this.ctx.fillText(i.toString(), x - 5, y + 3);
    });

    // Draw debug info
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "16px Arial";
    this.ctx.fillText(`Neurons: ${this.neurons.length}`, 20, 50);
    this.ctx.fillText(`Connections: ${this.connections.length}`, 20, 70);
  }

  // Simple working 3D projection
  simpleProject3D(pos) {
    const cam = this.camera;

    // Simple distance-based projection
    const dx = pos.x - cam.position.x;
    const dy = pos.y - cam.position.y;
    const dz = pos.z - cam.position.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const scale = 500 / Math.max(distance, 50);

    const screenX = this.dom.canvas.width / 2 + dx * scale;
    const screenY = this.dom.canvas.height / 2 - dy * scale;

    return {
      x: screenX,
      y: screenY,
      scale: Math.max(0.1, scale / 5),
      depth: distance,
    };
  }

  // Working render function
  workingRender() {
    // Clear canvas
    this.ctx.fillStyle = "#0a0c12";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    if (!this.neurons || this.neurons.length === 0) {
      this.ctx.fillStyle = "#ff0000";
      this.ctx.font = "20px Arial";
      this.ctx.fillText("Network not created!", 100, 100);
      return;
    }

    // Render neurons with simple projection
    this.neurons.forEach((neuron, i) => {
      const projected = this.simpleProject3D(neuron.position);

      if (
        projected.x < -100 ||
        projected.x > this.dom.canvas.width + 100 ||
        projected.y < -100 ||
        projected.y > this.dom.canvas.height + 100
      ) {
        return;
      }

      const radius = Math.max(5, 15 * projected.scale);
      const intensity = neuron.pulse / this.config.pulseIntensity;

      // Draw neuron
      const color =
        intensity > 0.1 ? neuron.colors.glow : neuron.colors.primary;
      const brightness = intensity > 0.1 ? 1.0 : 0.8;
      this.ctx.fillStyle = `rgb(${Math.floor(
        color.r * 255 * brightness
      )}, ${Math.floor(color.g * 255 * brightness)}, ${Math.floor(
        color.b * 255 * brightness
      )})`;

      this.ctx.beginPath();
      this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Add rim
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    // Debug info - top center and always visible
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    this.ctx.font = "12px Inter, monospace";
    this.ctx.textAlign = "center";
    const zoom = (1800 / this.camera.distance).toFixed(2);
    const debugText = `CAM DIST: ${Math.round(
      this.camera.distance
    )} | ZOOM: ${zoom}x | NEURONS: ${this.neurons.length}`;
    this.ctx.fillText(debugText, this.dom.canvas.width / 2, 30);
    this.ctx.textAlign = "left"; // Reset alignment
  }

  render() {
    // Clear canvas with pure black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    // Track which neurons have fired recently for cluster visualization
    const now = Date.now();
    const recentlyFired = new Set();
    this.neurons.forEach((neuron) => {
      if (now - (neuron.lastFire || 0) < 500) {
        recentlyFired.add(neuron.id);
      }
    });

    // Render connections: all light grey except between active neurons in same cluster
    this.connections.forEach((conn) => {
      const startProj = this.project3D(conn.from.position);
      const endProj = this.project3D(conn.to.position);

      // Check if BOTH neurons have fired recently AND are in the same cluster
      const bothFiredRecently =
        recentlyFired.has(conn.from.id) && recentlyFired.has(conn.to.id);
      const sameCluster =
        Math.floor(conn.from.id / (this.config.networkSize / 4)) ===
        Math.floor(conn.to.id / (this.config.networkSize / 4));

      if (bothFiredRecently && sameCluster) {
        // Active connection within the same cluster - highlight with that cluster's color
        const activeColor = conn.from.colors.glow;
        this.ctx.strokeStyle = `rgba(${Math.floor(
          activeColor.r * 255
        )}, ${Math.floor(activeColor.g * 255)}, ${Math.floor(
          activeColor.b * 255
        )}, 0.8)`;
        this.ctx.lineWidth = 0.6; // Slightly thicker for active connections
      } else {
        // Inactive connection - extremely thin grey line
        this.ctx.strokeStyle = `rgba(189, 189, 189, 0.15)`; // Very light grey
        this.ctx.lineWidth = 0.2; // Ultra-thin inactive connections
      }

      this.ctx.beginPath();
      this.ctx.moveTo(startProj.x, startProj.y);
      this.ctx.lineTo(endProj.x, endProj.y);
      this.ctx.stroke();
    });

    // Render neurons with zoom-responsive scaling
    this.neurons.forEach((neuron) => {
      const projected = this.project3D(neuron.position);

      // Skip if way off screen (but allow negative depth for now)
      if (
        projected.x < -200 ||
        projected.x > this.dom.canvas.width + 200 ||
        projected.y < -200 ||
        projected.y > this.dom.canvas.height + 200
      ) {
        return;
      }

      // Zoom-responsive neuron size - much smaller base size
      const baseRadius = 8; // Reduced from 12 to 4
      const radius = Math.max(
        1.5,
        baseRadius *
          projected.scale *
          (projected.zoomFactor || 1) *
          this.config.neuronSize
      );
      const intensity = neuron.pulse / this.config.pulseIntensity;

      // Check if this neuron or its cluster is active
      const isActive = intensity > 0.1;
      const clusterId = Math.floor(neuron.id / (this.config.networkSize / 4));

      // Check if any neuron in this cluster has fired recently
      let clusterActive = isActive;
      if (!clusterActive) {
        // Only check for cluster activity if the neuron itself isn't active
        for (let i = 0; i < this.neurons.length; i++) {
          if (Math.floor(i / (this.config.networkSize / 4)) === clusterId) {
            const otherNeuron = this.neurons[i];
            if (otherNeuron.pulse / this.config.pulseIntensity > 0.1) {
              clusterActive = true;
              break;
            }
          }
        }
      }

      // Draw glow effect when firing - scales with zoom
      if (isActive) {
        const glowRadius = radius * (1.8 + intensity * 2.0);
        const gradient = this.ctx.createRadialGradient(
          projected.x,
          projected.y,
          0,
          projected.x,
          projected.y,
          glowRadius
        );

        const glowColor = neuron.colors.glow;
        gradient.addColorStop(
          0,
          `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(
            glowColor.g * 255
          )}, ${Math.floor(glowColor.b * 255)}, ${intensity * 0.6})`
        );
        gradient.addColorStop(
          0.5,
          `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(
            glowColor.g * 255
          )}, ${Math.floor(glowColor.b * 255)}, ${intensity * 0.3})`
        );
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Draw neuron body as square - use grey for inactive clusters, color for active ones
      const depthFade = Math.min(1, 800 / Math.max(20, projected.depth));
      const squareSize = radius * 2; // Convert radius to square size

      if (clusterActive) {
        // Use cluster color for active clusters
        const color = isActive ? neuron.colors.glow : neuron.colors.primary;
        const brightness = (isActive ? 1.0 : 0.9) * depthFade;

        this.ctx.fillStyle = `rgba(${Math.floor(
          color.r * 255 * brightness
        )}, ${Math.floor(color.g * 255 * brightness)}, ${Math.floor(
          color.b * 255 * brightness
        )}, 0.5)`; // 50% opacity
      } else {
        // Use grey for inactive clusters
        const greyLevel = Math.floor(150 * depthFade);
        this.ctx.fillStyle = `rgba(${greyLevel}, ${greyLevel}, ${greyLevel}, 0.5)`; // 50% opacity
      }

      // Draw square neuron
      this.ctx.fillRect(
        projected.x - squareSize / 2,
        projected.y - squareSize / 2,
        squareSize,
        squareSize
      );

      // Draw thin solid border
      this.ctx.strokeStyle = clusterActive
        ? `rgba(${Math.floor(
            (isActive ? neuron.colors.glow : neuron.colors.primary).r *
              255 *
              depthFade
          )}, ${Math.floor(
            (isActive ? neuron.colors.glow : neuron.colors.primary).g *
              255 *
              depthFade
          )}, ${Math.floor(
            (isActive ? neuron.colors.glow : neuron.colors.primary).b *
              255 *
              depthFade
          )}, 0.9)`
        : `rgba(200, 200, 200, 0.7)`;
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([]); // Ensure solid line
      this.ctx.strokeRect(
        projected.x - squareSize / 2,
        projected.y - squareSize / 2,
        squareSize,
        squareSize
      ); // Draw neuron ID number inside the square
      if (squareSize > 12) {
        // Only show numbers when square is large enough
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * depthFade})`; // White text with fade
        this.ctx.font = `${Math.max(
          8,
          Math.min(12, squareSize * 0.4)
        )}px Inter, monospace`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(neuron.id.toString(), projected.x, projected.y);
      }

      // Highlight selected neuron with premium neural accent color
      if (neuron === this.state.selectedNeuron) {
        this.ctx.strokeStyle = "#374E84"; // Use accent-neural
        this.ctx.lineWidth = Math.max(2, squareSize * 0.1);
        this.ctx.strokeRect(
          projected.x - squareSize / 2,
          projected.y - squareSize / 2,
          squareSize,
          squareSize
        );
      }

      // Show weight information panels if enabled
      if (
        this.state.showWeights &&
        neuron.connections.length > 0 &&
        radius > 8
      ) {
        this.renderWeightPanel(neuron, projected);
      }
    });

    // Debug info - top center and always visible
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    this.ctx.font = "12px Inter, monospace";
    this.ctx.textAlign = "center";
    const zoom = (1800 / this.camera.distance).toFixed(2);
    const debugText = `CAM DIST: ${Math.round(
      this.camera.distance
    )} | ZOOM: ${zoom}x | NEURONS: ${this.neurons.length}`;
    this.ctx.fillText(debugText, this.dom.canvas.width / 2, 30);
    this.ctx.textAlign = "left"; // Reset alignment
  }

  renderWeightPanel(neuron, projected) {
    // Draw a small panel near the neuron showing its outgoing weights
    const panelWidth = 90;
    const panelHeight = 18 + Math.min(5, neuron.connections.length) * 14;
    const x = projected.x + 18;
    const y = projected.y - panelHeight / 2;
    this.ctx.save();
    this.ctx.globalAlpha = 0.92;
    this.ctx.fillStyle = "#181b22";
    this.ctx.strokeStyle = "#374E84";
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, panelWidth, panelHeight, 6);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = "#b5b7c3";
    this.ctx.font = "11px Inter, monospace";
    this.ctx.textAlign = "left";
    this.ctx.fillText("Weights:", x + 8, y + 14);
    for (let i = 0; i < Math.min(5, neuron.connections.length); i++) {
      const conn = neuron.connections[i];
      this.ctx.fillStyle = "#b5b7c3";
      this.ctx.fillText(
        `→ ${conn.to.id}: ${conn.weight.toFixed(2)}`,
        x + 8,
        y + 14 + (i + 1) * 13
      );
    }
    this.ctx.restore();
  }

  bindUI() {
    // All the UI binding code
    if (this.dom.playBtn) {
      this.dom.playBtn.addEventListener("click", () => {
        this.state.isRunning = !this.state.isRunning;
        this.dom.playBtn.textContent = this.state.isRunning ? "Pause" : "Play";
        this.dom.playBtn.classList.toggle("on", this.state.isRunning);
      });
    }

    if (this.dom.speedSlider) {
      this.dom.speedSlider.addEventListener("input", (e) => {
        this.state.speed = parseFloat(e.target.value);
      });
    }

    if (this.dom.networkSizeSlider) {
      this.dom.networkSizeSlider.addEventListener("input", (e) => {
        this.config.networkSize = parseInt(e.target.value);
        if (this.dom.sizeValueLabel) {
          this.dom.sizeValueLabel.textContent = this.config.networkSize;
        }
      });

      this.dom.networkSizeSlider.addEventListener("change", () => {
        this.createNetwork();
      });
    }

    if (this.dom.connectionProbSlider) {
      this.dom.connectionProbSlider.addEventListener("input", (e) => {
        this.config.connectionProb = parseFloat(e.target.value);
        if (this.dom.probValueLabel) {
          this.dom.probValueLabel.textContent =
            this.config.connectionProb.toFixed(2);
        }
      });

      this.dom.connectionProbSlider.addEventListener("change", () => {
        this.createNetwork();
      });
    }

    if (this.dom.resetBtn) {
      this.dom.resetBtn.addEventListener("click", () => {
        this.createNetwork();
      });
    }

    if (this.dom.showWeightsBtn) {
      this.dom.showWeightsBtn.addEventListener("click", () => {
        this.state.showWeights = !this.state.showWeights;
        this.dom.showWeightsBtn.classList.toggle("on", this.state.showWeights);
      });
    }

    if (this.dom.injectSpikeBtn) {
      this.dom.injectSpikeBtn.addEventListener("click", () => {
        const randomNeuron =
          this.neurons[Math.floor(Math.random() * this.neurons.length)];
        this.fireNeuron(randomNeuron);
      });
    }

    // Additional controls
    if (this.dom.firingRateSlider) {
      this.dom.firingRateSlider.addEventListener("input", (e) => {
        this.state.firingRate = parseFloat(e.target.value);
        if (this.dom.firingValueLabel) {
          this.dom.firingValueLabel.textContent =
            this.state.firingRate.toFixed(4);
        }
      });
    }

    if (this.dom.pauseSpikesBtn) {
      this.dom.pauseSpikesBtn.addEventListener("click", () => {
        this.state.pauseSpikes = !this.state.pauseSpikes;
        this.dom.pauseSpikesBtn.classList.toggle("on", this.state.pauseSpikes);
        this.dom.pauseSpikesBtn.textContent = this.state.pauseSpikes
          ? "Resume Spikes"
          : "Pause Spikes";
      });
    }

    // Additional parameter controls
    if (this.dom.pulseDecaySlider) {
      this.dom.pulseDecaySlider.addEventListener("input", (e) => {
        this.state.pulseDecay = parseFloat(e.target.value);
        if (this.dom.decayValueLabel) {
          this.dom.decayValueLabel.textContent =
            this.state.pulseDecay.toFixed(2);
        }
      });
    }

    if (this.dom.thresholdSlider) {
      this.dom.thresholdSlider.addEventListener("input", (e) => {
        this.state.threshold = parseFloat(e.target.value);
        if (this.dom.thresholdValueLabel) {
          this.dom.thresholdValueLabel.textContent =
            this.state.threshold.toFixed(1);
        }
      });
    }
  }

  initLessons() {
    if (this.dom.lessonSelect) {
      this.dom.lessonSelect.addEventListener("change", (e) => {
        this.updateLesson(parseInt(e.target.value));
      });
    }

    this.updateLesson(1);
  }

  updateLesson(lessonNumber) {
    const lessons = {
      1: {
        title: "Lesson 1: Basic Spikes",
        content:
          "Each neuron accumulates voltage over time. When it reaches threshold (v≥1), it fires a spike and resets to 0.",
        file: "lessons/lesson1.html",
      },
      2: {
        title: "Lesson 2: Synaptic Transmission",
        content:
          "Spikes travel along synapses (connections) between neurons, with varying weights affecting signal strength.",
        file: "lessons/lesson2.html",
      },
      3: {
        title: "Lesson 3: Network Plasticity",
        content:
          "Synaptic weights can change over time based on neural activity, enabling learning and adaptation.",
        file: "lessons/lesson3.html",
      },
      4: {
        title: "Lesson 4: Pattern Recognition",
        content:
          "SNNs can learn to recognize temporal patterns in spike trains, making them ideal for processing time-series data.",
        file: "lessons/lesson4.html",
      },
      5: {
        title: "Lesson 5: Network Topology",
        content:
          "Brain-like networks organize into clusters and modules, creating small-world properties that optimize both local processing and global communication.",
        file: "lessons/lesson5.html",
      },
      6: {
        title: "Lesson 6: Inhibition & Competition",
        content:
          "Inhibitory connections create competitive dynamics, enabling winner-take-all mechanisms crucial for attention and decision-making.",
        file: "lessons/lesson6.html",
      },
      7: {
        title: "Lesson 7: Multi-layer Processing",
        content:
          "Hierarchical networks extract increasingly complex features, similar to cortical organization in biological brains.",
        file: "lessons/lesson7.html",
      },
      8: {
        title: "Lesson 8: Memory Systems",
        content:
          "Different types of memory (working, long-term, episodic) emerge from distinct network architectures and plasticity rules.",
        file: "lessons/lesson8.html",
      },
      9: {
        title: "Lesson 9: Large-Scale Networks",
        content:
          "Brain-wide networks coordinate information integration, giving rise to global workspace dynamics and potentially consciousness.",
        file: "lessons/lesson9.html",
      },
      10: {
        title: "Lesson 10: Neural Oscillations",
        content:
          "Rhythmic neural activity coordinates processing across brain regions, enabling binding and temporal organization of information.",
        file: "lessons/lesson10.html",
      },
      11: {
        title: "Lesson 11: Brain Emulation Theory",
        content:
          "Whole brain emulation aims to create functional copies of specific brains, requiring advances in scanning, modeling, and computing.",
        file: "lessons/lesson11.html",
      },
      12: {
        title: "Lesson 12: Ethics & Future",
        content:
          "Digital minds raise profound questions about consciousness, identity, rights, and humanity's future that we must address responsibly.",
        file: "lessons/lesson12.html",
      },
    };

    const lesson = lessons[lessonNumber];
    if (lesson && this.dom.lessonContent) {
      this.dom.lessonContent.innerHTML = `
        <div class="lesson">
          <strong>${lesson.title}</strong><br />
          ${lesson.content}
          <button class="btn" style="margin-top: 8px; padding: 6px 12px; font-size: 12px;" onclick="window.snnVisualizer.showFullLesson(${lessonNumber})">View Full Lesson</button>
        </div>
      `;
    }
  }

  initTooltips() {
    // Handle dynamic tooltip positioning
    const paramInfos = document.querySelectorAll(".param-info");

    paramInfos.forEach((info) => {
      const tooltip = info.querySelector(".tooltip");
      if (tooltip) {
        info.addEventListener("mouseenter", (e) => {
          const rect = info.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();

          // Position tooltip to the right of the info icon with some margin
          let left = rect.right + 10;
          let top = rect.top - 10;

          // Check if tooltip would go off screen horizontally
          if (left + 280 > window.innerWidth) {
            left = rect.left - 290; // Position to the left instead
          }

          // Check if tooltip would go off screen vertically
          if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height - 10;
          }

          // Make sure tooltip doesn't go above viewport
          if (top < 10) {
            top = 10;
          }

          tooltip.style.left = left + "px";
          tooltip.style.top = top + "px";
        });
      }
    });
  }

  async showFullLesson(lessonNumber) {
    const lessons = {
      1: { title: "Basic Spike Dynamics", file: "lessons/lesson1.html" },
      2: { title: "Synaptic Transmission", file: "lessons/lesson2.html" },
      3: { title: "Network Plasticity", file: "lessons/lesson3.html" },
      4: { title: "Pattern Recognition", file: "lessons/lesson4.html" },
      5: { title: "Network Topology", file: "lessons/lesson5.html" },
      6: { title: "Inhibition & Competition", file: "lessons/lesson6.html" },
      7: { title: "Multi-layer Processing", file: "lessons/lesson7.html" },
      8: { title: "Memory Systems", file: "lessons/lesson8.html" },
      9: { title: "Large-Scale Networks", file: "lessons/lesson9.html" },
      10: { title: "Neural Oscillations", file: "lessons/lesson10.html" },
      11: { title: "Brain Emulation Theory", file: "lessons/lesson11.html" },
      12: { title: "Ethics & Future", file: "lessons/lesson12.html" },
    };

    const lesson = lessons[lessonNumber];
    if (!lesson) return;

    try {
      console.log(`Loading lesson ${lessonNumber} from ${lesson.file}`);
      const response = await fetch(lesson.file);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      console.log(`Lesson ${lessonNumber} HTML content loaded successfully`);

      // Create modal
      const modal = document.createElement("div");
      modal.className = "lesson-modal";

      const modalContent = document.createElement("div");
      modalContent.className = "lesson-modal-content";

      // Directly use the loaded HTML file content
      modalContent.innerHTML = `
      <button class="close-btn">&times;</button>
      ${htmlContent}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <button class="btn" onclick="this.closest('.lesson-modal').remove()">CLOSE LESSON</button>
      </div>
    `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close modal functionality
      const closeBtn = modalContent.querySelector(".close-btn");
      const closeModal = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      };

      closeBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      // Close on escape key
      const handleKeydown = (e) => {
        if (e.key === "Escape") {
          closeModal();
          document.removeEventListener("keydown", handleKeydown);
        }
      };
      document.addEventListener("keydown", handleKeydown);
    } catch (error) {
      console.error("Failed to load lesson:", error);

      // Show fallback content if file loading fails
      const modal = document.createElement("div");
      modal.className = "lesson-modal";

      const modalContent = document.createElement("div");
      modalContent.className = "lesson-modal-content";
      modalContent.innerHTML = `
      <button class="close-btn">&times;</button>
      <h1>${lesson.title.toUpperCase()}</h1>
      <p style="color: #fbbf24; margin-bottom: 16px;">
        <strong>Note:</strong> Lesson file could not be loaded. Here's the basic content:
      </p>
      ${this.getFallbackContent(lessonNumber)}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <button class="btn" onclick="this.closest('.lesson-modal').remove()">CLOSE LESSON</button>
      </div>
    `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close functionality for fallback
      const closeBtn = modalContent.querySelector(".close-btn");
      closeBtn.addEventListener("click", () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      });
    }
  }

  getFallbackContent(lessonNumber) {
    const fallbackContent = {
      1: `
        <h2>Basic Spike Dynamics</h2>
        <p>Spiking Neural Networks use discrete spikes to communicate information. Key concepts include:</p>
        <ul>
          <li><strong>Membrane Potential:</strong> Voltage that accumulates over time</li>
          <li><strong>Threshold:</strong> Critical level that triggers spike firing</li>
          <li><strong>Spike:</strong> Brief electrical pulse sent to connected neurons</li>
          <li><strong>Reset:</strong> Return to baseline voltage after firing</li>
        </ul>
        <p>Experiment with the network parameters to see how these dynamics affect spike propagation!</p>
      `,
      2: `
        <h2>Synaptic Transmission</h2>
        <p>Spikes travel through synaptic connections between neurons:</p>
        <ul>
          <li><strong>Synapses:</strong> Connections visible as grey lines</li>
          <li><strong>Weights:</strong> Connection strength affecting signal transmission</li>
          <li><strong>Propagation:</strong> How spikes spread through the network</li>
          <li><strong>Clustering:</strong> Groups of neurons that fire together</li>
        </ul>
        <p>Enable "Show Weights" to see detailed connection information for each neuron.</p>
      `,
      3: `
        <h2>Network Plasticity</h2>
        <p>Networks adapt and learn through connection modifications:</p>
        <ul>
          <li><strong>Hebbian Learning:</strong> "Neurons that fire together, wire together"</li>
          <li><strong>Strengthening:</strong> Frequently used connections become stronger</li>
          <li><strong>Weakening:</strong> Unused connections fade over time</li>
          <li><strong>Homeostasis:</strong> Balance between stability and adaptability</li>
        </ul>
        <p>Watch how network patterns evolve as neurons interact over time.</p>
      `,
      4: `
        <h2>Pattern Recognition</h2>
        <p>SNNs excel at temporal pattern detection:</p>
        <ul>
          <li><strong>Temporal Coding:</strong> Information in spike timing</li>
          <li><strong>Feature Detection:</strong> Specialized neural responses</li>
          <li><strong>Competition:</strong> Winner-take-all mechanisms</li>
          <li><strong>Real-time Processing:</strong> Event-driven computation</li>
        </ul>
        <p>Use "Inject Spike" to trigger patterns and observe how they propagate through different clusters.</p>
      `,
      5: `
        <h2>Network Topology</h2>
        <p>Brain-like networks have specific organizational principles:</p>
        <ul>
          <li><strong>Small-World Properties:</strong> High clustering with short path lengths</li>
          <li><strong>Modularity:</strong> Groups of densely connected neurons</li>
          <li><strong>Hub Nodes:</strong> Highly connected neurons that integrate information</li>
          <li><strong>Hierarchical Structure:</strong> Multiple scales of organization</li>
        </ul>
        <p>Observe how cluster formation affects information flow and processing efficiency.</p>
      `,
      6: `
        <h2>Inhibition and Competition</h2>
        <p>Inhibitory mechanisms create selection and decision-making:</p>
        <ul>
          <li><strong>Lateral Inhibition:</strong> Neighboring neurons suppress each other</li>
          <li><strong>Winner-Take-All:</strong> Only the strongest signals survive</li>
          <li><strong>E/I Balance:</strong> Critical ratio of excitation to inhibition</li>
          <li><strong>Attention Mechanisms:</strong> Selecting relevant information</li>
        </ul>
        <p>Experiment with thresholds to see how they affect competitive dynamics.</p>
      `,
      7: `
        <h2>Multi-layer Processing</h2>
        <p>Hierarchical networks extract increasingly complex features:</p>
        <ul>
          <li><strong>Feature Hierarchy:</strong> Simple to complex pattern detection</li>
          <li><strong>Cortical Columns:</strong> Functional processing units</li>
          <li><strong>Feed-forward/Feedback:</strong> Bottom-up and top-down processing</li>
          <li><strong>Abstraction Levels:</strong> From pixels to concepts</li>
        </ul>
        <p>This lesson demonstrates hierarchical processing principles.</p>
      `,
      8: `
        <h2>Memory Systems</h2>
        <p>Different memory types emerge from distinct network architectures:</p>
        <ul>
          <li><strong>Working Memory:</strong> Temporary storage through persistent activity</li>
          <li><strong>Long-term Memory:</strong> Stable patterns through synaptic changes</li>
          <li><strong>Episodic Memory:</strong> Time-linked event sequences</li>
          <li><strong>Associative Memory:</strong> Pattern completion and recall</li>
        </ul>
        <p>Observe how persistent activity creates memory-like behavior.</p>
      `,
      9: `
        <h2>Large-Scale Networks</h2>
        <p>Brain-wide coordination enables higher-order functions:</p>
        <ul>
          <li><strong>Global Workspace:</strong> Conscious access through global broadcasting</li>
          <li><strong>Default Mode Network:</strong> Resting state activity patterns</li>
          <li><strong>Information Integration:</strong> Binding distributed processing</li>
          <li><strong>Criticality:</strong> Balanced dynamics at phase transitions</li>
        </ul>
        <p>Watch how activity spreads across the entire network.</p>
      `,
      10: `
        <h2>Neural Oscillations</h2>
        <p>Rhythmic activity coordinates brain-wide processing:</p>
        <ul>
          <li><strong>Gamma Rhythms:</strong> Local processing and attention</li>
          <li><strong>Alpha/Beta Rhythms:</strong> Communication between regions</li>
          <li><strong>Theta Rhythms:</strong> Memory formation and navigation</li>
          <li><strong>Phase Coupling:</strong> Temporal coordination mechanisms</li>
        </ul>
        <p>Observe rhythmic patterns in the voltage traces.</p>
      `,
      11: `
        <h2>Brain Emulation Theory</h2>
        <p>The ultimate goal of computational neuroscience:</p>
        <ul>
          <li><strong>Whole Brain Emulation:</strong> Complete functional brain copies</li>
          <li><strong>Scanning Technology:</strong> Mapping every neuron and connection</li>
          <li><strong>Computational Requirements:</strong> Massive processing and storage needs</li>
          <li><strong>Technical Challenges:</strong> Scale, speed, and biological accuracy</li>
        </ul>
        <p>Understanding these fundamentals prepares us for the challenges ahead.</p>
      `,
      12: `
        <h2>Ethics and Future Implications</h2>
        <p>Digital minds raise profound philosophical questions:</p>
        <ul>
          <li><strong>Consciousness:</strong> Would digital minds be conscious?</li>
          <li><strong>Identity:</strong> What makes you "you" in digital form?</li>
          <li><strong>Rights:</strong> What protections do digital minds deserve?</li>
          <li><strong>Responsibility:</strong> Our duty as creators of digital minds</li>
        </ul>
        <p>These questions require careful consideration as we advance the technology.</p>
      `,
    };

    return (
      fallbackContent[lessonNumber] || "<p>Lesson content not available.</p>"
    );
  }

  createNetwork() {
    this.neurons = [];
    this.connections = [];

    // Create neurons in 3D space with cluster-specific positioning
    const radius = 350; // Increased from 200 to 350 for more spacing within clusters
    const clusterSeparation = 300; // Increased from 150 to 300 for more distance between clusters

    for (let i = 0; i < this.config.networkSize; i++) {
      const clusterId = Math.floor(i / (this.config.networkSize / 4));
      const colors =
        this.CLUSTER_COLORS[clusterId % this.CLUSTER_COLORS.length];

      // Position clusters in different areas of 3D space
      const clusterCenterX =
        (clusterId % 2) * clusterSeparation - clusterSeparation / 2;
      const clusterCenterY =
        Math.floor(clusterId / 2) * clusterSeparation - clusterSeparation / 2;
      const clusterCenterZ = 0;

      const neuron = {
        id: i,
        position: {
          x: clusterCenterX + (Math.random() - 0.5) * radius,
          y: clusterCenterY + (Math.random() - 0.5) * radius,
          z: clusterCenterZ + (Math.random() - 0.5) * radius,
        },
        voltage: Math.random() * 0.3, // Start with lower voltage
        pulse: 0,
        lastFire: 0,
        colors: colors,
        connections: [],
        clusterId: clusterId, // Store cluster ID for easier access
      };

      this.neurons.push(neuron);
    }

    // Create connections with cluster bias
    for (let i = 0; i < this.neurons.length; i++) {
      for (let j = i + 1; j < this.neurons.length; j++) {
        const sameCluster =
          this.neurons[i].clusterId === this.neurons[j].clusterId;
        // Higher probability within cluster, lower between clusters
        const connectionProb = sameCluster
          ? this.config.connectionProb * 2.5
          : this.config.connectionProb * 0.3;

        if (Math.random() < connectionProb) {
          const connection = {
            from: this.neurons[i],
            to: this.neurons[j],
            weight: sameCluster
              ? 0.4 + Math.random() * 0.6 // Stronger within cluster: 0.4-1.0
              : 0.1 + Math.random() * 0.3, // Weaker between clusters: 0.1-0.4
          };
          this.connections.push(connection);
          this.neurons[i].connections.push(connection);

          // Also create reverse connection for bidirectional
          const reverseConnection = {
            from: this.neurons[j],
            to: this.neurons[i],
            weight: sameCluster
              ? 0.4 + Math.random() * 0.6
              : 0.1 + Math.random() * 0.3,
          };
          this.connections.push(reverseConnection);
          this.neurons[j].connections.push(reverseConnection);
        }
      }
    }

    // Start with only ONE cluster being active to demonstrate async behavior
    const activeCluster = Math.floor(Math.random() * 4);
    for (let i = 0; i < 3; i++) {
      // Only fire 3 neurons in one cluster
      const neuronsInCluster = this.neurons.filter(
        (n) => n.clusterId === activeCluster
      );
      if (neuronsInCluster.length > 0) {
        const randomNeuron =
          neuronsInCluster[Math.floor(Math.random() * neuronsInCluster.length)];
        randomNeuron.voltage = this.state.threshold + 0.1;
      }
    }
  }

  updateNetwork() {
    if (this.state.pauseSpikes) return;

    // Process each neuron
    this.neurons.forEach((neuron) => {
      // Check if neuron should fire due to accumulated voltage FIRST
      if (neuron.voltage >= this.state.threshold) {
        // Direct implementation of firing without calling method to ensure it works
        neuron.pulse = this.config.pulseIntensity;
        neuron.voltage = 0; // Reset voltage to 0
        neuron.lastFire = Date.now();

        // Propagate to connected neurons
        neuron.connections.forEach((conn) => {
          conn.to.voltage += conn.weight;
        });

        // Force immediate update for connected neurons that might now be above threshold
        neuron.connections.forEach((conn) => {
          if (conn.to.voltage >= this.state.threshold) {
            conn.to.pulse = this.config.pulseIntensity;
            conn.to.voltage = 0;
            conn.to.lastFire = Date.now();
          }
        });
        return;
      }

      // Random firing - much lower probability and cluster-specific
      const clusterBasedRate =
        this.state.firingRate *
        this.state.speed *
        (1 + Math.sin(Date.now() * 0.001 + neuron.clusterId * 1.5) * 0.5); // Async cluster activity

      if (Math.random() < clusterBasedRate) {
        neuron.pulse = this.config.pulseIntensity;
        neuron.voltage = 0;
        neuron.lastFire = Date.now();

        // Propagate to connected neurons
        neuron.connections.forEach((conn) => {
          conn.to.voltage += conn.weight;
        });
        return;
      }

      // Pulse decay
      if (neuron.pulse > 0.01) {
        neuron.pulse *= this.state.pulseDecay;
      } else {
        neuron.pulse = 0;
      }

      // Voltage decay - slower to allow buildup
      neuron.voltage *= 0.998;

      // Much reduced random voltage increase - cluster specific timing
      if (Math.random() < 0.002 * this.state.speed) {
        neuron.voltage += Math.random() * 0.05; // Much smaller increments
      }
    });

    // Update voltage display for selected neuron
    if (this.state.selectedNeuron && this.dom.voltageValue) {
      this.dom.voltageValue.textContent =
        this.state.selectedNeuron.voltage.toFixed(3);
      this.updateTrace();
    }
  }

  fireNeuron(neuron) {
    // Set pulse and timestamp
    neuron.pulse = this.config.pulseIntensity;
    neuron.voltage = 0; // Reset to 0 after firing
    neuron.lastFire = Date.now();

    // Propagate to connected neurons with stronger effect
    neuron.connections.forEach((conn) => {
      // Add a multiplier to make sure connections have more effect
      conn.to.voltage += conn.weight * 1.2;

      // Debug log for voltage propagation
      console.log(
        `Neuron ${neuron.id} fired, voltage ${
          conn.weight * 1.2
        } sent to neuron ${conn.to.id}`
      );
    });
  }

  updateTrace() {
    if (!this.traceCtx || !this.state.selectedNeuron) return;

    this.voltageHistory.push(this.state.selectedNeuron.voltage);
    if (this.voltageHistory.length > 260) {
      this.voltageHistory.shift();
    }

    this.clearTrace();

    // Draw background grid
    this.traceCtx.strokeStyle = "#333333";
    this.traceCtx.lineWidth = 0.5;
    this.traceCtx.setLineDash([2, 2]);

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (150 * i) / 4;
      this.traceCtx.beginPath();
      this.traceCtx.moveTo(0, y);
      this.traceCtx.lineTo(260, y);
      this.traceCtx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 8; i++) {
      const x = (260 * i) / 8;
      this.traceCtx.beginPath();
      this.traceCtx.moveTo(x, 0);
      this.traceCtx.lineTo(x, 150);
      this.traceCtx.stroke();
    }
    this.traceCtx.setLineDash([]);

    // Draw voltage trace with clean white - corrected direction
    this.traceCtx.strokeStyle = "#00ff88";
    this.traceCtx.lineWidth = 2;
    this.traceCtx.beginPath();

    this.voltageHistory.forEach((voltage, i) => {
      const x = i;
      const y = 150 - (voltage / (this.state.threshold * 1.2)) * 150; // Inverted so spikes go up

      if (i === 0) {
        this.traceCtx.moveTo(x, y);
      } else {
        this.traceCtx.lineTo(x, y);
      }
    });

    this.traceCtx.stroke();

    // Draw threshold line with bright red
    this.traceCtx.strokeStyle = "#ff4444";
    this.traceCtx.lineWidth = 2;
    this.traceCtx.setLineDash([5, 5]);
    const thresholdY =
      150 - (this.state.threshold / (this.state.threshold * 1.2)) * 150;
    this.traceCtx.beginPath();
    this.traceCtx.moveTo(0, thresholdY);
    this.traceCtx.lineTo(260, thresholdY);
    this.traceCtx.stroke();
    this.traceCtx.setLineDash([]);

    // Add voltage scale labels
    this.traceCtx.fillStyle = "#cccccc";
    this.traceCtx.font = "10px Inter, monospace";
    this.traceCtx.textAlign = "right";

    // Y-axis labels (voltage values)
    const maxVoltage = this.state.threshold * 1.2;
    for (let i = 0; i <= 4; i++) {
      const voltage = (maxVoltage * (4 - i)) / 4;
      const y = (150 * i) / 4;
      this.traceCtx.fillText(voltage.toFixed(1), 25, y + 3);
    }

    // Add axis labels
    this.traceCtx.textAlign = "left";
    this.traceCtx.fillStyle = "#888888";
    this.traceCtx.font = "9px Inter, sans-serif";
    this.traceCtx.fillText("Voltage (V)", 5, 12);
    this.traceCtx.fillText("Time →", 200, 145);

    // Add threshold label
    this.traceCtx.fillStyle = "#ff4444";
    this.traceCtx.fillText("Threshold", 180, thresholdY - 5);
  }

  clearTrace() {
    if (!this.traceCtx) return;
    this.traceCtx.fillStyle = "#000000";
    this.traceCtx.fillRect(0, 0, 260, 150);
  }

  initLessons() {
    if (this.dom.lessonSelect) {
      this.dom.lessonSelect.addEventListener("change", (e) => {
        this.updateLesson(parseInt(e.target.value));
      });
    }

    this.updateLesson(1);
  }

  updateLesson(lessonNumber) {
    const lessons = {
      1: {
        title: "Lesson 1: Basic Spikes",
        content:
          "Each neuron accumulates voltage over time. When it reaches threshold (v≥1), it fires a spike and resets to 0.",
        file: "lessons/lesson1.html",
      },
      2: {
        title: "Lesson 2: Synaptic Transmission",
        content:
          "Spikes travel along synapses (connections) between neurons, with varying weights affecting signal strength.",
        file: "lessons/lesson2.html",
      },
      3: {
        title: "Lesson 3: Network Plasticity",
        content:
          "Synaptic weights can change over time based on neural activity, enabling learning and adaptation.",
        file: "lessons/lesson3.html",
      },
      4: {
        title: "Lesson 4: Pattern Recognition",
        content:
          "SNNs can learn to recognize temporal patterns in spike trains, making them ideal for processing time-series data.",
        file: "lessons/lesson4.html",
      },
      5: {
        title: "Lesson 5: Network Topology",
        content:
          "Brain-like networks organize into clusters and modules, creating small-world properties that optimize both local processing and global communication.",
        file: "lessons/lesson5.html",
      },
      6: {
        title: "Lesson 6: Inhibition & Competition",
        content:
          "Inhibitory connections create competitive dynamics, enabling winner-take-all mechanisms crucial for attention and decision-making.",
        file: "lessons/lesson6.html",
      },
      7: {
        title: "Lesson 7: Multi-layer Processing",
        content:
          "Hierarchical networks extract increasingly complex features, similar to cortical organization in biological brains.",
        file: "lessons/lesson7.html",
      },
      8: {
        title: "Lesson 8: Memory Systems",
        content:
          "Different types of memory (working, long-term, episodic) emerge from distinct network architectures and plasticity rules.",
        file: "lessons/lesson8.html",
      },
      9: {
        title: "Lesson 9: Large-Scale Networks",
        content:
          "Brain-wide networks coordinate information integration, giving rise to global workspace dynamics and potentially consciousness.",
        file: "lessons/lesson9.html",
      },
      10: {
        title: "Lesson 10: Neural Oscillations",
        content:
          "Rhythmic neural activity coordinates processing across brain regions, enabling binding and temporal organization of information.",
        file: "lessons/lesson10.html",
      },
      11: {
        title: "Lesson 11: Brain Emulation Theory",
        content:
          "Whole brain emulation aims to create functional copies of specific brains, requiring advances in scanning, modeling, and computing.",
        file: "lessons/lesson11.html",
      },
      12: {
        title: "Lesson 12: Ethics & Future",
        content:
          "Digital minds raise profound questions about consciousness, identity, rights, and humanity's future that we must address responsibly.",
        file: "lessons/lesson12.html",
      },
    };

    const lesson = lessons[lessonNumber];
    if (lesson && this.dom.lessonContent) {
      this.dom.lessonContent.innerHTML = `
        <div class="lesson">
          <strong>${lesson.title}</strong><br />
          ${lesson.content}
          <button class="btn" style="margin-top: 8px; padding: 6px 12px; font-size: 12px;" onclick="window.snnVisualizer.showFullLesson(${lessonNumber})">View Full Lesson</button>
        </div>
      `;
    }
  }

  async showFullLesson(lessonNumber) {
    const lessons = {
      1: { title: "Basic Spike Dynamics", file: "lessons/lesson1.html" },
      2: { title: "Synaptic Transmission", file: "lessons/lesson2.html" },
      3: { title: "Network Plasticity", file: "lessons/lesson3.html" },
      4: { title: "Pattern Recognition", file: "lessons/lesson4.html" },
      5: { title: "Network Topology", file: "lessons/lesson5.html" },
      6: { title: "Inhibition & Competition", file: "lessons/lesson6.html" },
      7: { title: "Multi-layer Processing", file: "lessons/lesson7.html" },
      8: { title: "Memory Systems", file: "lessons/lesson8.html" },
      9: { title: "Large-Scale Networks", file: "lessons/lesson9.html" },
      10: { title: "Neural Oscillations", file: "lessons/lesson10.html" },
      11: { title: "Brain Emulation Theory", file: "lessons/lesson11.html" },
      12: { title: "Ethics & Future", file: "lessons/lesson12.html" },
    };

    const lesson = lessons[lessonNumber];
    if (!lesson) return;

    try {
      console.log(`Loading lesson ${lessonNumber} from ${lesson.file}`);
      const response = await fetch(lesson.file);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      console.log(`Lesson ${lessonNumber} HTML content loaded successfully`);

      // Create modal
      const modal = document.createElement("div");
      modal.className = "lesson-modal";

      const modalContent = document.createElement("div");
      modalContent.className = "lesson-modal-content";

      // Directly use the loaded HTML file content
      modalContent.innerHTML = `
      <button class="close-btn">&times;</button>
      ${htmlContent}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <button class="btn" onclick="this.closest('.lesson-modal').remove()">CLOSE LESSON</button>
      </div>
    `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close modal functionality
      const closeBtn = modalContent.querySelector(".close-btn");
      const closeModal = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      };

      closeBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      // Close on escape key
      const handleKeydown = (e) => {
        if (e.key === "Escape") {
          closeModal();
          document.removeEventListener("keydown", handleKeydown);
        }
      };
      document.addEventListener("keydown", handleKeydown);
    } catch (error) {
      console.error("Failed to load lesson:", error);

      // Show fallback content if file loading fails
      const modal = document.createElement("div");
      modal.className = "lesson-modal";

      const modalContent = document.createElement("div");
      modalContent.className = "lesson-modal-content";
      modalContent.innerHTML = `
      <button class="close-btn">&times;</button>
      <h1>${lesson.title.toUpperCase()}</h1>
      <p style="color: #fbbf24; margin-bottom: 16px;">
        <strong>Note:</strong> Lesson file could not be loaded. Here's the basic content:
      </p>
      ${this.getFallbackContent(lessonNumber)}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <button class="btn" onclick="this.closest('.lesson-modal').remove()">CLOSE LESSON</button>
      </div>
    `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Close functionality for fallback
      const closeBtn = modalContent.querySelector(".close-btn");
      closeBtn.addEventListener("click", () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      });
    }
  }

  getFallbackContent(lessonNumber) {
    const fallbackContent = {
      1: `
        <h2>Basic Spike Dynamics</h2>
        <p>Spiking Neural Networks use discrete spikes to communicate information. Key concepts include:</p>
        <ul>
          <li><strong>Membrane Potential:</strong> Voltage that accumulates over time</li>
          <li><strong>Threshold:</strong> Critical level that triggers spike firing</li>
          <li><strong>Spike:</strong> Brief electrical pulse sent to connected neurons</li>
          <li><strong>Reset:</strong> Return to baseline voltage after firing</li>
        </ul>
        <p>Experiment with the network parameters to see how these dynamics affect spike propagation!</p>
      `,
      2: `
        <h2>Synaptic Transmission</h2>
        <p>Spikes travel through synaptic connections between neurons:</p>
        <ul>
          <li><strong>Synapses:</strong> Connections visible as grey lines</li>
          <li><strong>Weights:</strong> Connection strength affecting signal transmission</li>
          <li><strong>Propagation:</strong> How spikes spread through the network</li>
          <li><strong>Clustering:</strong> Groups of neurons that fire together</li>
        </ul>
        <p>Enable "Show Weights" to see detailed connection information for each neuron.</p>
      `,
      3: `
        <h2>Network Plasticity</h2>
        <p>Networks adapt and learn through connection modifications:</p>
        <ul>
          <li><strong>Hebbian Learning:</strong> "Neurons that fire together, wire together"</li>
          <li><strong>Strengthening:</strong> Frequently used connections become stronger</li>
          <li><strong>Weakening:</strong> Unused connections fade over time</li>
          <li><strong>Homeostasis:</strong> Balance between stability and adaptability</li>
        </ul>
        <p>Watch how network patterns evolve as neurons interact over time.</p>
      `,
      4: `
        <h2>Pattern Recognition</h2>
        <p>SNNs excel at temporal pattern detection:</p>
        <ul>
          <li><strong>Temporal Coding:</strong> Information in spike timing</li>
          <li><strong>Feature Detection:</strong> Specialized neural responses</li>
          <li><strong>Competition:</strong> Winner-take-all mechanisms</li>
          <li><strong>Real-time Processing:</strong> Event-driven computation</li>
        </ul>
        <p>Use "Inject Spike" to trigger patterns and observe how they propagate through different clusters.</p>
      `,
      5: `
        <h2>Network Topology</h2>
        <p>Brain-like networks have specific organizational principles:</p>
        <ul>
          <li><strong>Small-World Properties:</strong> High clustering with short path lengths</li>
          <li><strong>Modularity:</strong> Groups of densely connected neurons</li>
          <li><strong>Hub Nodes:</strong> Highly connected neurons that integrate information</li>
          <li><strong>Hierarchical Structure:</strong> Multiple scales of organization</li>
        </ul>
        <p>Observe how cluster formation affects information flow and processing efficiency.</p>
      `,
      6: `
        <h2>Inhibition and Competition</h2>
        <p>Inhibitory mechanisms create selection and decision-making:</p>
        <ul>
          <li><strong>Lateral Inhibition:</strong> Neighboring neurons suppress each other</li>
          <li><strong>Winner-Take-All:</strong> Only the strongest signals survive</li>
          <li><strong>E/I Balance:</strong> Critical ratio of excitation to inhibition</li>
          <li><strong>Attention Mechanisms:</strong> Selecting relevant information</li>
        </ul>
        <p>Experiment with thresholds to see how they affect competitive dynamics.</p>
      `,
      7: `
        <h2>Multi-layer Processing</h2>
        <p>Hierarchical networks extract increasingly complex features:</p>
        <ul>
          <li><strong>Feature Hierarchy:</strong> Simple to complex pattern detection</li>
          <li><strong>Cortical Columns:</strong> Functional processing units</li>
          <li><strong>Feed-forward/Feedback:</strong> Bottom-up and top-down processing</li>
          <li><strong>Abstraction Levels:</strong> From pixels to concepts</li>
        </ul>
        <p>This lesson demonstrates hierarchical processing principles.</p>
      `,
      8: `
        <h2>Memory Systems</h2>
        <p>Different memory types emerge from distinct network architectures:</p>
        <ul>
          <li><strong>Working Memory:</strong> Temporary storage through persistent activity</li>
          <li><strong>Long-term Memory:</strong> Stable patterns through synaptic changes</li>
          <li><strong>Episodic Memory:</strong> Time-linked event sequences</li>
          <li><strong>Associative Memory:</strong> Pattern completion and recall</li>
        </ul>
        <p>Observe how persistent activity creates memory-like behavior.</p>
      `,
      9: `
        <h2>Large-Scale Networks</h2>
        <p>Brain-wide coordination enables higher-order functions:</p>
        <ul>
          <li><strong>Global Workspace:</strong> Conscious access through global broadcasting</li>
          <li><strong>Default Mode Network:</strong> Resting state activity patterns</li>
          <li><strong>Information Integration:</strong> Binding distributed processing</li>
          <li><strong>Criticality:</strong> Balanced dynamics at phase transitions</li>
        </ul>
        <p>Watch how activity spreads across the entire network.</p>
      `,
      10: `
        <h2>Neural Oscillations</h2>
        <p>Rhythmic activity coordinates brain-wide processing:</p>
        <ul>
          <li><strong>Gamma Rhythms:</strong> Local processing and attention</li>
          <li><strong>Alpha/Beta Rhythms:</strong> Communication between regions</li>
          <li><strong>Theta Rhythms:</strong> Memory formation and navigation</li>
          <li><strong>Phase Coupling:</strong> Temporal coordination mechanisms</li>
        </ul>
        <p>Observe rhythmic patterns in the voltage traces.</p>
      `,
      11: `
        <h2>Brain Emulation Theory</h2>
        <p>The ultimate goal of computational neuroscience:</p>
        <ul>
          <li><strong>Whole Brain Emulation:</strong> Complete functional brain copies</li>
          <li><strong>Scanning Technology:</strong> Mapping every neuron and connection</li>
          <li><strong>Computational Requirements:</strong> Massive processing and storage needs</li>
          <li><strong>Technical Challenges:</strong> Scale, speed, and biological accuracy</li>
        </ul>
        <p>Understanding these fundamentals prepares us for the challenges ahead.</p>
      `,
      12: `
        <h2>Ethics and Future Implications</h2>
        <p>Digital minds raise profound philosophical questions:</p>
        <ul>
          <li><strong>Consciousness:</strong> Would digital minds be conscious?</li>
          <li><strong>Identity:</strong> What makes you "you" in digital form?</li>
          <li><strong>Rights:</strong> What protections do digital minds deserve?</li>
          <li><strong>Responsibility:</strong> Our duty as creators of digital minds</li>
        </ul>
        <p>These questions require careful consideration as we advance the technology.</p>
      `,
    };

    return lessons[lessonNumber] || null;
  }

  getFallbackContent(lessonNumber) {
    const fallbackContent = {
      1: `
        <h2>Basic Spike Dynamics</h2>
        <p>Spiking Neural Networks use discrete spikes to communicate information. Key concepts include:</p>
        <ul>
          <li><strong>Membrane Potential:</strong> Voltage that accumulates over time</li>
          <li><strong>Threshold:</strong> Critical level that triggers spike firing</li>
          <li><strong>Spike:</strong> Brief electrical pulse sent to connected neurons</li>
          <li><strong>Reset:</strong> Return to baseline voltage after firing</li>
        </ul>
        <p>Experiment with the network parameters to see how these dynamics affect spike propagation!</p>
      `,
      2: `
        <h2>Synaptic Transmission</h2>
        <p>Spikes travel through synaptic connections between neurons:</p>
        <ul>
          <li><strong>Synapses:</strong> Connections visible as grey lines</li>
          <li><strong>Weights:</strong> Connection strength affecting signal transmission</li>
          <li><strong>Propagation:</strong> How spikes spread through the network</li>
          <li><strong>Clustering:</strong> Groups of neurons that fire together</li>
        </ul>
        <p>Enable "Show Weights" to see detailed connection information for each neuron.</p>
      `,
      3: `
        <h2>Network Plasticity</h2>
        <p>Networks adapt and learn through connection modifications:</p>
        <ul>
          <li><strong>Hebbian Learning:</strong> "Neurons that fire together, wire together"</li>
          <li><strong>Strengthening:</strong> Frequently used connections become stronger</li>
          <li><strong>Weakening:</strong> Unused connections fade over time</li>
          <li><strong>Homeostasis:</strong> Balance between stability and adaptability</li>
        </ul>
        <p>Watch how network patterns evolve as neurons interact over time.</p>
      `,
      4: `
        <h2>Pattern Recognition</h2>
        <p>SNNs excel at temporal pattern detection:</p>
        <ul>
          <li><strong>Temporal Coding:</strong> Information in spike timing</li>
          <li><strong>Feature Detection:</strong> Specialized neural responses</li>
          <li><strong>Competition:</strong> Winner-take-all mechanisms</li>
          <li><strong>Real-time Processing:</strong> Event-driven computation</li>
        </ul>
        <p>Use "Inject Spike" to trigger patterns and observe how they propagate through different clusters.</p>
      `,
    };

    return (
      fallbackContent[lessonNumber] || "<p>Lesson content not available.</p>"
    );
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.updateCameraPosition();

    if (this.state.isRunning) {
      this.updateNetwork();
    }

    this.render();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") {
    console.warn("THREE.js not found, using fallback");
  }

  try {
    new SNNVisualizer();
  } catch (error) {
    console.error("Failed to initialize SNN Visualizer:", error);
    const errEl = document.getElementById("err");
    if (errEl) {
      errEl.textContent = "Failed to initialize neural network visualization.";
      errEl.style.display = "block";
    }
  }
});

// Remove emergency fallback - it causes the wrong style flash
