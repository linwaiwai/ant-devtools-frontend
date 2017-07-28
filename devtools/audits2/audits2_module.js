Audits2.Audits2Panel=class extends UI.Panel{constructor(){super('audits2');this.contentElement.classList.add('vbox');this.contentElement.appendChild(createTextButton(Common.UIString('Start'),this._start.bind(this)));this.contentElement.appendChild(createTextButton(Common.UIString('Stop'),this._stop.bind(this)));this._resultElement=this.contentElement.createChild('div','overflow-auto');}
_start(){SDK.targetManager.interceptMainConnection(this._dispatchProtocolMessage.bind(this)).then(rawConnection=>{this._rawConnection=rawConnection;this._send('start').then(result=>{var section=new Components.ObjectPropertiesSection(SDK.RemoteObject.fromLocalObject(result),Common.UIString('Audit Results'));this._resultElement.appendChild(section.element);this._stop();});});}
_dispatchProtocolMessage(message){this._send('dispatchProtocolMessage',{message:message});}
_stop(){this._send('stop').then(()=>{this._rawConnection.disconnect();this._backend.dispose();delete this._backend;delete this._backendPromise;});}
_send(method,params){if(!this._backendPromise){this._backendPromise=Services.serviceManager.createAppService('audits2_worker','Audits2Service',false).then(backend=>{this._backend=backend;this._backend.on('sendProtocolMessage',result=>this._rawConnection.sendMessage(result.message));});}
return this._backendPromise.then(()=>this._backend?this._backend.send(method,params):undefined);}};;