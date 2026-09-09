// Simulation time controller — handles time travel, speed, play/pause

export class TimeController {
  constructor() {
    this.realTime = Date.now();
    this.simTime = Date.now();
    this.speed = 1;         // 1x = real-time
    this.playing = true;
    this.lastTick = performance.now();
    this._listeners = [];
  }

  /** Get current simulation time (ms since epoch) */
  now() {
    return this.simTime;
  }

  /** Get formatted sim date string */
  dateString() {
    return new Date(this.simTime).toISOString().slice(0, 10);
  }

  /** Get formatted sim datetime string */
  dateTimeString() {
    const d = new Date(this.simTime);
    return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }

  /** Set simulation to a specific date */
  setDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      this.simTime = d.getTime();
      this._notify();
    }
  }

  /** Set simulation speed multiplier */
  setSpeed(s) {
    this.speed = s;
    this._notify();
  }

  /** Toggle play/pause */
  togglePlay() {
    this.playing = !this.playing;
    this._notify();
  }

  /** Set playing state */
  setPlaying(v) {
    this.playing = v;
    this._notify();
  }

  /** Step forward by specified days */
  stepForward(days = 1) {
    this.simTime += days * 86400000;
    this._notify();
  }

  /** Step backward by specified days */
  stepBackward(days = 1) {
    this.simTime -= days * 86400000;
    this._notify();
  }

  /** Reset to real-time now */
  resetToNow() {
    this.simTime = Date.now();
    this.speed = 1;
    this.playing = true;
    this._notify();
  }

  /** Called each animation frame */
  tick(timestamp) {
    const dt = Math.min(timestamp - this.lastTick, 100); // cap at 100ms
    this.lastTick = timestamp;
    this.realTime = Date.now();
    if (this.playing) {
      this.simTime += dt * this.speed;
    }
  }

  /** Subscribe to state changes */
  onChange(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _notify() {
    for (const fn of this._listeners) fn(this);
  }

  /** Get speed label */
  speedLabel() {
    if (this.speed === 0) return 'PAUSED';
    if (this.speed < 1) return `${this.speed}x (slow)`;
    if (this.speed >= 10000) return `${(this.speed/1000).toFixed(0)}Kx`;
    return `${this.speed}x`;
  }
}
