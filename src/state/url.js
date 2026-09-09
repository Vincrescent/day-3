// URL state manager — deep linking & shareable state

export class URLState {
  constructor() {
    this._params = new URLSearchParams(window.location.search);
  }

  get(key) {
    return this._params.get(key);
  }

  /** Read initial state from URL */
  getInitialState() {
    return {
      focus: this._params.get('focus'),
      mode: this._params.get('mode'),
      date: this._params.get('date'),
      speed: this._params.get('speed') ? parseFloat(this._params.get('speed')) : null,
      orbits: this._params.get('orbits'),
    };
  }

  /** Update URL with current state (without page reload) */
  update(state) {
    const params = new URLSearchParams();
    if (state.focus) params.set('focus', state.focus);
    if (state.mode && state.mode !== 'overview') params.set('mode', state.mode);
    if (state.date) params.set('date', state.date);
    if (state.speed && state.speed !== 1) params.set('speed', String(state.speed));
    
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  /** Get shareable URL */
  getShareableURL(state) {
    const params = new URLSearchParams();
    if (state.focus) params.set('focus', state.focus);
    if (state.mode) params.set('mode', state.mode);
    if (state.date) params.set('date', state.date);
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? '?' + qs : ''}`;
  }
}
