// Fixed SNN Visualizer with a stable orbit camera system

class SNNVisualizer {
  constructor() {
    this.state = {
      isRunning: true,
      showWeights: false,
      speed: 1,
      firingRate: 0.001,
      pulseDecay: 0.95,
      threshold: 1.0,
      pauseSpikes: false,
      selectedNeuron: null,
    };

    this.config = {
      networkSize: 50,
      connectionProb: 0.1,
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
    this.initWebSocket(); // Restore WebSocket initialization
    this.createNetwork();
    this.bindUI();
    this.initLessons();

    // Debug: Log network creation
    console.log(`Network initialized with ${this.neurons.length} neurons`);

    // Start animation immediately
    this.animate();
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

  initWebSocket() {
    const wsUrl = "ws://localhost:8766";
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connection established");
      if (this.dom.errEl) this.dom.errEl.style.display = "none";
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleNetworkData(data);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (this.dom.errEl) {
        this.dom.errEl.textContent =
          "Connection to the neural network server failed. Is the server running?";
        this.dom.errEl.style.display = "block";
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      if (this.dom.errEl) {
        this.dom.errEl.textContent = "Connection to server lost. Please refresh.";
        this.dom.errEl.style.display = "block";
      }
    };
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

  renderWeightPanel(neuron, projected) {
    const panelWidth = 120;
    const panelHeight = 80;
    const x = projected.x + 20;
    const y = projected.y - panelHeight / 2;

    this.ctx.fillStyle = "rgba(10, 10, 10, 0.8)";
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.rect(x, y, panelWidth, panelHeight);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = "#B5B7C3";
    this.ctx.font = "10px Inter, monospace";
    this.ctx.fillText(`Neuron ${neuron.id} Weights:`, x + 5, y + 12);

    neuron.connections.slice(0, 5).forEach((conn, i) => {
      const weightText = `to ${conn.to.id}: ${conn.weight.toFixed(2)}`;
      this.ctx.fillText(weightText, x + 5, y + 28 + i * 10);
    });
  }

  render() {
    // Clear canvas with pure black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    // Render connections with extremely thin lines
    this.connections.forEach((conn) => {
      const startProj = this.project3D(conn.from.position);
      const endProj = this.project3D(conn.to.position);

      // Check if connection is active
      const timeSinceFromFire = Date.now() - (conn.from.lastFire || 0);
      const timeSinceToFire = Date.now() - (conn.to.lastFire || 0);
      const isActive =
        timeSinceFromFire < 300 &&
        timeSinceToFire < 300 &&
        (conn.from.pulse > 0.1 || conn.to.pulse > 0.1);

      if (isActive) {
        // Active connection - show in cluster color with extremely thin line
        const activeColor =
          conn.from.pulse > conn.to.pulse
            ? conn.from.colors.glow
            : conn.to.colors.glow;
        const intensity =
          Math.max(conn.from.pulse, conn.to.pulse) / this.config.pulseIntensity;
        this.ctx.strokeStyle = `rgba(${Math.floor(
          activeColor.r * 255
        )}, ${Math.floor(activeColor.g * 255)}, ${Math.floor(
          activeColor.b * 255
        )}, ${0.8 * intensity})`;
        this.ctx.lineWidth = 0.4;
      } else {
        // Inactive connection - extremely thin grey line with lighter color
        this.ctx.strokeStyle = `rgba(189, 189, 189, 0.25)`; // #bdbdbd with transparency
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

      // Draw glow effect when firing - scales with zoom
      if (intensity > 0.1) {
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

      // Draw neuron body with enhanced brightness
      const color =
        intensity > 0.1 ? neuron.colors.glow : neuron.colors.primary;
      const depthFade = Math.min(1, 800 / Math.max(20, projected.depth));
      const brightness = (intensity > 0.1 ? 1.0 : 0.9) * depthFade;

      this.ctx.fillStyle = `rgb(${Math.floor(
        color.r * 255 * brightness
      )}, ${Math.floor(color.g * 255 * brightness)}, ${Math.floor(
        color.b * 255 * brightness
      )})`;

      this.ctx.beginPath();
      this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Highlight selected neuron with premium neural accent color
      if (neuron === this.state.selectedNeuron) {
        this.ctx.strokeStyle = "#374E84"; // Use accent-neural
        this.ctx.lineWidth = Math.max(2, radius * 0.15);
        this.ctx.stroke();
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

  renderEnhancedNeuron(neuron, projected, radius, intensity) {
    // Draw enhanced glow effect when firing
    if (intensity > 0.1) {
      const glowRadius = radius * (2.0 + intensity * 2.5);
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
        )}, ${Math.floor(glowColor.b * 255)}, ${intensity * 0.9})`
      );
      gradient.addColorStop(
        0.4,
        `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(
          glowColor.g * 255
        )}, ${Math.floor(glowColor.b * 255)}, ${intensity * 0.5})`
      );
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(projected.x, projected.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw neuron body with sophisticated cluster colors
    const color = intensity > 0.3 ? neuron.colors.glow : neuron.colors.primary;
    const depthFade = Math.min(1, 800 / Math.max(20, projected.depth));
    const brightness = (intensity > 0.3 ? 1.0 : 0.6) * depthFade;

    this.ctx.fillStyle = `rgb(${Math.floor(
      color.r * 255 * brightness
    )}, ${Math.floor(color.g * 255 * brightness)}, ${Math.floor(
      color.b * 255 * brightness
    )})`;

    this.ctx.beginPath();
    this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Highlight selected neuron
    if (neuron === this.state.selectedNeuron) {
      this.ctx.strokeStyle = "#374E84";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Draw neuron number with smart contrast
    if (radius > 6) {
      const textColor = intensity > 0.3 ? "#060709" : "#F2F2F3";
      this.ctx.fillStyle = textColor;
      this.ctx.font = `${Math.max(
        8,
        Math.min(14, radius * 0.7)
      )}px Inter, sans-serif`;
      this.ctx.fontWeight = "500";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(neuron.id.toString(), projected.x, projected.y);
    }
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
    };

    const lesson = lessons[lessonNumber];
    if (!lesson) return;

    try {
      const response = await fetch(lesson.file);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      // Create modal
      const modal = document.createElement("div");
      modal.className = "lesson-modal";

      const modalContent = document.createElement("div");
      modalContent.className = "lesson-modal-content";
      modalContent.innerHTML = `
        <button class="close-btn">&times;</button>
        ${content}
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
          <button class="btn" onclick="this.closest('.lesson-modal').remove()">Close Lesson</button>
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
        <h1>${lesson.title}</h1>
        <p style="color: #fbbf24; margin-bottom: 16px;">
          <strong>Note:</strong> Lesson file could not be loaded. Here's the basic content:
        </p>
        ${this.getFallbackContent(lessonNumber)}
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
          <button class="btn" onclick="this.closest('.lesson-modal').remove()">Close Lesson</button>
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
