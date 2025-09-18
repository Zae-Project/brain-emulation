// Fixed SNN Visualizer with a stable orbit camera system

class SNNVisualizer {
  constructor() {
    this.state = {
      isRunning: true,
      showWeights: false,
      speed: 1,
      firingRate: 0.75,
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
      leak: 0.985, // membrane leak per step
      refractoryMs: 80, // short refractory period after spike
      backgroundImpulse: 0.08, // base random input magnitude when background fires
      excRatio: 0.8, // fraction of excitatory neurons
      interProbScale: 0.2, // 0..1: cross-cluster probability scale
      interWeightScale: 0.3, // 0..1: cross-cluster weight scale
      clusterCount: 4,
      clusterSize: 30,
      fogStrength: 0.3,
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
    this._simAccumulator = 0; // supports fractional speeds

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
    this.initTooltips();
    this.fixUIStyles(); // Add this line to fix the UI styles

    // Debug: Log network creation
    console.log(`Network initialized with ${this.neurons.length} neurons`);

    // Start animation immediately
    this.animate();
  }

  // Initialize parameter/tool tooltips. This used to be referenced
  // but was missing, causing initialization to crash. We implement
  // a lightweight, dependency-free tooltip system that positions
  // the tooltip near the cursor and keeps it within the viewport.
  initTooltips() {
    try {
      const infos = document.querySelectorAll('.param-info');
      if (!infos || infos.length === 0) return; // No-op if not present

      infos.forEach((infoEl) => {
        let tip = infoEl.querySelector('.tooltip');
        if (!tip) {
          // Create a minimal fallback tooltip if missing
          tip = document.createElement('div');
          tip.className = 'tooltip';
          tip.textContent = 'No additional info available.';
          infoEl.appendChild(tip);
        }

        // Ensure base styles for JS‑controlled positioning/visibility
        tip.style.position = 'fixed';
        tip.style.visibility = 'hidden';
        tip.style.opacity = '0';
        tip.style.pointerEvents = 'none';

        // Move tooltip to body so it's never clipped by panel stacking/overflow
        if (tip.parentElement !== document.body) {
          // Keep content but detach from panel
          const bodyTip = tip.cloneNode(true);
          document.body.appendChild(bodyTip);
          tip.remove();
          tip = bodyTip;
        }

        const placeNearIcon = () => {
          const padding = 12;
          const rect = infoEl.getBoundingClientRect();
          const tipRect = tip.getBoundingClientRect();
          // Prefer right of icon; if not enough space, place to left
          const preferRightX = rect.right + 10;
          const preferLeftX = rect.left - tipRect.width - 10;
          let x = preferRightX <= window.innerWidth - padding ? preferRightX : Math.max(padding, preferLeftX);
          // Align vertically with icon; clamp to viewport
          let y = rect.top - 4;
          const maxX = window.innerWidth - tipRect.width - padding;
          const maxY = window.innerHeight - tipRect.height - padding;
          x = Math.max(padding, Math.min(x, maxX));
          y = Math.max(padding, Math.min(y, maxY));
          tip.style.left = `${x}px`;
          tip.style.top = `${y}px`;
          tip.style.zIndex = "10000";
          // Ensure appearance when detached from panel CSS
          tip.style.background = tip.style.background || '#1a1d29';
          tip.style.color = tip.style.color || '#ffffff';
          tip.style.padding = tip.style.padding || '12px';
          tip.style.borderRadius = tip.style.borderRadius || '8px';
          tip.style.border = tip.style.border || '1px solid #374E84';
          tip.style.boxShadow = tip.style.boxShadow || '0 4px 20px rgba(0,0,0,0.3)';
          tip.style.maxWidth = tip.style.maxWidth || '320px';
        };

        const show = () => {
          placeNearIcon();
          tip.style.visibility = 'visible';
          tip.style.opacity = '1';
        };
        const hide = () => {
          tip.style.visibility = 'hidden';
          tip.style.opacity = '0';
        };

        infoEl.addEventListener('mouseenter', show);
        infoEl.addEventListener('mouseleave', hide);
        window.addEventListener('resize', () => {
          if (tip.style.visibility === 'visible') placeNearIcon();
        });
        // Also keep accessible on focus/blur for keyboard users
        infoEl.setAttribute('tabindex', '0');
        infoEl.addEventListener('focus', show);
        infoEl.addEventListener('blur', hide);
      });
    } catch (e) {
      console.warn('Tooltip initialization failed:', e);
      // Do not block visualization if tooltips fail
    }
  }

  fixUIStyles() {
    // Fix controls panel position
    const controlsElement = document.getElementById("controls");
    if (controlsElement) {
      controlsElement.style.position = "fixed";
      controlsElement.style.left = "16px";
      controlsElement.style.top = "180px"; // Lower position to prevent overlap
      controlsElement.style.zIndex = "5";
      controlsElement.style.width = "320px";
      controlsElement.style.maxHeight = "calc(100vh - 220px)";
    }

    // Fix sliders
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      input[type="range"] {
        -webkit-appearance: none;
        height: 6px;
        background: #2a3245;
        border-radius: 3px;
        width: 100%;
      }
      
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 16px;
        width: 16px;
        border-radius: 8px;
        background: #374E84;
        cursor: pointer;
      }
      
      .lesson-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(8px);
      }
      
      .lesson-modal-content {
        background: #0a0a0a;
        border: 1px solid #2a2a2a;
        padding: 32px;
        max-width: 800px;
        max-height: 85vh;
        overflow-y: auto;
        color: #ffffff;
        position: relative;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      }
    `;
    document.head.appendChild(styleElement);

    // Fix lesson panel
    const lessonPanel = document.getElementById("lessonPanel");
    if (lessonPanel) {
      lessonPanel.style.zIndex = "10";
    }

    // Fix navigation controls
    const navControls = document.getElementById("navControls");
    if (navControls) {
      navControls.style.zIndex = "10";
    }
  }

  initDOM() {
    this.dom = {
      canvas: document.getElementById("three-canvas"),
      playBtn: document.getElementById("play"),
      speedSlider: document.getElementById("speed"),
      presetSelect: document.getElementById("presetSelect"),
      networkSizeSlider: document.getElementById("networkSize"),
      sizeValueLabel: document.getElementById("sizeValue"),
      clusterCountSlider: document.getElementById("clusterCount"),
      clustersValueLabel: document.getElementById("clustersValue"),
      clusterSizeSlider: document.getElementById("clusterSize"),
      clusterSizeValueLabel: document.getElementById("clusterSizeValue"),
      interProbSlider: document.getElementById("interProb"),
      interProbValueLabel: document.getElementById("interProbValue"),
      interWeightSlider: document.getElementById("interWeight"),
      interWeightValueLabel: document.getElementById("interWeightValue"),
      excRatioSlider: document.getElementById("excRatio"),
      excRatioValueLabel: document.getElementById("excValue"),
      fogSlider: document.getElementById("fogStrength"),
      fogValueLabel: document.getElementById("fogValue"),
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
      this.clearTrace(); // Clear trace when selecting a new neuron

      if (this.dom.voltageValue) {
        const v = this.state.selectedNeuron.voltage;
        const last = this.state.selectedNeuron.lastFire || 0;
        const ago = last ? `${((Date.now() - last) / 1000).toFixed(1)}s ago` : "no spike yet";
        this.dom.voltageValue.textContent = `${v.toFixed(3)} (${ago})`;
      }
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
    // First check if neurons exist
    if (!this.neurons || this.neurons.length === 0) {
      console.error("No neurons available for rendering!");
      this.createNetwork();
      return;
    }

    // Clear canvas
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    const now = Date.now();
    const recentWindow = 180;

    // Precompute projections and recency
    const projById = new Map();
    const projNeurons = [];
    const recentlyFired = new Set();
    for (const n of this.neurons) {
      const p = this.project3D(n.position);
      projById.set(n.id, p);
      projNeurons.push({ n, p });
      if (now - (n.lastFire || 0) < recentWindow) recentlyFired.add(n.id);
    }

    // Sort and render connections back-to-front using average depth
    const clusterSize = Math.max(1, this.config.clusterSize || Math.floor(this.config.networkSize / (this.config.clusterCount || 1)));
    const edges = this.connections
      .map((conn) => {
        const sp = projById.get(conn.from.id);
        const ep = projById.get(conn.to.id);
        return { conn, sp, ep, depth: (sp.depth + ep.depth) / 2 };
      })
      .sort((a, b) => b.depth - a.depth); // far first

    // determine fog scale by depth
    const maxDepth = Math.max(1, ...projNeurons.map((x) => x.p.depth));
    const fogK = Math.min(1, Math.max(0, this.config.fogStrength || 0));
    const fogFactor = (d) => 1 - fogK * (Math.min(1, d / maxDepth));

    for (const e of edges) {
      const bothFired = recentlyFired.has(e.conn.from.id) && recentlyFired.has(e.conn.to.id);
      const sameCluster =
        Math.floor(e.conn.from.id / clusterSize) === Math.floor(e.conn.to.id / clusterSize);

      if (bothFired && sameCluster) {
        const c = e.conn.from.colors.glow;
        const alpha = 0.8 * fogFactor(e.depth);
        this.ctx.strokeStyle = `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, ${alpha})`;
        this.ctx.lineWidth = 0.6;
      } else {
        const alpha = 0.15 * fogFactor(e.depth);
        this.ctx.strokeStyle = `rgba(189, 189, 189, ${alpha})`;
        this.ctx.lineWidth = 0.2;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(e.sp.x, e.sp.y);
      this.ctx.lineTo(e.ep.x, e.ep.y);
      this.ctx.stroke();
    }

    // Sort and render neurons back-to-front
    projNeurons.sort((a, b) => b.p.depth - a.p.depth);
    for (const item of projNeurons) {
      const neuron = item.n;
      const projected = item.p;

      if (
        projected.x < -200 ||
        projected.x > this.dom.canvas.width + 200 ||
        projected.y < -200 ||
        projected.y > this.dom.canvas.height + 200
      ) continue;

      const baseRadius = 8;
      const radius = Math.max(1.5, baseRadius * projected.scale * (projected.zoomFactor || 1) * this.config.neuronSize);
      const intensity = neuron.pulse / this.config.pulseIntensity;
      const isActive = intensity > 0.10;

      if (isActive) {
        const glowRadius = radius * (1.8 + intensity * 2.0);
        const gradient = this.ctx.createRadialGradient(projected.x, projected.y, 0, projected.x, projected.y, glowRadius);
        const glowColor = neuron.colors.glow;
        const f = fogFactor(projected.depth);
        gradient.addColorStop(0, `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(glowColor.g * 255)}, ${Math.floor(glowColor.b * 255)}, ${f * intensity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(glowColor.g * 255)}, ${Math.floor(glowColor.b * 255)}, ${f * intensity * 0.3})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const depthFade = Math.min(1, 800 / Math.max(20, projected.depth));
      const squareSize = radius * 2;
      if (isActive) {
        const color = neuron.colors.primary;
        const f = fogFactor(projected.depth);
        this.ctx.fillStyle = `rgba(${Math.floor(color.r * 255 * depthFade)}, ${Math.floor(color.g * 255 * depthFade)}, ${Math.floor(color.b * 255 * depthFade)}, ${0.85 * f})`;
      } else {
        const grey = Math.floor(150 * depthFade);
        const f = fogFactor(projected.depth);
        this.ctx.fillStyle = `rgba(${grey}, ${grey}, ${grey}, ${0.5 * f})`;
      }
      this.ctx.fillRect(projected.x - squareSize / 2, projected.y - squareSize / 2, squareSize, squareSize);

      const f2 = fogFactor(projected.depth);
      this.ctx.strokeStyle = isActive
        ? `rgba(${Math.floor(neuron.colors.glow.r * 255 * depthFade)}, ${Math.floor(neuron.colors.glow.g * 255 * depthFade)}, ${Math.floor(neuron.colors.glow.b * 255 * depthFade)}, ${0.9 * f2})`
        : `rgba(200, 200, 200, ${0.7 * f2})`;
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(projected.x - squareSize / 2, projected.y - squareSize / 2, squareSize, squareSize);

      if (squareSize > 12) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * depthFade})`;
        this.ctx.font = `${Math.max(8, Math.min(12, squareSize * 0.4))}px Inter, monospace`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(neuron.id.toString(), projected.x, projected.y);
      }

      if (neuron === this.state.selectedNeuron) {
        this.ctx.strokeStyle = "#374E84";
        this.ctx.lineWidth = Math.max(2, squareSize * 0.1);
        this.ctx.strokeRect(projected.x - squareSize / 2, projected.y - squareSize / 2, squareSize, squareSize);
      }

      if (this.state.showWeights && neuron.connections.length > 0 && radius > 8) {
        this.renderWeightPanel(neuron, projected);
      }
    }

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

  // Draw a lightweight weights panel next to a neuron
  // Shows top outgoing connections with their weights.
  renderWeightPanel(neuron, projected) {
    const maxRows = 5;
    if (!neuron || !neuron.connections || neuron.connections.length === 0) return;

    // Sort by weight desc and take a few
    const rows = neuron.connections
      .slice(0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxRows)
      .map((c) => ({ id: c.to.id, w: c.weight }));

    // Panel geometry
    const padX = 6;
    const padY = 6;
    const lineH = 12;
    const headerH = 14;
    const width = 100;
    const height = headerH + rows.length * lineH + padY * 2;

    // Offset panel to the upper-right of the neuron
    let x = projected.x + 10;
    let y = projected.y - height - 6;

    // Keep inside the canvas
    x = Math.max(4, Math.min(x, this.dom.canvas.width - width - 4));
    y = Math.max(4, Math.min(y, this.dom.canvas.height - height - 4));

    // Panel background
    this.ctx.fillStyle = "rgba(24, 27, 34, 0.92)"; // matches UI surface tone
    this.ctx.fillRect(x, y, width, height);

    // Border
    this.ctx.strokeStyle = "#374E84"; // edge accent
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    // Header
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "11px Inter, monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`→ ${neuron.id}`, x + padX, y + padY);

    // Rows
    this.ctx.fillStyle = "#c9d1d9";
    rows.forEach((r, i) => {
      const yy = y + padY + headerH + i * lineH - 2;
      this.ctx.fillText(`${r.id.toString().padStart(2, " ")}: ${r.w.toFixed(2)}`,
        x + padX,
        yy
      );
    });

    // No return value
  }

  clearTrace() {
    if (!this.traceCtx) return;

    const w = this.dom.trace.width;
    const h = this.dom.trace.height;

    this.traceCtx.fillStyle = "#101218"; // Dark background for trace
    this.traceCtx.fillRect(0, 0, w, h);

    // Axes and grid (0.0, 0.5, 1.0)
    this.traceCtx.strokeStyle = "#2a2a2a";
    this.traceCtx.lineWidth = 1;
    const ticks = [0, 0.5, 1.0];
    ticks.forEach((t) => {
      const y = h - (t / 1.5) * h;
      this.traceCtx.beginPath();
      this.traceCtx.moveTo(0, y);
      this.traceCtx.lineTo(w, y);
      this.traceCtx.stroke();
      this.traceCtx.fillStyle = "#9ca3af";
      this.traceCtx.font = "10px Inter, monospace";
      this.traceCtx.fillText(t.toFixed(1), 4, Math.max(10, y - 2));
    });

    // Threshold dashed line at current threshold
    this.traceCtx.strokeStyle = "rgba(255, 100, 100, 0.4)";
    this.traceCtx.setLineDash([3, 3]);
    const thresholdY = h - (this.state.threshold / 1.5) * h;
    this.traceCtx.beginPath();
    this.traceCtx.moveTo(0, thresholdY);
    this.traceCtx.lineTo(w, thresholdY);
    this.traceCtx.stroke();
    this.traceCtx.setLineDash([]);
  }

  drawTrace() {
    if (!this.traceCtx || !this.state.selectedNeuron) return;

    this.clearTrace();

    this.traceCtx.strokeStyle = "#60a5fa"; // A bright blue for the trace line
    this.traceCtx.lineWidth = 2;
    this.traceCtx.beginPath();

    const history = this.voltageHistory;
    const canvasWidth = this.dom.trace.width;
    const canvasHeight = this.dom.trace.height;

    for (let i = 0; i < history.length; i++) {
      const x = (i / Math.max(1, history.length - 1)) * canvasWidth;
      const y = canvasHeight - (history[i] / 1.5) * canvasHeight; // Scale voltage to fit
      if (i === 0) {
        this.traceCtx.moveTo(x, y);
      } else {
        this.traceCtx.lineTo(x, y);
      }
    }
    this.traceCtx.stroke();

    // Overlay spike markers for the selected neuron (last 4s)
    const now = Date.now();
    const windowMs = 1500;
    const spikes = this.state.selectedNeuron.spikeHistory || [];
    this.traceCtx.strokeStyle = "rgba(255, 120, 120, 0.35)";
    this.traceCtx.lineWidth = 1;
    spikes.forEach((t) => {
      if (now - t <= windowMs) {
        const x = this.dom.trace.width - ((now - t) / windowMs) * this.dom.trace.width;
        this.traceCtx.beginPath();
        this.traceCtx.moveTo(x, 0);
        this.traceCtx.lineTo(x, this.dom.trace.height);
        this.traceCtx.stroke();
      }
    });
  }

  createNetwork() {
    // Clear previous network
    this.neurons = [];
    this.connections = [];
    this.voltageHistory = [];
    this.state.selectedNeuron = null;

    // Create neurons with random positions in 3D space
    // Derive network size from cluster controls (updated for presets)
    this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
    const networkSize = this.config.networkSize;
    const radius = 260; // Closer grouping

    // Precompute cluster layout grid
    const clusterCount = Math.max(1, this.config.clusterCount);
    const cols = Math.ceil(Math.sqrt(clusterCount));
    const rows = Math.ceil(clusterCount / cols);
    const spacingX = 240;
    const spacingY = 240;

    // From preset: per-cluster archetype list
    let clusterTypeList = new Array(clusterCount).fill(null);
    if (this.config.presetId && this.config.presetId !== 'None' && window.SNN_REGISTRY) {
      const preset = window.SNN_REGISTRY.RegionPresets[this.config.presetId];
      if (preset && Array.isArray(preset.clusters) && preset.clusters.length > 0) {
        const list = [];
        preset.clusters.forEach((c) => {
          for (let k = 0; k < (c.count || 1); k++) list.push(c.typeId);
        });
        for (let idx = 0; idx < clusterCount; idx++) {
          clusterTypeList[idx] = list[idx % list.length] || null;
        }
      }
    }

    const sampleTypeId = (mix) => {
      if (!mix || mix.length === 0) return null;
      let r = Math.random(), acc = 0;
      for (const m of mix) {
        acc += m.fraction || 0;
        if (r <= acc) return m.typeId;
      }
      return mix[mix.length - 1].typeId;
    };

    for (let i = 0; i < networkSize; i++) {
      // Determine which cluster this neuron belongs to (4 clusters total)
      const clusterId = Math.floor(i / this.config.clusterSize);

      // Set cluster-specific position offset
      const row = Math.floor(clusterId / cols);
      const col = clusterId % cols;
      const clusterOffset = {
        x: (col - (cols - 1) / 2) * spacingX,
        y: (row - (rows - 1) / 2) * spacingY,
        z: 0,
      };

      // Random position within cluster
      const r = radius * (0.5 + Math.random() * 0.5); // Between 50% and 100% of radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;

      const position = {
        x: clusterOffset.x + r * Math.cos(theta) * Math.cos(phi) * 0.5,
        y: clusterOffset.y + r * Math.sin(phi) * 0.5,
        z: r * Math.sin(theta) * Math.cos(phi) * 0.5,
      };

      // Assign cluster color
      const colors = this.CLUSTER_COLORS[clusterId % this.CLUSTER_COLORS.length];

      // Determine neuron type (from preset mix if available)
      let nType = null;
      if (clusterTypeList[clusterId] && window.SNN_REGISTRY) {
        const arche = window.SNN_REGISTRY.ClusterTypes[clusterTypeList[clusterId]];
        const typeId = sampleTypeId(arche?.mix);
        const def = window.SNN_REGISTRY.NeuronTypes[typeId];
        if (def) nType = def;
      }
      const isExcitatory = nType ? (nType.type !== 'inhibitory') : (i < Math.floor(this.config.excRatio * networkSize));

      this.neurons.push({
        id: i,
        position,
        voltage: Math.random() * 0.2, // Initial voltage
        pulse: 0, // Visual pulse effect
        colors,
        connections: [],
        lastFire: 0, // Timestamp of last spike
        spikeHistory: [], // Recent spike timestamps
        inputAccum: 0,
        refractoryUntil: 0,
        type: isExcitatory ? 'E' : 'I',
        // per-neuron overrides if provided by preset
        threshold: nType?.threshold,
        leak: nType?.leak,
        refractoryMs: nType?.refractoryMs,
        bgImpulse: nType?.bgImpulse,
        spikeGain: nType?.spikeGain,
      });
    }

    // Create connections between neurons with probability based on cluster membership
    for (let i = 0; i < networkSize; i++) {
      const fromNeuron = this.neurons[i];
      const fromCluster = Math.floor(i / this.config.clusterSize);

      for (let j = 0; j < networkSize; j++) {
        if (i === j) continue; // Skip self-connections

        const toNeuron = this.neurons[j];
        const toCluster = Math.floor(j / this.config.clusterSize);

        // Higher connection probability within same cluster
        const baseProbability = this.config.connectionProb;
        let connectionProb = baseProbability;

        // Same cluster = higher connection probability, different cluster = lower
        if (fromCluster === toCluster) {
          connectionProb *= 1.8; // strong intra-cluster
        } else {
          const interP = 0.02 + 0.28 * (this.config.interProbScale ?? 0.2); // 0.02..0.30
          connectionProb *= interP;
        }

        if (Math.random() < connectionProb) {
          // Create the connection with a random weight
          let weight;
          const same = fromCluster === toCluster;
          if (fromNeuron.type === 'E') {
            // Excitatory synapse (positive)
            const baseE = 0.45 + Math.random() * 0.55;
            const interW = 0.10 + 0.90 * (this.config.interWeightScale ?? 0.3);
            weight = same ? baseE : baseE * interW;
          } else {
            // Inhibitory synapse (negative)
            const baseI = 0.25 + Math.random() * 0.45;
            const interWI = 0.10 + 0.90 * (this.config.interWeightScale ?? 0.3);
            weight = -(same ? baseI : baseI * interWI);
          }
          const connection = {
            from: fromNeuron,
            to: toNeuron,
            weight,
          };

          this.connections.push(connection);
          fromNeuron.connections.push(connection);
        }
      }
    }

    // Seed a few initial spikes so the simulation is visibly active immediately
    // Seed per-cluster to avoid global simultaneous onset
    for (let c = 0; c < this.config.clusterCount; c++) {
      const start = c * this.config.clusterSize;
      const end = start + this.config.clusterSize;
      const selection = [];
      for (let k = 0; k < 2; k++) {
        const idx = start + Math.floor(Math.random() * (end - start));
        selection.push(this.neurons[idx]);
      }
      selection.forEach((n) => this.fireNeuron(n));
    }

    // Sync UI labels to derived sizes
    if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
    if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
    if (this.dom.clustersValueLabel) this.dom.clustersValueLabel.textContent = this.config.clusterCount;
    if (this.dom.clusterCountSlider) this.dom.clusterCountSlider.value = String(this.config.clusterCount);
    if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
    if (this.dom.clusterSizeSlider) this.dom.clusterSizeSlider.value = String(this.config.clusterSize);

    // Clear trace if a neuron was selected
    this.clearTrace();

    if (this.dom.voltageValue) {
      this.dom.voltageValue.textContent = "--";
    }

    console.log(
      `Network created with ${this.neurons.length} neurons and ${this.connections.length} connections`
    );
  }

  fireNeuron(neuron) {
    if (!neuron) return;

    // Set pulse for visual effect
    neuron.pulse = this.config.pulseIntensity;

    // Reset voltage
    neuron.voltage = 0;

    // Record spike time
    const now = Date.now();
    neuron.lastFire = now;
    if (Array.isArray(neuron.spikeHistory)) {
      neuron.spikeHistory.push(now);
      if (neuron.spikeHistory.length > 100) neuron.spikeHistory.shift();
    }
    const refr = (neuron.refractoryMs ?? this.config.refractoryMs) ?? 0;
    neuron.refractoryUntil = now + refr;

    // Propagate to connected neurons
    const gain = neuron.spikeGain ?? 1.0;
    neuron.connections.forEach((conn) => {
      conn.to.inputAccum = (conn.to.inputAccum || 0) + conn.weight * gain;
    });
  }

  updateNetwork() {
    if (this.state.pauseSpikes) return;

    // Support fractional speeds smoothly via accumulator
    this._simAccumulator += Math.max(0, this.state.speed);
    const steps = Math.floor(this._simAccumulator);
    this._simAccumulator -= steps;

    for (let i = 0; i < steps; i++) {
      const toFire = [];
      const now = Date.now();

      // First pass: decay, apply accumulated input, background input, then decide spikes
      this.neurons.forEach((neuron) => {
        // Visual pulse decay always
        neuron.pulse *= this.state.pulseDecay;

        // Refractory period: skip integration and threshold checks
        if (neuron.refractoryUntil && now < neuron.refractoryUntil) {
          neuron.inputAccum = 0; // still clear any queued input this step
          return;
        }

        // Leaky integration + queued input (per-neuron override if present)
        const leak = neuron.leak ?? this.config.leak ?? 0.985;
        neuron.voltage = neuron.voltage * leak + (neuron.inputAccum || 0);
        neuron.inputAccum = 0;

        // Background random input
        if (Math.random() < this.state.firingRate) {
          const base = (neuron.bgImpulse ?? this.config.backgroundImpulse) ?? 0.08;
          const amp = base * (0.25 + 0.75 * (1 - Math.min(1, Math.max(0, this.state.firingRate))));
          neuron.voltage += amp;
        }

        // Threshold test after integration
        const thr = neuron.threshold ?? this.state.threshold;
        if (neuron.voltage >= thr) toFire.push(neuron);
      });

      // Second pass: fire spikes (apply to next step via inputAccum)
      toFire.forEach((n) => this.fireNeuron(n));
    }

    // Update voltage trace for selected neuron
    if (this.state.selectedNeuron) {
      this.voltageHistory.push(this.state.selectedNeuron.voltage);
      if (this.voltageHistory.length > 150) {
        this.voltageHistory.shift();
      }

      if (this.dom.voltageValue) {
        const v = this.state.selectedNeuron.voltage;
        const last = this.state.selectedNeuron.lastFire || 0;
        const ago = last ? `${((Date.now() - last) / 1000).toFixed(1)}s ago` : "no spike yet";
        this.dom.voltageValue.textContent = `${v.toFixed(3)} (${ago})`;
      }

      this.drawTrace();
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
        // Keep cluster size in sync with network size and cluster count
        if (this.config.clusterCount > 0) {
          this.config.clusterSize = Math.max(1, Math.round(this.config.networkSize / this.config.clusterCount));
          if (this.dom.clusterSizeSlider) this.dom.clusterSizeSlider.value = String(this.config.clusterSize);
          if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
        }
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

    // Cluster count control
    if (this.dom.clusterCountSlider) {
      this.dom.clusterCountSlider.addEventListener("input", (e) => {
        this.config.clusterCount = parseInt(e.target.value);
        if (this.dom.clustersValueLabel) this.dom.clustersValueLabel.textContent = this.config.clusterCount;
        // Update derived network size
        this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
        if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
        if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
      });
      this.dom.clusterCountSlider.addEventListener("change", () => this.createNetwork());
    }

    // Cluster size control
    if (this.dom.clusterSizeSlider) {
      this.dom.clusterSizeSlider.addEventListener("input", (e) => {
        this.config.clusterSize = parseInt(e.target.value);
        if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
        // Update derived network size
        this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
        if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
        if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
      });
      this.dom.clusterSizeSlider.addEventListener("change", () => this.createNetwork());
    }

    // Inter-cluster probability
    if (this.dom.interProbSlider) {
      this.dom.interProbSlider.addEventListener("input", (e) => {
        this.config.interProbScale = parseFloat(e.target.value);
        if (this.dom.interProbValueLabel)
          this.dom.interProbValueLabel.textContent = this.config.interProbScale.toFixed(2);
      });
      this.dom.interProbSlider.addEventListener("change", () => this.createNetwork());
    }

    // Inter-cluster weight
    if (this.dom.interWeightSlider) {
      this.dom.interWeightSlider.addEventListener("input", (e) => {
        this.config.interWeightScale = parseFloat(e.target.value);
        if (this.dom.interWeightValueLabel)
          this.dom.interWeightValueLabel.textContent = this.config.interWeightScale.toFixed(2);
      });
      this.dom.interWeightSlider.addEventListener("change", () => this.createNetwork());
    }

    // E/I balance (excitatory ratio)
    if (this.dom.excRatioSlider) {
      this.dom.excRatioSlider.addEventListener("input", (e) => {
        this.config.excRatio = parseFloat(e.target.value);
        if (this.dom.excRatioValueLabel)
          this.dom.excRatioValueLabel.textContent = this.config.excRatio.toFixed(2);
      });
      this.dom.excRatioSlider.addEventListener("change", () => this.createNetwork());
    }

    // Depth fog strength
    if (this.dom.fogSlider) {
      this.dom.fogSlider.addEventListener("input", (e) => {
        this.config.fogStrength = parseFloat(e.target.value);
        if (this.dom.fogValueLabel)
          this.dom.fogValueLabel.textContent = this.config.fogStrength.toFixed(2);
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
          this.dom.firingValueLabel.textContent = this.state.firingRate.toFixed(2);
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

  // Step 1 preset applicator: update clusterCount, clusterSize, and excRatio using registry.
  applyPreset(presetId) {
    if (!window.SNN_REGISTRY) return;
    const preset = window.SNN_REGISTRY.RegionPresets[presetId];
    if (!preset || presetId === 'None') {
      // Keep current sliders; only rebuild
      this.config.presetId = 'None';
      this.createNetwork();
      return;
    }

    const counts = window.SNN_REGISTRY.deriveCounts(preset);
    const ei = window.SNN_REGISTRY.estimateEI(preset);
    if (counts) {
      this.config.clusterCount = counts.clusters;
      this.config.clusterSize = counts.clusterSize;
      this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
      if (this.dom.clustersValueLabel) this.dom.clustersValueLabel.textContent = this.config.clusterCount;
      if (this.dom.clusterCountSlider) this.dom.clusterCountSlider.value = String(this.config.clusterCount);
      if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
      if (this.dom.clusterSizeSlider) this.dom.clusterSizeSlider.value = String(this.config.clusterSize);
      if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
      if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
    }
    if (typeof ei === 'number' && !Number.isNaN(ei)) {
      this.config.excRatio = ei;
      if (this.dom.excRatioSlider) this.dom.excRatioSlider.value = ei.toFixed(2);
      if (this.dom.excRatioValueLabel) this.dom.excRatioValueLabel.textContent = ei.toFixed(2);
    }
    this.config.presetId = presetId;
    this.createNetwork();
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
      // Make sure the info container is visible with correct styling
      const infoElement = document.getElementById("info");
      if (infoElement) {
        infoElement.style.display = "block";
        infoElement.style.position = "fixed";
        infoElement.style.right = "16px";
        infoElement.style.bottom = "16px";
        infoElement.style.maxWidth = "400px";
        infoElement.style.zIndex = "100";
        infoElement.style.background = "#181b22";
        infoElement.style.border = "1px solid #374E84";
        infoElement.style.backdropFilter = "blur(12px)";
        infoElement.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.4)";
        infoElement.style.padding = "20px";
      }
    }
  }

  showFullLesson(lessonNumber) {
    // Direct lesson content - no file fetching needed
    const lessonContent = this.getFullLessonContent(lessonNumber);

    if (!lessonContent) {
      console.error(`No content found for lesson ${lessonNumber}`);
      return;
    }

    // Create modal
    const modal = document.createElement("div");
    modal.className = "lesson-modal";
    modal.style.zIndex = "1000"; // Ensure it's on top

    const modalContent = document.createElement("div");
    modalContent.className = "lesson-modal-content";

    // Inject the lesson content directly
    modalContent.innerHTML = `
      <button class="close-btn">&times;</button>
      ${lessonContent}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <button class="btn" onclick="this.closest('.lesson-modal').remove()">CLOSE LESSON</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add modal styles if they're missing
    if (!document.querySelector("style#modal-styles")) {
      const style = document.createElement("style");
      style.id = "modal-styles";
      style.textContent = `
        .lesson-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(8px);
        }
        .lesson-modal-content {
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          padding: 32px;
          max-width: 800px;
          max-height: 85vh;
          overflow-y: auto;
          color: #ffffff;
          position: relative;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        }
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #151515;
          border: 1px solid #2a2a2a;
          color: #808080;
          font-size: 18px;
          width: 36px;
          height: 36px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
    }

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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  getFullLessonContent(lessonNumber) {
    const lessons = {
      1: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 1: Basic Spike Dynamics</h1>
        <p>Spiking Neural Networks (SNNs) use discrete spikes to communicate information, unlike traditional neural networks that use continuous values. This fundamental difference makes SNNs more biologically realistic and energy-efficient.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Key Concepts</h2>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Membrane Potential</h3>
        <p>The voltage inside a neuron that accumulates over time. In our simulation, this is represented by the <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace;">voltage</code> property of each neuron. As the neuron receives inputs from connected neurons, its membrane potential increases.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Threshold</h3>
        <p>When the membrane potential reaches this critical level (typically 1.0 in our simulation), the neuron fires a spike. This is the fundamental mechanism that determines when information is transmitted.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Spike Generation</h3>
        <p>A brief electrical pulse sent to all connected neurons when the threshold is reached. In our visualization, you can see this as the bright glow effect around firing neurons.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Reset Mechanism</h3>
        <p>After firing, the membrane potential returns to 0, preparing the neuron for the next accumulation cycle. This prevents continuous firing and creates the discrete nature of spikes.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Interactive Exploration</h2>
        <p>Try adjusting the following parameters to see how they affect spike dynamics:</p>
        <ul style="margin-left: 20px;">
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Network Size:</strong> More neurons create more complex spike patterns</li>
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Connection Probability:</strong> Higher values create more interconnected networks</li>
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Firing Rate:</strong> Controls how often neurons spontaneously fire</li>
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Spike Threshold:</strong> Lower values make neurons fire more easily</li>
        </ul>
        <p>Watch how spikes propagate through the network and create cascading patterns of activity!</p>
      `,
      2: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 2: Synaptic Transmission</h1>
        <p>Understanding how spikes travel between neurons and how synaptic weights affect signal transmission in spiking neural networks.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Synaptic Connections</h2>
        <p>In our visualization, you can see synapses as the thin grey lines connecting neurons. These connections have different strengths (weights) that determine how much voltage is transmitted when a spike occurs.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Connection Weights</h3>
        <p>Each synapse has a weight value between 0.1 and 1.0. Stronger connections (higher weights) transmit more voltage, making the receiving neuron more likely to fire.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Spike Propagation</h3>
        <p>When a neuron fires, it sends its spike to all connected neurons simultaneously. The receiving neurons add the weighted input to their membrane potential.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Network Clustering</h2>
        <p>Notice how neurons are organized into clusters with stronger internal connections and weaker connections between clusters. This creates interesting propagation patterns where activity tends to spread within clusters first.</p>
        
        <p><strong style="color: #ff9bf0;">Try this:</strong> Enable "Show Weights" to see detailed connection information for each neuron, and use "Inject Spike" to watch how activity propagates through the network.</p>
      `,
      3: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 3: Network Plasticity</h1>
        <p>How neural networks adapt and learn by modifying their synaptic connections over time.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Hebbian Learning</h2>
        <p>The fundamental principle "neurons that fire together, wire together" governs how connections strengthen when neurons are repeatedly active at the same time.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Synaptic Strengthening</h3>
        <p>When two connected neurons fire within a short time window, their synaptic connection becomes stronger, making future co-activation more likely.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Synaptic Weakening</h3>
        <p>Connections that are rarely used gradually weaken over time, allowing the network to forget unused patterns and focus on relevant information.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Homeostasis</h2>
        <p>Networks maintain stability through homeostatic mechanisms that prevent runaway excitation or complete silence, balancing learning with stable operation.</p>
        
        <p><strong style="color: #ff9bf0;">Observe:</strong> Watch how repeated activation patterns in our network create stronger pathways between frequently co-active neurons.</p>
      `,
      4: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 4: Pattern Recognition</h1>
        <p>How spiking neural networks excel at detecting and learning temporal patterns in spike trains.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Temporal Coding</h2>
        <p>Unlike rate coding, temporal coding uses the precise timing of spikes to encode information, allowing for much faster and more efficient computation.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Spike Time Dependent Plasticity</h3>
        <p>The timing between pre- and post-synaptic spikes determines whether connections strengthen or weaken, enabling learning of temporal sequences.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Feature Detection</h3>
               <p>Specialized neurons can learn to respond to specific temporal patterns, acting as feature detectors for complex spatiotemporal inputs.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Competition and Selection</h2>
        <p>Winner-take-all mechanisms ensure that only the most relevant patterns survive, creating selective responses to important features.</p>
        
        <p><strong style="color: #ff9bf0;">Experiment:</strong> Use the "Inject Spike" button to create different activation patterns and observe how they propagate through different clusters in unique ways.</p>
      `,
      5: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 5: Network Topology</h1>
        <p>Understanding how the organization and structure of neural networks affects information processing and computational capabilities.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Small-World Networks</h2>
        <p>Brain-like networks exhibit small-world properties: high local clustering combined with short path lengths between distant regions, optimizing both specialized processing and global integration.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Modularity</h3>
        <p>Networks organize into modules (clusters) with dense internal connections and sparse connections between modules, enabling specialized processing while maintaining coordination.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Hub Neurons</h3>
        <p>Highly connected neurons act as hubs, integrating information from multiple sources and facilitating communication across the network.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Hierarchical Structure</h2>
        <p>Multiple scales of organization from local circuits to global networks enable complex information processing and emergent behaviors.</p>
        
        <p><strong style="color: #ff9bf0;">Notice:</strong> Our visualization shows clustered organization where neurons within clusters are more densely connected than those between clusters.</p>
      `,
      6: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 6: Inhibition & Competition</h1>
        <p>How inhibitory mechanisms create selection, attention, and decision-making capabilities in neural networks.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Lateral Inhibition</h2>
        <p>Neighboring neurons suppress each other's activity, creating competitive dynamics that enhance contrast and selectivity in neural responses.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Winner-Take-All</h3>
        <p>Competition between neurons ensures that only the strongest signals survive, implementing selection and attention mechanisms crucial for focused processing.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Excitation-Inhibition Balance</h3>
        <p>The critical ratio between excitatory and inhibitory connections determines network dynamics, stability, and computational capabilities.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Attention Mechanisms</h2>
        <p>Inhibitory circuits can gate information flow, allowing networks to focus on relevant inputs while suppressing distracting information.</p>
        
        <p><strong style="color: #ff9bf0;">Experiment:</strong> Try adjusting the threshold parameter to see how it affects competitive dynamics between neurons and clusters.</p>
      `,
      7: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 7: Multi-layer Processing</h1>
        <p>How hierarchical neural networks extract increasingly complex features through multiple processing stages.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Feature Hierarchy</h2>
        <p>Each layer detects features of increasing complexity, from simple edges and patterns in early layers to complex objects and concepts in deeper layers.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Cortical Columns</h3>
        <p>Functional units that process specific aspects of input, organized in columnar structures that work together to analyze complex patterns.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Feed-forward and Feedback</h3>
        <p>Information flows both bottom-up (sensory input) and top-down (predictions and context), enabling sophisticated processing and learning.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Abstraction Levels</h2>
        <p>Progressive abstraction from concrete sensory data to high-level concepts enables flexible and generalizable representations.</p>
        
        <p><strong style="color: #ff9bf0;">Observe:</strong> Notice how activity patterns in our network create hierarchical processing as signals propagate through connected clusters.</p>
      `,
      8: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 8: Memory Systems</h1>
        <p>How different types of memory emerge from distinct neural network architectures and plasticity mechanisms.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Working Memory</h2>
        <p>Temporary storage through persistent neural activity, maintaining information in active states for immediate use in cognitive tasks.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Long-term Memory</h3>
        <p>Stable information storage through permanent changes in synaptic strengths, enabling retention of knowledge and experiences over time.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Episodic Memory</h3>
        <p>Time-linked sequences of events stored as patterns of neural activity, enabling recall of specific experiences and their temporal context.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Associative Memory</h2>
        <p>Pattern completion and recall mechanisms that retrieve complete memories from partial cues, enabling flexible and robust memory access.</p>
        
        <p><strong style="color: #ff9bf0;">Watch:</strong> Observe how persistent activity in our network clusters creates memory-like behavior where patterns can be sustained over time.</p>
      `,
      9: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 9: Large-Scale Networks</h1>
        <p>How brain-wide coordination enables higher-order cognitive functions and potentially consciousness.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Global Workspace</h2>
        <p>Conscious access through global broadcasting of information across brain networks, enabling integration and flexible cognitive control.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Default Mode Network</h3>
        <p>Resting state activity patterns that maintain global connectivity and prepare the brain for future cognitive demands.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Information Integration</h3>
        <p>Binding of distributed processing across brain regions to create unified perceptual and cognitive experiences.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Critical Dynamics</h2>
        <p>Networks operating at the edge of chaos exhibit optimal information processing, flexibility, and computational capabilities.</p>
        
        <p><strong style="color: #ff9bf0;">Observe:</strong> Watch how activity spreads across the entire network, demonstrating global integration of distributed processing.</p>
      `,
      10: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 10: Neural Oscillations</h1>
        <p>How rhythmic neural activity coordinates processing across brain regions and enables temporal organization.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Gamma Rhythms</h2>
        <p>High-frequency oscillations (30-100 Hz) that coordinate local processing, attention, and conscious awareness within brain regions.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Alpha and Beta Rhythms</h3>
        <p>Medium-frequency oscillations (8-30 Hz) that facilitate communication between brain regions and regulate information flow.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Theta Rhythms</h3>
        <p>Low-frequency oscillations (4-8 Hz) crucial for memory formation, spatial navigation, and temporal sequence encoding.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Phase Coupling</h2>
        <p>Synchronization of oscillations across brain regions enables temporal coordination and binding of distributed processing.</p>
        
        <p><strong style="color: #ff9bf0;">Look for:</strong> Rhythmic patterns in the voltage traces and synchronized activity between connected neurons in our simulation.</p>
      `,
      11: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 11: Brain Emulation Theory</h1>
        <p>The ultimate goal of computational neuroscience: creating complete functional copies of biological brains.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Whole Brain Emulation</h2>
        <p>Creating digital copies of specific brains that preserve individual personality, memories, and cognitive patterns through detailed neural simulation.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Scanning Technology</h3>
        <p>Advanced imaging techniques needed to map every neuron, synapse, and molecular detail with sufficient resolution for functional reconstruction.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Computational Requirements</h3>
        <p>Enormous processing power and storage needed to simulate 86 billion neurons and 100 trillion synapses in real-time with biological accuracy.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Technical Challenges</h2>
        <p>Scaling from current small-scale simulations to full brain complexity while maintaining speed, accuracy, and biological fidelity.</p>
        
        <p><strong style="color: #ff9bf0;">Foundation:</strong> Our simple network demonstrates the basic principles that must scale up millions of times for complete brain emulation.</p>
      `,
      12: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 12: Ethics & Future</h1>
        <p>The profound philosophical and ethical questions raised by the possibility of creating digital minds.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Consciousness Questions</h2>
        <p>Would a perfect neural simulation be conscious? How could we determine consciousness in digital minds, and what are the implications?</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Identity and Continuity</h3>
        <p>What makes you "you" - is it the pattern of neural activity, the physical substrate, or something else? Could there be multiple copies of the same person?</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Rights and Protections</h3>
        <p>If digital minds are conscious, what rights should they have? Protection from suffering, deletion, unwanted modification, or forced labor?</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Our Responsibility</h2>
        <p>As creators of potentially conscious digital minds, we have profound moral obligations to consider their wellbeing, rights, and place in society.</p>
        
        <p><strong style="color: #ff9bf0;">Critical Thinking:</strong> These questions require careful consideration as we advance toward more sophisticated neural simulations and potential digital consciousness.</p>
      `,
    };

    return lessons[lessonNumber] || null;
  }

  animate() {
    // Animation loop only; all event bindings belong in bindUI()
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
