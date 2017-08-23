Ant.switchTargetMutex = false;

Ant.makeProxyPromiseOnce = (method, payload, callback) =>
  new Promise((resolve, reject) => {
    window.listenToHostOnce(`render-${method}`, (event, args) => {
      const { payload, error } = args;
      if (error) return reject(error);
      if (callback && (typeof callback) === 'function')
        resolve(callback(payload));
      else
        resolve(payload);
    });
    window.sendToHost('render', {
      method,
      payload,
    });
  });

Ant.makePromiseHostOnce = (method, payload, callback) =>
  new Promise((resolve, reject) => {
    window.listenToHostOnce('main', (event, args) => {
      if (callback && (typeof callback) === 'function')
        resolve(callback(args));
      else
        resolve(args);
    });
    window.sendToHost('main', {
      method,
      payload,
    });
  });

Ant.TargetManager = class extends Common.Object {
  constructor() {
    super();
    this._targets = new Map();
    this._tinyModel = new Map();
    this._cssModel = new Map();
    this._currentPath = null;
    this._currentTarget = null;
    this._currentModel = null;
    this._touchModel = Ant.TouchModel.instance();
  }

  _webSocketConnectionLostCallback(path) {
    if (path && this._targets.get(path)) {
      const { target } = this._targets.get(path);
      Ant.TouchModel.instance().targetRemoved(target);
      SDK.targetManager.removeTarget(target);
      this._targets.delete(path);
    }
  }

  async addNewTarget(path, ws) {
    if (Ant.switchTargetMutex) return null;
    if (this._targets.has(path)) {
      const old = this._targets.get(path);
      this.setCurrent(path);
      return old;
    }

    // mutex block
    Ant.switchTargetMutex = true;

    const createMainConnection = (ws, params) =>
      new SDK.WebSocketConnection(ws, this._webSocketConnectionLostCallback.bind(this, path), params);

    const target = SDK.targetManager.createTarget(path,
      SDK.Target.Capability.DOM | SDK.Target.Capability.Target | SDK.Target.Capability.Browser | SDK.Target.Capability.DeviceEmulation,
      createMainConnection.bind(this, ws), null);

    const tinyModel = new Ant.TinyModel(target);
    this._tinyModel.set(target, tinyModel);
    const cssModel = new SDK.CSSModel(target, tinyModel);
    this._cssModel.set(target, cssModel);

    await this.enableEmulation(target);

    this._targets.set(path, { target, model: tinyModel, cssModel });
    this.setCurrent(path);

    Ant.switchTargetMutex = false;

    return { target, model: tinyModel };
  }

  async enableEmulation(target) {
    const { width, height } = await Ant.makePromiseHostOnce('getWebviewWidthHeight');

    this._touchModel.targetAdded(target);
    this._touchModel.setTouchEnabled(true, true);

    const emulationAgent = target.emulationAgent();

    // so sad, we have to try again to override.
    emulationAgent.invoke_setDeviceMetricsOverride({
      width, height: height + 1, deviceScaleFactor: 0, mobile: true, fitWindow: false,
    }, () => {
      emulationAgent.invoke_setDeviceMetricsOverride({
        width, height: height, deviceScaleFactor: 0, mobile: true, fitWindow: false,
      });
    });
  }

  setCurrent(path) {
    const { target, model } = this._targets.get(path);
    this._currentPath = path;
    this._currentTarget = target;
    this._currentModel = model;
  }

  getCurrentTarget() {
    return this._currentTarget;
  }

  getCurrentModel() {
    return this._currentModel;
  }

  getCurrentPath() {
    return this._currentPath;
  }

  getCssModel(target) {
    return this._cssModel.get(target);
  }

  getTinyModel(target) {
    return this._tinyModel.get(target);
  }

  getCurrent() {
    return {
      path: this._currentPath,
      model: this._currentModel,
      target: this._currentTarget,
    };
  }

  async switchTarget() {
    try {
      Elements.inspectElementModeController.stopInspection();
      const { path, ws } = await Ant.makeProxyPromiseOnce('initOnce');
      const ret = await Ant.targetManager.addNewTarget(path, ws);
      if (ret)
        this.dispatchEventToListeners(Ant.TargetManager.Events.switchTarget);
    } catch (e) { }
  }

  addModel(target, modelClass, model) {
    SDK.targetManager.modelAdded(target, modelClass, model);
  }

  getWorkerTarget() {
    return SDK.targetManager.mainTarget();
  }

  has(path) {
    return this._targets.has(path);
  }

  get(path) {
    return this._targets.get(path);
  }
};

Ant.TargetManager.Events = {
  switchTarget: Symbol('ant-switchTarget'),
};

Ant.targetManager = new Ant.TargetManager();
