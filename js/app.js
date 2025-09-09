// Fixed SNN Visualizer with working 3D camera system
// Neural network visualization with proper 3D rendering

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
        primary: { r: 0.08, g: 0.52, b: 0.29 }, // --accent-green
        glow: { r: 0.19, g: 0.62, b: 0.39 },
      },
      {
        primary: { r: 0.35, g: 0.41, b: 0.79 }, // --accent-blue
        glow: { r: 0.45, g: 0.51, b: 0.89 },
      },
      {
        primary: { r: 0.72, g: 0.37, b: 0.13 }, // --accent-orange
        glow: { r: 0.82, g: 0.47, b: 0.23 },
      },
      {
        primary: { r: 0.84, g: 0.72, b: 0.62 }, // --accent-sand
        glow: { r: 0.94, g: 0.82, b: 0.72 },
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

    // Add roundRect support for older browsers
    if (!this.ctx.roundRect) {
      this.ctx.roundRect = function (x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius,
          y + height
        );
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
      };
    }

    // Set up working 3D camera system
    this.camera = {
      position: { x: 0, y: 0, z: 100 },
      target: { x: 0, y: 0, z: 0 },
      rotation: { pitch: 0, yaw: 0 },
      distance: 100,
      move: { forward: 0, right: 0, up: 0 },
      mouse: {
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        isLeftDown: false,
        isRightDown: false,
        sensitivity: 0.01,
      },
      moveSpeed: 1.0,
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
      // Mouse look - update rotation
      this.camera.rotation.yaw -= deltaX * this.camera.mouse.sensitivity;
      this.camera.rotation.pitch -= deltaY * this.camera.mouse.sensitivity;

      // Clamp pitch
      this.camera.rotation.pitch = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.camera.rotation.pitch)
      );

      this.updateCameraPosition();
    } else if (this.camera.mouse.isRightDown) {
      // Pan mode
      const forward = this.getCameraForward();
      const right = this.getCameraRight();
      const up = this.getCameraUp();

      const panSpeed = 0.1;
      this.camera.target.x -= right.x * deltaX * panSpeed;
      this.camera.target.y += up.y * deltaY * panSpeed;
      this.camera.target.z -= right.z * deltaX * panSpeed;

      this.updateCameraPosition();
    }
  }

  onWheel(e) {
    e.preventDefault();
    const forward = this.getCameraForward();
    const zoomSpeed = 3;
    const direction = e.deltaY > 0 ? -1 : 1;

    this.camera.position.x += forward.x * direction * zoomSpeed;
    this.camera.position.y += forward.y * direction * zoomSpeed;
    this.camera.position.z += forward.z * direction * zoomSpeed;
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
    return {
      x:
        Math.sin(this.camera.rotation.yaw) *
        Math.cos(this.camera.rotation.pitch),
      y: Math.sin(this.camera.rotation.pitch),
      z:
        Math.cos(this.camera.rotation.yaw) *
        Math.cos(this.camera.rotation.pitch),
    };
  }

  getCameraRight() {
    const forward = this.getCameraForward();
    const worldUp = { x: 0, y: 1, z: 0 };

    return this.normalize({
      x: forward.z * worldUp.y - forward.y * worldUp.z,
      y: forward.x * worldUp.z - forward.z * worldUp.x,
      z: forward.y * worldUp.x - forward.x * worldUp.y,
    });
  }

  getCameraUp() {
    const forward = this.getCameraForward();
    const right = this.getCameraRight();

    return this.normalize({
      x: right.y * forward.z - right.z * forward.y,
      y: right.z * forward.x - right.x * forward.z,
      z: right.x * forward.y - right.y * forward.x,
    });
  }

  normalize(vector) {
    const length = Math.sqrt(
      vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
    );
    if (length === 0) return { x: 0, y: 1, z: 0 };
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length,
    };
  }

  updateCameraPosition() {
    // Apply WASD movement
    const forward = this.getCameraForward();
    const right = this.getCameraRight();
    const speed = this.camera.moveSpeed * this.state.speed;

    // Move forward/backward
    this.camera.position.x += forward.x * this.camera.move.forward * speed;
    this.camera.position.y += forward.y * this.camera.move.forward * speed;
    this.camera.position.z += forward.z * this.camera.move.forward * speed;

    // Move left/right
    this.camera.position.x += right.x * this.camera.move.right * speed;
    this.camera.position.y += right.y * this.camera.move.right * speed;
    this.camera.position.z += right.z * this.camera.move.right * speed;

    // Move up/down (world space)
    this.camera.position.y += this.camera.move.up * speed;
  }

  resetCamera() {
    this.camera.position = { x: 0, y: 0, z: 100 };
    this.camera.target = { x: 0, y: 0, z: 0 };
    this.camera.rotation = { pitch: 0, yaw: 0 };
  }

  project3D(pos) {
    // Working 3D projection with proper zoom scaling
    const cam = this.camera;

    // Transform point relative to camera
    const dx = pos.x - cam.position.x;
    const dy = pos.y - cam.position.y;
    const dz = pos.z - cam.position.z;

    // Apply camera rotation
    const cosYaw = Math.cos(-cam.rotation.yaw);
    const sinYaw = Math.sin(-cam.rotation.yaw);
    const cosPitch = Math.cos(-cam.rotation.pitch);
    const sinPitch = Math.sin(-cam.rotation.pitch);

    // Rotate around Y axis (yaw)
    const x1 = dx * cosYaw - dz * sinYaw;
    const z1 = dx * sinYaw + dz * cosYaw;
    const y1 = dy;

    // Rotate around X axis (pitch)
    const x2 = x1;
    const y2 = y1 * cosPitch - z1 * sinPitch;
    const z2 = y1 * sinPitch + z1 * cosPitch;

    // Enhanced perspective projection with better zoom scaling
    const distance = Math.max(1, z2);
    const baseScale = 800; // Increased base scale for better zoom response
    const scale = baseScale / distance;

    const screenX = this.dom.canvas.width / 2 + x2 * scale;
    const screenY = this.dom.canvas.height / 2 - y2 * scale;

    // Calculate camera distance for zoom-responsive scaling
    const cameraDistance = Math.sqrt(
      cam.position.x * cam.position.x +
        cam.position.y * cam.position.y +
        cam.position.z * cam.position.z
    );

    // Zoom factor that increases neuron size when closer
    const zoomFactor = Math.max(0.5, Math.min(5.0, 200 / cameraDistance));

    return {
      x: screenX,
      y: screenY,
      scale: Math.max(0.1, (scale / baseScale) * zoomFactor),
      depth: z2,
      zoomFactor: zoomFactor,
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

    // Debug info
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "12px Arial";
    this.ctx.fillText(
      `Neurons: ${this.neurons.length}, Running: ${this.state.isRunning}`,
      10,
      30
    );
  }

  createNetwork() {
    this.neurons = [];
    this.connections = [];

    // Create neurons in 3D space
    const radius = 60;

    for (let i = 0; i < this.config.networkSize; i++) {
      const clusterId = Math.floor(i / (this.config.networkSize / 4));
      const colors =
        this.CLUSTER_COLORS[clusterId % this.CLUSTER_COLORS.length];

      const neuron = {
        id: i,
        position: {
          x: (Math.random() - 0.5) * radius * 2,
          y: (Math.random() - 0.5) * radius * 2,
          z: (Math.random() - 0.5) * radius * 2,
        },
        voltage: 0,
        pulse: 0,
        lastFire: 0,
        colors: colors,
        connections: [],
      };

      this.neurons.push(neuron);
    }

    // Create connections
    for (let i = 0; i < this.neurons.length; i++) {
      for (let j = i + 1; j < this.neurons.length; j++) {
        if (Math.random() < this.config.connectionProb) {
          const connection = {
            from: this.neurons[i],
            to: this.neurons[j],
            weight: 0.1 + Math.random() * 0.4,
          };
          this.connections.push(connection);
          this.neurons[i].connections.push(connection);

          // Also create reverse connection for bidirectional
          const reverseConnection = {
            from: this.neurons[j],
            to: this.neurons[i],
            weight: 0.1 + Math.random() * 0.4,
          };
          this.connections.push(reverseConnection);
          this.neurons[j].connections.push(reverseConnection);
        }
      }
    }
  }

  updateNetwork() {
    if (this.state.pauseSpikes) return;

    this.neurons.forEach((neuron) => {
      // Random firing
      if (Math.random() < this.state.firingRate * this.state.speed) {
        this.fireNeuron(neuron);
      }

      // Pulse decay
      if (neuron.pulse > 0.01) {
        neuron.pulse *= this.state.pulseDecay;
      } else {
        neuron.pulse = 0;
      }

      // Voltage decay
      neuron.voltage *= 0.99;
    });

    // Update voltage display for selected neuron
    if (this.state.selectedNeuron && this.dom.voltageValue) {
      this.dom.voltageValue.textContent =
        this.state.selectedNeuron.voltage.toFixed(3);
      this.updateTrace();
    }
  }

  fireNeuron(neuron) {
    neuron.pulse = this.config.pulseIntensity;
    neuron.voltage = 0;
    neuron.lastFire = Date.now();

    // Propagate to connected neurons
    neuron.connections.forEach((conn) => {
      conn.to.voltage += conn.weight;
      if (conn.to.voltage >= this.state.threshold) {
        setTimeout(() => this.fireNeuron(conn.to), Math.random() * 50);
      }
    });
  }

  updateTrace() {
    if (!this.traceCtx || !this.state.selectedNeuron) return;

    this.voltageHistory.push(this.state.selectedNeuron.voltage);
    if (this.voltageHistory.length > 260) {
      this.voltageHistory.shift();
    }

    this.clearTrace();

    // Draw voltage trace with premium green
    this.traceCtx.strokeStyle = "#13854b"; // Premium green accent
    this.traceCtx.lineWidth = 2;
    this.traceCtx.beginPath();

    this.voltageHistory.forEach((voltage, i) => {
      const x = i;
      const y = 150 - (voltage / this.state.threshold) * 100;

      if (i === 0) {
        this.traceCtx.moveTo(x, y);
      } else {
        this.traceCtx.lineTo(x, y);
      }
    });

    this.traceCtx.stroke();

    // Draw threshold line with premium blue
    this.traceCtx.strokeStyle = "#5868c9"; // Premium blue accent
    this.traceCtx.lineWidth = 1;
    this.traceCtx.setLineDash([5, 5]);
    this.traceCtx.beginPath();
    this.traceCtx.moveTo(0, 150 - 100);
    this.traceCtx.lineTo(260, 150 - 100);
    this.traceCtx.stroke();
    this.traceCtx.setLineDash([]);
  }

  clearTrace() {
    if (!this.traceCtx) return;
    this.traceCtx.fillStyle = "#000000"; // Pure black background
    this.traceCtx.fillRect(0, 0, 260, 150);
  }

  render() {
    // Clear canvas with pure black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    // Render connections with extremely thin lines
    this.connections.forEach((conn) => {
      const startProj = this.project3D(conn.from.position);
      const endProj = this.project3D(conn.to.position);

      // Skip if behind camera
      if (startProj.depth <= 0 || endProj.depth <= 0) return;

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
        this.ctx.lineWidth = 0.3; // Extremely thin active connections
      } else {
        // Inactive connection - extremely thin grey line
        this.ctx.strokeStyle = `rgba(100, 116, 139, 0.15)`;
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

      // Skip if behind camera or way off screen
      if (
        projected.depth <= 0 ||
        projected.x < -200 ||
        projected.x > this.dom.canvas.width + 200 ||
        projected.y < -200 ||
        projected.y > this.dom.canvas.height + 200
      ) {
        return;
      }

      // Zoom-responsive neuron size - grows significantly when zooming in
      const baseRadius = 12; // Base neuron size
      const radius = Math.max(
        3,
        baseRadius *
          projected.scale *
          projected.zoomFactor *
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
      const depthFade = Math.min(1, 300 / Math.max(20, projected.depth));
      const brightness = (intensity > 0.1 ? 1.0 : 0.9) * depthFade;

      this.ctx.fillStyle = `rgb(${Math.floor(
        color.r * 255 * brightness
      )}, ${Math.floor(color.g * 255 * brightness)}, ${Math.floor(
        color.b * 255 * brightness
      )})`;

      this.ctx.beginPath();
      this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Highlight selected neuron with premium accent color
      if (neuron === this.state.selectedNeuron) {
        this.ctx.strokeStyle = "#13854b"; // Use accent-green
        this.ctx.lineWidth = Math.max(2, radius * 0.15);
        this.ctx.stroke();
      }

      // Add subtle rim lighting that scales with zoom
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${
        0.6 * depthFade * Math.min(1, projected.zoomFactor)
      })`;
      this.ctx.lineWidth = Math.max(0.5, radius * 0.08);
      this.ctx.stroke();

      // Show weight information panels if enabled
      if (
        this.state.showWeights &&
        neuron.connections.length > 0 &&
        radius > 8
      ) {
        this.renderWeightPanel(neuron, projected);
      }
    });

    // Debug info with premium styling
    this.ctx.fillStyle = "#b3b1b1";
    this.ctx.font = "11px Inter, monospace";
    const cameraDistance = Math.sqrt(
      this.camera.position.x * this.camera.position.x +
        this.camera.position.y * this.camera.position.y +
        this.camera.position.z * this.camera.position.z
    );
    this.ctx.fillText(
      `CAM: ${Math.round(cameraDistance)} | NEURONS: ${
        this.neurons.length
      } | ZOOM: ${(200 / cameraDistance).toFixed(1)}x`,
      10,
      this.dom.canvas.height - 15
    );
  }

  renderWeightPanel(neuron, projected) {
    // Calculate panel position to avoid overlap
    const panelWidth = 90;
    const panelHeight = Math.min(neuron.connections.length * 14 + 25, 120);
    let panelX = projected.x + 25;
    let panelY = projected.y - panelHeight / 2;

    // Adjust position to keep panel on screen
    if (panelX + panelWidth > this.dom.canvas.width) {
      panelX = projected.x - panelWidth - 25;
    }
    if (panelY < 0) panelY = 10;
    if (panelY + panelHeight > this.dom.canvas.height) {
      panelY = this.dom.canvas.height - panelHeight - 10;
    }

    // Draw panel background with slight transparency
    this.ctx.fillStyle = "rgba(18, 21, 28, 0.95)";
    this.ctx.strokeStyle = "#1e293b";
    this.ctx.lineWidth = 1;
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw connection line from neuron to panel
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(projected.x, projected.y);
    this.ctx.lineTo(panelX, panelY + panelHeight / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw weight information
    this.ctx.font = "11px Inter, sans-serif";
    this.ctx.textAlign = "left";

    // Panel title
    this.ctx.fillStyle = "#60a5fa";
    this.ctx.fillText(`Neuron ${neuron.id}`, panelX + 6, panelY + 15);

    // Current voltage
    this.ctx.fillStyle = "#f223e0";
    this.ctx.font = "10px Inter, sans-serif";
    this.ctx.fillText(
      `V: ${neuron.voltage.toFixed(2)}`,
      panelX + 6,
      panelY + 28
    );

    // Connection weights
    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "9px Inter, sans-serif";
    const connectionsToShow = neuron.connections.slice(0, 7);
    connectionsToShow.forEach((conn, i) => {
      const targetId = conn.to.id;
      const weight = conn.weight.toFixed(2);
      const y = panelY + 42 + i * 12;

      // Color code by connection strength
      const intensity = conn.weight;
      if (intensity > 0.3) {
        this.ctx.fillStyle = "#34d399"; // Strong - green
      } else if (intensity > 0.2) {
        this.ctx.fillStyle = "#fbbf24"; // Medium - yellow
      } else {
        this.ctx.fillStyle = "#94a3b8"; // Weak - grey
      }

      this.ctx.fillText(`→N${targetId}: ${weight}`, panelX + 6, y);
    });

    // Show "..." if more connections exist
    if (neuron.connections.length > 7) {
      this.ctx.fillStyle = "#6b7280";
      this.ctx.fillText(
        `+${neuron.connections.length - 7} more...`,
        panelX + 6,
        panelY + panelHeight - 8
      );
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

// Emergency fix for neural network visibility
window.addEventListener("load", () => {
  console.log("Emergency neural network fix loading...");

  // Wait a moment for the main app to initialize
  setTimeout(() => {
    const canvas = document.getElementById("three-canvas");
    if (!canvas) {
      console.error("Canvas not found!");
      return;
    }

    const ctx = canvas.getContext("2d");

    // Create a simple working neural network visualization
    const emergencyNeurons = [];
    const emergencyConnections = [];

    // Create neurons
    for (let i = 0; i < 30; i++) {
      emergencyNeurons.push({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 200 - 100,
        radius: 8 + Math.random() * 12,
        color:
          i < 8
            ? "#60a5fa"
            : i < 16
            ? "#f59e0b"
            : i < 24
            ? "#34d399"
            : "#ef4444",
        pulse: 0,
        voltage: 0,
      });
    }

    // Create connections
    for (let i = 0; i < emergencyNeurons.length; i++) {
      for (let j = i + 1; j < emergencyNeurons.length; j++) {
        if (Math.random() < 0.1) {
          emergencyConnections.push({
            from: emergencyNeurons[i],
            to: emergencyNeurons[j],
          });
        }
      }
    }

    let animationRunning = true;

    function emergencyRender() {
      if (!animationRunning) return;

      // Clear canvas
      ctx.fillStyle = "#0a0c12";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 1;
      emergencyConnections.forEach((conn) => {
        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);
        ctx.stroke();
      });

      // Draw neurons
      emergencyNeurons.forEach((neuron) => {
        // Random firing
        if (Math.random() < 0.002) {
          neuron.pulse = 1;
        }

        // Pulse decay
        if (neuron.pulse > 0) {
          neuron.pulse *= 0.95;
        }

        // Draw glow if firing
        if (neuron.pulse > 0.1) {
          const glowRadius = neuron.radius * (1 + neuron.pulse);
          const gradient = ctx.createRadialGradient(
            neuron.x,
            neuron.y,
            0,
            neuron.x,
            neuron.y,
            glowRadius
          );
          gradient.addColorStop(0, neuron.color + "80");
          gradient.addColorStop(1, neuron.color + "00");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw neuron body
        const brightness = neuron.pulse > 0.1 ? 1 : 0.8;
        ctx.fillStyle =
          neuron.color +
          Math.floor(brightness * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw rim
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw status
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Arial";
      ctx.fillText("Emergency Neural Network Active", 20, 30);
      ctx.fillText(
        `Neurons: ${emergencyNeurons.length} | Connections: ${emergencyConnections.length}`,
        20,
        50
      );

      requestAnimationFrame(emergencyRender);
    }

    console.log("Emergency neural network starting...");
    emergencyRender();

    // Stop emergency render if main app starts working
    setTimeout(() => {
      const mainApp = window.snnVisualizer;
      if (mainApp && mainApp.neurons && mainApp.neurons.length > 0) {
        console.log("Main app detected, stopping emergency render");
        animationRunning = false;
      }
    }, 3000);
  }, 1000);
});
