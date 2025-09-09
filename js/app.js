// SNN Visualizer - Main Application
// Professional neural network visualization with Three.js

class SNNVisualizer {
  constructor() {
    this.state = {
      isRunning: true,
      showWeights: false,
      speed: 1,
    };

    this.config = {
      networkSize: 50,
      connectionProb: 0.1,
      neuronSize: 1.0,
      pulseIntensity: 1.5,
      cameraMoveSpeed: 0.2,
    };

    this.CLUSTER_COLORS = [
      {
        primary: new THREE.Color(0.0, 0.8, 1.0),
        glow: new THREE.Color(0.3, 0.9, 1.0),
      },
      {
        primary: new THREE.Color(1.0, 0.2, 0.8),
        glow: new THREE.Color(1.0, 0.5, 0.9),
      },
      {
        primary: new THREE.Color(0.9, 1.0, 0.0),
        glow: new THREE.Color(1.0, 1.0, 0.4),
      },
      {
        primary: new THREE.Color(1.0, 0.5, 0.0),
        glow: new THREE.Color(1.0, 0.7, 0.3),
      },
    ];

    this.dom = {};
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cameraControls = null;
    this.network = null;

    this.init();
  }

  init() {
    this.initDOM();
    this.initThreeJS();
    this.initCameraControls();
    this.initNetwork();
    this.bindUI();
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
      resetBtn: document.getElementById("resetNetwork"),
      showWeightsBtn: document.getElementById("showWeights"),
      errEl: document.getElementById("err"),
    };
  }

  initThreeJS() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c12);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.dom.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x404040, 1.5));
    const keyLight = new THREE.PointLight(0x60a5fa, 2.0, 300);
    keyLight.position.set(50, 50, 50);
    this.scene.add(keyLight);

    // Resize handler
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initCameraControls() {
    this.cameraControls = new CameraControls(
      this.camera,
      this.dom.canvas,
      this.config
    );
  }

  initNetwork() {
    this.network = new NeuralNetwork(
      this.scene,
      this.config,
      this.CLUSTER_COLORS
    );
    this.network.create();
  }

  bindUI() {
    this.dom.playBtn.addEventListener("click", () => {
      this.state.isRunning = !this.state.isRunning;
      this.dom.playBtn.textContent = this.state.isRunning ? "Pause" : "Play";
      this.dom.playBtn.classList.toggle("on", this.state.isRunning);
    });

    this.dom.speedSlider.addEventListener("input", (e) => {
      this.state.speed = parseFloat(e.target.value);
    });

    this.dom.networkSizeSlider.addEventListener("input", (e) => {
      this.config.networkSize = parseInt(e.target.value);
      this.dom.sizeValueLabel.textContent = this.config.networkSize;
    });

    this.dom.networkSizeSlider.addEventListener("change", () => {
      this.network.create();
    });

    this.dom.connectionProbSlider.addEventListener("input", (e) => {
      this.config.connectionProb = parseFloat(e.target.value);
      this.dom.probValueLabel.textContent =
        this.config.connectionProb.toFixed(2);
    });

    this.dom.connectionProbSlider.addEventListener("change", () => {
      this.network.create();
    });

    this.dom.resetBtn.addEventListener("click", () => {
      this.network.create();
    });

    this.dom.showWeightsBtn.addEventListener("click", () => {
      this.state.showWeights = !this.state.showWeights;
      this.network.setWeightsVisible(this.state.showWeights);
      this.dom.showWeightsBtn.classList.toggle("on", this.state.showWeights);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.cameraControls.update(this.state.speed);

    if (this.state.isRunning) {
      this.network.update(this.state.speed);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Camera Controls Class
class CameraControls {
  constructor(camera, canvas, config) {
    this.camera = camera;
    this.canvas = canvas;
    this.config = config;

    this.target = new THREE.Vector3(0, 0, 0);
    this.distance = 100;
    this.theta = 1.5;
    this.phi = 1.5;
    this.move = { forward: 0, right: 0, up: 0 };
    this.mouse = { x: 0, y: 0, isLeftDown: false, isRightDown: false };

    this.init();
  }

  init() {
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("wheel", (e) => this.onWheel(e));
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    this.updatePosition();
  }

  onMouseDown(e) {
    if (e.button === 0) this.mouse.isLeftDown = true;
    if (e.button === 2) this.mouse.isRightDown = true;
  }

  onMouseUp(e) {
    if (e.button === 0) this.mouse.isLeftDown = false;
    if (e.button === 2) this.mouse.isRightDown = false;
  }

  onMouseMove(e) {
    const dx = e.clientX - this.mouse.x;
    const dy = e.clientY - this.mouse.y;
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;

    if (this.mouse.isLeftDown) {
      this.theta -= dx * 0.005;
      this.phi -= dy * 0.005;
      this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));
    }
    if (this.mouse.isRightDown) {
      const right = new THREE.Vector3()
        .setFromMatrixColumn(this.camera.matrix, 0)
        .multiplyScalar(-dx * 0.1);
      const up = new THREE.Vector3()
        .setFromMatrixColumn(this.camera.matrix, 1)
        .multiplyScalar(dy * 0.1);
      this.target.add(right).add(up);
    }
  }

  onWheel(e) {
    this.distance += e.deltaY * 0.1;
    this.distance = Math.max(5, Math.min(500, this.distance));
  }

  onKeyDown(e) {
    if (e.code === "KeyW") this.move.forward = 1;
    if (e.code === "KeyS") this.move.forward = -1;
    if (e.code === "KeyD") this.move.right = 1;
    if (e.code === "KeyA") this.move.right = -1;
    if (e.code === "KeyE") this.move.up = 1;
    if (e.code === "KeyQ") this.move.up = -1;
    if (e.code === "Space") this.reset();
  }

  onKeyUp(e) {
    if (e.code === "KeyW" || e.code === "KeyS") this.move.forward = 0;
    if (e.code === "KeyA" || e.code === "KeyD") this.move.right = 0;
    if (e.code === "KeyQ" || e.code === "KeyE") this.move.up = 0;
  }

  update(speed) {
    const forwardDir = new THREE.Vector3();
    this.camera.getWorldDirection(forwardDir);
    const rightDir = new THREE.Vector3()
      .crossVectors(this.camera.up, forwardDir)
      .normalize();

    this.target.add(
      forwardDir.multiplyScalar(
        this.move.forward * this.config.cameraMoveSpeed * speed
      )
    );
    this.target.add(
      rightDir.multiplyScalar(
        this.move.right * this.config.cameraMoveSpeed * speed
      )
    );
    this.target.y += this.move.up * this.config.cameraMoveSpeed * speed;

    this.updatePosition();
  }

  updatePosition() {
    this.camera.position.x =
      this.target.x + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
    this.camera.position.y = this.target.y + this.distance * Math.cos(this.phi);
    this.camera.position.z =
      this.target.z + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    this.camera.lookAt(this.target);
  }

  reset() {
    this.target.set(0, 0, 0);
    this.distance = 100;
    this.theta = 1.5;
    this.phi = 1.5;
  }
}

// Neural Network Class
class NeuralNetwork {
  constructor(scene, config, clusterColors) {
    this.scene = scene;
    this.config = config;
    this.clusterColors = clusterColors;
    this.neurons = [];
    this.glows = [];
    this.lines = null;
  }

  create() {
    this.destroy();
    const radius = 40;

    for (let i = 0; i < this.config.networkSize; i++) {
      const clusterId = Math.floor(i / (this.config.networkSize / 4));
      const c = this.clusterColors[clusterId % this.clusterColors.length];
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * radius * 2,
        (Math.random() - 0.5) * radius * 2,
        (Math.random() - 0.5) * radius * 2
      );

      const neuron = new THREE.Mesh(
        new THREE.SphereGeometry(this.config.neuronSize, 24, 12),
        new THREE.MeshLambertMaterial({
          color: c.primary,
          emissive: c.primary.clone().multiplyScalar(0.5),
        })
      );
      neuron.position.copy(pos);
      neuron.userData = {
        id: i,
        pulse: 0,
        originalColor: c.primary,
        glowColor: c.glow,
      };
      this.neurons.push(neuron);
      this.scene.add(neuron);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(this.config.neuronSize * 1.8, 24, 12),
        new THREE.MeshBasicMaterial({
          color: c.glow,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
        })
      );
      glow.position.copy(pos);
      this.glows.push(glow);
      this.scene.add(glow);
    }
    this.createConnections();
  }

  createConnections() {
    const positions = [];
    const colors = [];

    for (let i = 0; i < this.neurons.length; i++) {
      for (let j = i + 1; j < this.neurons.length; j++) {
        if (Math.random() < this.config.connectionProb) {
          positions.push(
            ...this.neurons[i].position.toArray(),
            ...this.neurons[j].position.toArray()
          );
          const c = this.neurons[i].userData.originalColor
            .clone()
            .multiplyScalar(0.4);
          colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });

    this.lines = new THREE.LineSegments(geom, mat);
    this.lines.visible = false;
    this.scene.add(this.lines);
  }

  update(speed) {
    for (let i = 0; i < this.neurons.length; i++) {
      const n = this.neurons[i];
      const g = this.glows[i];
      const u = n.userData;

      if (Math.random() < 0.001 * speed) {
        u.pulse = this.config.pulseIntensity;
      }

      if (u.pulse > 0.01) {
        u.pulse *= 0.95;
        const intensity = u.pulse / this.config.pulseIntensity;
        n.material.emissive.copy(
          u.glowColor.clone().multiplyScalar(intensity * 1.5)
        );
        n.scale.setScalar(1 + intensity * 0.8);
        g.material.opacity = Math.max(0.3, intensity * 1.2);
        g.scale.setScalar(1 + intensity * 2.5);
      } else {
        n.material.emissive.copy(u.originalColor.clone().multiplyScalar(0.5));
        n.scale.setScalar(1.0);
        g.material.opacity = 0.3;
        g.scale.setScalar(1.0);
      }
    }
  }

  setWeightsVisible(visible) {
    if (this.lines) {
      this.lines.visible = visible;
    }
  }

  destroy() {
    this.neurons.forEach((n) => this.scene.remove(n));
    this.glows.forEach((g) => this.scene.remove(g));
    if (this.lines) this.scene.remove(this.lines);
    this.neurons.length = 0;
    this.glows.length = 0;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") {
    const errEl = document.getElementById("err");
    errEl.textContent =
      "THREE.js library failed to load. Please check your internet connection.";
    errEl.style.display = "block";
    return;
  }

  new SNNVisualizer();
});
