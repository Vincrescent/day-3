/* test/stub-three.js — stub THREE minimal untuk jsdom (tanpa WebGL).
 * Cakupan: cukup untuk menjalankan noise/camera/ui/solar-system di headless. */
'use strict';

function build() {
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    project(cam) { this.x = 0; this.y = 0; this.z = 0; return this; }
    distanceTo(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  }
  class Obj3 {
    constructor() {
      this.position = new Vec3();
      this.children = [];
      this.parent = null;
      this.visible = true;
      this.userData = {};
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.scale = new Vec3(1, 1, 1);
    }
    add(...objs) {
      for (const o of objs) { o.parent = this; this.children.push(o); }
      return this;
    }
    remove() {}
    getWorldPosition(v) {
      // akumulasi posisi lokal sepanjang rantai parent (tanpa rotasi — cukup untuk test jarak)
      v.set(0, 0, 0);
      let p = this;
      while (p) { v.x += p.position.x; v.y += p.position.y; v.z += p.position.z; p = p.parent; }
      return v;
    }
    updateWorldMatrix() {}
  }
  class Group extends Obj3 {}
  const THREE = {
    Vector3: Vec3,
    Object3D: Obj3,
    Group: Group,
    MathUtils: { lerp: (a, b, t) => a + (b - a) * t },
    Color: class { constructor(c) { this.c = c; } },
    WebGLRenderer: class {
      constructor() { this.domElement = { style: {}, addEventListener: () => {} }; }
      setPixelRatio() {} setSize() {} render() {}
      getPixelRatio() { return 1; }
    },
    Scene: class { constructor() { this.children = []; } add() {} },
    PerspectiveCamera: class {
      constructor(fov, aspect, near, far) {
        this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
        this.position = new Vec3();
      }
      updateProjectionMatrix() {}
      lookAt() {}
      project(v) { v.x = 0; v.y = 0; v.z = 0; return v; }
    },
    FogExp2: class {}, AmbientLight: class {}, PointLight: class {}, DirectionalLight: class {},
    BufferGeometry: class { constructor() { this.attributes = {}; } setAttribute() { return this; } setFromPoints() { return this; } },
    BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
    Line: class extends Obj3 {}, LineBasicMaterial: class {}, Mesh: class extends Obj3 {}, MeshPhongMaterial: class {},
    MeshBasicMaterial: class {}, Sprite: class extends Obj3 {}, SpriteMaterial: class {},
    Points: class extends Obj3 {}, ShaderMaterial: class {}, SphereGeometry: class {}, RingGeometry: class {},
    Raycaster: class { intersectObjects() { return []; } },
    CanvasTexture: class { constructor() {} },
    TextureLoader: class { load(u, ok, pr, err) { if (err) setTimeout(() => err(), 0); } },
    AdditiveBlending: 2, sRGBEncoding: 3001, DoubleSide: 2,
  };
  return THREE;
}

module.exports = build;
