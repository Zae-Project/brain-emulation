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
        primary: new THREE.Color(0.0, 0.6, 0.8),
        glow: new THREE.Color(0.2, 0.7, 0.9),
      },
      {
        primary: new THREE.Color(0.8, 0.2, 0.6),
        glow: new THREE.Color(0.9, 0.4, 0.7),
      },
      {
        primary: new THREE.Color(0.7, 0.8, 0.0),
        glow: new THREE.Color(0.8, 0.9, 0.3),
      },
      {
        primary: new THREE.Color(0.8, 0.4, 0.0),
        glow: new THREE.Color(0.9, 0.6, 0.2),
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
    // Working 3D projection
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

    // Simple perspective projection with proper scaling
    const distance = Math.max(10, z2);
    const scale = 300 / distance;

    const screenX = this.dom.canvas.width / 2 + x2 * scale;
    const screenY = this.dom.canvas.height / 2 - y2 * scale;

    return {
      x: screenX,
      y: screenY,
      scale: Math.max(0.1, scale / 300),
      depth: z2,
    };
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

    // Draw voltage trace
    this.traceCtx.strokeStyle = "#f223e0";
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

    // Draw threshold line
    this.traceCtx.strokeStyle = "#60a5fa";
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
    this.traceCtx.fillStyle = "#0f172a";
    this.traceCtx.fillRect(0, 0, 260, 150);
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#0a0c12";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    // ALWAYS render connections in grey
    this.ctx.globalAlpha = 0.4;
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
        // Active connection - show in cluster color
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
        )}, ${0.6 * intensity})`;
        this.ctx.lineWidth = 1.5 + conn.weight * 2;
      } else {
        // Inactive connection - grey
        this.ctx.strokeStyle = `rgba(100, 116, 139, 0.3)`;
        this.ctx.lineWidth = 1;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(startProj.x, startProj.y);
      this.ctx.lineTo(endProj.x, endProj.y);
      this.ctx.stroke();
    });
    this.ctx.globalAlpha = 1;

    // Render neurons
    this.neurons.forEach((neuron) => {
      const projected = this.project3D(neuron.position);

      // Skip if behind camera or off screen
      if (
        projected.depth <= 0 ||
        projected.x < -100 ||
        projected.x > this.dom.canvas.width + 100 ||
        projected.y < -100 ||
        projected.y > this.dom.canvas.height + 100
      ) {
        return;
      }

      const radius = this.config.neuronSize * projected.scale * 15;
      const intensity = neuron.pulse / this.config.pulseIntensity;

      // Draw glow effect when firing
      if (intensity > 0.1) {
        const glowRadius = radius * (1.5 + intensity * 1.2);
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
          )}, ${Math.floor(glowColor.b * 255)}, ${intensity * 0.4})`
        );
        gradient.addColorStop(
          0.7,
          `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(
            glowColor.g * 255
          )}, ${Math.floor(glowColor.b * 255)}, ${intensity * 0.1})`
        );
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Draw neuron body with depth fade
      const color =
        intensity > 0.1 ? neuron.colors.glow : neuron.colors.primary;
      const depthFade = Math.min(1, 150 / Math.max(20, projected.depth));
      const brightness = (intensity > 0.1 ? 0.8 : 0.7) * depthFade;
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
        this.ctx.strokeStyle = "#ff00d6";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }

      // Add rim lighting
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * depthFade})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Show weight information panels if enabled
      if (this.state.showWeights && neuron.connections.length > 0) {
        this.renderWeightPanel(neuron, projected);
      }
    });
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
