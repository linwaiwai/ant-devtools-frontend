Ant.Events = class {
  constructor() {
    this._events = new Map();
  }

  setEvent(name, callback) {
    const methods = this._events.get(name) || [];
    methods.push(callback);
    this._events.set(name, methods);
  }

  doEvent(name, args) {
    const methods = this._events.get(name) || [];
    async function doPromise() {
      for (const method of methods) {
        await new Promise((resolve) => {
          resolve(method(args));
        })
      }
    }
    doPromise();
  }

  static addEventListener(name, callback) {
    events.setEvent(name, callback);
  }

  static dispatchEvent(name, args) {
    events.doEvent(name, args);
  }
}

const events = new Ant.Events();

Ant.Events.addEventListener('console.clear', () => {
  console.log('console.clear');
  window.sendToHost('main', { method: 'console.clear' });
});
