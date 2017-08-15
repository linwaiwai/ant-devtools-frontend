let mainTinyModel;
const win = window;

Ant.AxmlPanel = class extends Elements.ElementsPanel {
  constructor() {
    super('axml');

    this.registerRequiredCSS('elements/elementsTreeOutline.css');
    Ant.targetManager.addEventListener(
      Ant.TargetManager.Events.switchTarget, this.requestTargetWS, this);
    this.requestTargetWS();
  }

  targetAdded(target, path) {
    var domModel = Ant.TinyModel.fromTarget(target);
    if (!path) return;
    if (mainTinyModel)
      this.modelRemoved(mainTinyModel);
    // SDK.targetManager.unobserveModels(Ant.TinyModel, this);
    // SDK.targetManager._modelRemoved(target, SDK.DOMModel, this);
    mainTinyModel = domModel;

    var treeOutline = new Ant.ElementsTreeOutline(domModel, true, true);
    treeOutline.setWordWrap(Common.moduleSetting('domWordWrap').get());
    treeOutline.wireToDOMModel();
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
    new Elements.ElementsTreeElementHighlighter(treeOutline);
    this._treeOutlines = [treeOutline];
    domModel[Elements.ElementsTreeOutline._treeOutlineSymbol] = treeOutline;

    // Perform attach if necessary.
    if (this.isShowing())
      this.wasShown();
  }

  targetRemoved(target) {
    var domModel = Ant.TinyModel.fromTarget(target);
    if (!domModel)
      return;

    /*
    var treeOutline = Ant.ElementsTreeOutline.forDOMModel(mainTinyModel);
    treeOutline.unwireFromDOMModel();
    this._treeOutlines.remove(treeOutline);
    treeOutline.element.remove();
    */
  }

  modelRemoved(domModel) {
    var treeOutline = Elements.ElementsTreeOutline.forDOMModel(domModel);
    if (!treeOutline) return;
    treeOutline.unwireFromDOMModel();
    this._treeOutlines.remove(treeOutline);
    /*
    var header = this._treeOutlineHeaders.get(treeOutline);
    if (header)
      header.remove();
    this._treeOutlineHeaders.delete(treeOutline);
    */
    treeOutline.element.remove();
  }

  modelAdded(domModel, path, target) {
    if (!path) return;
    if (mainTinyModel)
      this.modelRemoved(mainTinyModel);
    // SDK.targetManager.unobserveModels(Ant.TinyModel, this);
    // SDK.targetManager._modelRemoved(target, SDK.DOMModel, this);
    mainTinyModel = domModel;
    var treeOutline = new Ant.ElementsTreeOutline(domModel, true, true);
    treeOutline.setWordWrap(Common.moduleSetting('domWordWrap').get());
    treeOutline.wireToDOMModel();
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.SelectedNodeChanged, this._selectedNodeChanged, this);
    treeOutline.addEventListener(
        Elements.ElementsTreeOutline.Events.ElementsTreeUpdated, this._updateBreadcrumbIfNeeded, this);
    new Elements.ElementsTreeElementHighlighter(treeOutline);
    this._treeOutlines = [treeOutline];
    if (domModel.target().parentTarget()) {
      this._treeOutlineHeaders.set(treeOutline, createElementWithClass('div', 'elements-tree-header'));
      this._targetNameChanged(domModel.target());
    }
    // Perform attach if necessary.
    if (this.isShowing())
      this.wasShown();
  }

  async requestTargetWS() {
    const current = Ant.targetManager.getCurrent();
    if (!current.model || !current.target || !current.path) {
      // console.log('so sad for this, try wait!');
      return;
    }
    const { path, model, target, } = current;
    this._target = target;
    this._tinyModel = model;
    this.targetAdded(target, path);

    // SDK.targetManager.modelAdded(this._target, Ant.TinyModel, model);
    // SDK.targetManager.observeModels(Ant.TinyModel, this);
    SDK.targetManager.addModelListener(
      Ant.TinyModel, SDK.DOMModel.Events.DocumentUpdated, this._documentUpdatedEvent, this);

    await model.requestDocumentPromise();
  }

    /**
   * @param {!SDK.DOMModel} domModel
   * @param {?SDK.DOMDocument} inspectedRootDocument
   */
  _documentUpdated(domModel, inspectedRootDocument) {
    this._reset();
    this.searchCanceled();

    var treeOutline = Ant.ElementsTreeOutline.forDOMModel(domModel);
    treeOutline.rootDOMNode = inspectedRootDocument;

    if (!inspectedRootDocument) {
      if (this.isShowing())
        domModel.requestDocument();
      return;
    }

    this._hasNonDefaultSelectedNode = false;
    Components.domBreakpointsSidebarPane.restoreBreakpoints(inspectedRootDocument);

    if (this._omitDefaultSelection)
      return;

    var savedSelectedNodeOnReset = this._selectedNodeOnReset;
    restoreNode.call(this, domModel, this._selectedNodeOnReset);

    /**
     * @param {!SDK.DOMModel} domModel
     * @param {?SDK.DOMNode} staleNode
     * @this {Elements.ElementsPanel}
     */
    function restoreNode(domModel, staleNode) {
      var nodePath = staleNode ? staleNode.path() : null;
      if (!nodePath) {
        onNodeRestored.call(this, null);
        return;
      }
      domModel.pushNodeByPathToFrontend(nodePath, onNodeRestored.bind(this));
    }

    /**
     * @param {?Protocol.DOM.NodeId} restoredNodeId
     * @this {Elements.ElementsPanel}
     */
    function onNodeRestored(restoredNodeId) {
      if (savedSelectedNodeOnReset !== this._selectedNodeOnReset)
        return;
      var node = restoredNodeId ? domModel.nodeForId(restoredNodeId) : null;
      if (!node) {
        var inspectedDocument = domModel.existingDocument();
        node = inspectedDocument ? inspectedDocument.body || inspectedDocument.documentElement : null;
      }
      this._setDefaultSelectedNode(node);
      this._lastSelectedNodeSelectedForTest();
    }
  }
};
