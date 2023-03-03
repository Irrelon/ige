import IgeEventingClass from "../../core/IgeEventingClass.js";
/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
class IgeEditorComponent extends IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeEditorComponent";
        this.componentId = "editor";
        this.interceptMouse = (val) => {
            this._interceptMouse = val;
        };
        /**
         * Gets / sets the enabled flag. If set to true,
         * operations will be processed. If false, no operations will
         * occur.
         * @param {Boolean=} val
         * @return {*}
         */
        this.enabled = (val) => {
            const self = this;
            if (val !== undefined) {
                this._enabled = val;
                return this._entity;
            }
            return this._enabled;
        };
        this.toggle = () => {
            const elem = $("#editorToggle");
            if (elem.hasClass("active")) {
                this._ige.editor.hide();
            }
            else {
                this._ige.editor.show();
            }
        };
        this.show = () => {
            this.enabled(true);
            this._show = true;
            $("#editorToggle")
                .html("Editor On")
                .removeClass("active")
                .addClass("active");
            $(".editorElem.toggleHide").addClass("shown");
        };
        this.hide = () => {
            this.enabled(false);
            this._show = false;
            $("#editorToggle")
                .html("Editor Off")
                .removeClass("active");
            $(".editorElem.toggleHide").removeClass("shown");
        };
        this.toggleStats = () => {
            const elem = $("#statsToggle");
            if (elem.hasClass("active")) {
                this._ige.editor.hideStats();
            }
            else {
                this._ige.editor.showStats();
            }
        };
        this.showStats = () => {
            $("#statsToggle")
                .html("Stats On")
                .removeClass("active")
                .addClass("active");
            $(".counter").show();
        };
        this.hideStats = () => {
            $("#statsToggle")
                .html("Stats Off")
                .removeClass("active");
            $(".counter").hide();
        };
        this.loadHtml = (url, callback) => {
            $.ajax({
                url,
                "success": callback,
                "dataType": "html"
            });
        };
        this.template = (url, callback) => {
            const self = this;
            if (!this._cacheTemplates || !this._templateCache[url]) {
                this.log("Loading template data from: " + url);
                $.ajax(url, {
                    "async": true,
                    "dataType": "text",
                    "complete"(xhr, status) {
                        if (status === "success") {
                            // Convert the text into a jsRender template object
                            const template = jsviews.templates(xhr.responseText);
                            if (self._cacheTemplates) {
                                self._templateCache[url] = template;
                            }
                            if (callback) {
                                callback(false, template);
                            }
                        }
                        else {
                            if (callback) {
                                callback(true, status);
                            }
                        }
                    }
                });
            }
            else {
                if (callback) {
                    callback(false, this._templateCache[url]);
                }
            }
        };
        this.renderTemplate = (url, data, callback) => {
            this.template(url, (err, template) => {
                if (!err) {
                    callback(err, $($.parseHTML(template.render(data))));
                }
                else {
                    callback(err);
                }
            });
        };
        this.selectObject = (id) => {
            if (id !== undefined) {
                if (id) {
                    this._selectedObject = this._ige.$(id);
                    this._objectSelected(this._selectedObject);
                }
                else {
                    delete this._selectedObject;
                }
            }
        };
        this._objectSelected = (obj) => {
            if (obj) {
                this._ige.editor.ui.panels.showPanelByInstance(obj);
                this._selectedObjectClassList = this._ige.getClassDerivedList(obj);
                // Update active-for selectors
                $("[data-active-for]")
                    .removeClass("disabled")
                    .addClass("disabled");
                let classArr = this._selectedObjectClassList, i;
                for (i = 0; i < classArr.length; i++) {
                    $("[data-active-for~=\"" + classArr[i] + "\"]")
                        .removeClass("disabled");
                }
                this.emit("selectedObject", obj.id());
            }
        };
        this.destroySelected = () => {
            if (this._selectedObject) {
                this._selectedObject.destroy();
                this.selectObject(null);
            }
        };
        this.createObject = (classId, select) => {
            if (this._selectedObject) {
                const newObj = this._ige.newClassInstance(classId);
                newObj.mount(this._selectedObject);
                this.ui.scenegraph.updateSceneGraph();
                if (select) {
                    this.selectObject(newObj.id());
                    this.ui.toolbox.select("toolSelect");
                }
                // Set some object defaults if there are any
                if (this.objectDefault[classId]) {
                    for (const i in this.objectDefault[classId]) {
                        if (this.objectDefault[classId].hasOwnProperty(i)) {
                            if (this.objectDefault[classId][i] instanceof Array) {
                                newObj[i].apply(newObj, this.objectDefault[classId][i]);
                            }
                            else {
                                newObj[i].call(newObj, this.objectDefault[classId][i]);
                            }
                        }
                    }
                }
            }
        };
        /**
         * Updates the stats HTML overlay with the latest data.
         * @private
         */
        this._statsTick = () => {
            let self = this._ige.editor, i, watchCount, watchItem, itemName, res, html = "";
            // Check if the stats output is enabled
            if (self._showStats && !self._statsPauseUpdate) {
                switch (self._showStats) {
                    case 1:
                        /*if (self._watch && self._watch.length) {
                                watchCount = self._watch.length;
        
                                for (i = 0; i < watchCount; i++) {
                                    watchItem = self._watch[i];
        
                                    if (typeof(watchItem) === 'string') {
                                        itemName = watchItem;
                                        try {
                                            eval('res = ' + watchItem);
                                        } catch (err) {
                                            res = '<span style="color:#ff0000;">' + err + '</span>';
                                        }
                                    } else {
                                        itemName = watchItem.name;
                                        res = watchItem.value;
                                    }
                                    html += i + ' (<a href="javascript:ige.watchStop(' + i + '); ige._statsPauseUpdate = false;" style="color:#cccccc;" onmouseover="ige._statsPauseUpdate = true;" onmouseout="ige._statsPauseUpdate = false;">Remove</a>): <span style="color:#7aff80">' + itemName + '</span>: <span style="color:#00c6ff">' + res + '</span><br />';
                                }
                                html += '<br />';
                            }*/
                        /*html += '<div class="sgButton" title="Show / Hide SceneGraph Tree" onmouseup="ige.toggleShowEditor();">Scene</div> <span class="met" title="Frames Per Second">' + self._fps + ' fps</span> <span class="met" title="Draws Per Second">' + self._dps + ' dps</span> <span class="met" title="Draws Per Frame">' + self._dpf + ' dpt</span> <span class="met" title="Update Delta (How Long the Last Update Took)">' + self._updateTime + ' ms\/ud</span> <span class="met" title="Render Delta (How Long the Last Render Took)">' + self._renderTime + ' ms\/rd</span> <span class="met" title="Tick Delta (How Long the Last Tick Took)">' + self._tickTime + ' ms\/pt</span>';
        
                            if (self.network) {
                                // Add the network latency too
                                html += ' <span class="met" title="Network Latency (Time From Server to This Client)">' + self.network._latency + ' ms\/net</span>';
                            }
        
                            self._statsDiv.innerHTML = html;*/
                        break;
                }
            }
        };
        this.addToSgTree = (item) => {
            let elem = document.createElement("li"), arr, arrCount, i, mouseUp, dblClick, timingString;
            mouseUp = function (event) {
                event.stopPropagation();
                const elems = document.getElementsByClassName("sgItem selected");
                for (i = 0; i < elems.length; i++) {
                    elems[i].className = "sgItem";
                }
                this.className += " selected";
                this._ige._sgTreeSelected = this.id;
                this._ige._currentViewport.drawBounds(true);
                if (this.id !== "ige") {
                    this._ige._currentViewport.drawBoundsLimitId(this.id);
                }
                else {
                    this._ige._currentViewport.drawBoundsLimitId("");
                }
                this._ige.emit("sgTreeSelectionChanged", this._ige._sgTreeSelected);
            };
            dblClick = function (event) {
                event.stopPropagation();
            };
            //elem.addEventListener('mouseover', mouseOver, false);
            //elem.addEventListener('mouseout', mouseOut, false);
            elem.addEventListener("mouseup", mouseUp, false);
            elem.addEventListener("dblclick", dblClick, false);
            elem.id = item.id;
            elem.innerHTML = item.text;
            elem.className = "sgItem";
            if (this._ige._sgTreeSelected === item.id) {
                elem.className += " selected";
            }
            if (igeConfig.debug._timing) {
                if (this._ige._timeSpentInTick[item.id]) {
                    timingString = "<span>" + this._ige._timeSpentInTick[item.id] + "ms</span>";
                    /*if (this._ige._timeSpentLastTick[item.id]) {
                        if (typeof(this._ige._timeSpentLastTick[item.id].ms) === 'number') {
                            timingString += ' | LastTick: ' + this._ige._timeSpentLastTick[item.id].ms;
                        }
                    }*/
                    elem.innerHTML += " " + timingString;
                }
            }
            document.getElementById(item.parentId + "_items").appendChild(elem);
            if (item.items) {
                // Create a ul inside the li
                elem = document.createElement("ul");
                elem.id = item.id + "_items";
                document.getElementById(item.id).appendChild(elem);
                arr = item.items;
                arrCount = arr.length;
                for (i = 0; i < arrCount; i++) {
                    this._ige.addToSgTree(arr[i]);
                }
            }
        };
        this.toggleShowEditor = () => {
            this._showSgTree = !this._showSgTree;
            if (this._showSgTree) {
                // Create the scenegraph tree
                let self = this, elem1 = document.createElement("div"), elem2, canvasBoundingRect;
                canvasBoundingRect = this._ige._canvasPosition();
                elem1.id = "igeSgTree";
                elem1.style.top = (parseInt(canvasBoundingRect.top) + 5) + "px";
                elem1.style.left = (parseInt(canvasBoundingRect.left) + 5) + "px";
                elem1.style.height = (this._ige.root._bounds2d.y - 30) + "px";
                elem1.style.overflow = "auto";
                elem1.addEventListener("mousemove", (event) => {
                    event.stopPropagation();
                });
                elem1.addEventListener("mouseup", (event) => {
                    event.stopPropagation();
                });
                elem1.addEventListener("mousedown", (event) => {
                    event.stopPropagation();
                });
                elem2 = document.createElement("ul");
                elem2.id = "sceneGraph_items";
                elem1.appendChild(elem2);
                document.body.appendChild(elem1);
                // Create the IGE console
                const consoleHolderElem = document.createElement("div"), consoleElem = document.createElement("input"), classChainElem = document.createElement("div"), dociFrame = document.createElement("iframe");
                consoleHolderElem.id = "igeSgConsoleHolder";
                consoleHolderElem.innerHTML = "<div><b>Console</b>: Double-Click a SceneGraph Object to Script it Here</div>";
                consoleElem.type = "text";
                consoleElem.id = "igeSgConsole";
                classChainElem.id = "igeSgItemClassChain";
                dociFrame.id = "igeSgDocPage";
                dociFrame.name = "igeSgDocPage";
                consoleHolderElem.appendChild(consoleElem);
                consoleHolderElem.appendChild(classChainElem);
                consoleHolderElem.appendChild(dociFrame);
                document.body.appendChild(consoleHolderElem);
                this.sgTreeUpdate();
                // Now add a refresh button to the scene button
                const button = document.createElement("input");
                button.type = "button";
                button.id = "igeSgRefreshTree";
                button.style.position = "absolute";
                button.style.top = "0px";
                button.style.right = "0px";
                button.value = "Refresh";
                button.addEventListener("click", () => {
                    self.sgTreeUpdate();
                }, false);
                document.getElementById("igeSgTree").appendChild(button);
                // Add basic editor controls
                const editorRoot = document.createElement("div"), editorModeTranslate = document.createElement("input"), editorModeRotate = document.createElement("input"), editorModeScale = document.createElement("input"), editorStatus = document.createElement("span");
                editorRoot.id = "igeSgEditorRoot";
                editorStatus.id = "igeSgEditorStatus";
                editorModeTranslate.type = "button";
                editorModeTranslate.id = "igeSgEditorTranslate";
                editorModeTranslate.value = "Translate";
                editorModeTranslate.addEventListener("click", () => {
                    // Disable other modes
                    this._ige.editorRotate.enabled(false);
                    if (this._ige.editorTranslate.enabled()) {
                        this._ige.editorTranslate.enabled(false);
                        self.log("Editor: Translate mode disabled");
                    }
                    else {
                        this._ige.editorTranslate.enabled(true);
                        self.log("Editor: Translate mode enabled");
                    }
                });
                editorModeRotate.type = "button";
                editorModeRotate.id = "igeSgEditorRotate";
                editorModeRotate.value = "Rotate";
                editorModeRotate.addEventListener("click", () => {
                    // Disable other modes
                    this._ige.editorTranslate.enabled(false);
                    if (this._ige.editorRotate.enabled()) {
                        this._ige.editorRotate.enabled(false);
                        self.log("Editor: Rotate mode disabled");
                    }
                    else {
                        this._ige.editorRotate.enabled(true);
                        self.log("Editor: Rotate mode enabled");
                    }
                });
                editorModeScale.type = "button";
                editorModeScale.id = "igeSgEditorScale";
                editorModeScale.value = "Scale";
                editorRoot.appendChild(editorModeTranslate);
                editorRoot.appendChild(editorModeRotate);
                editorRoot.appendChild(editorModeScale);
                editorRoot.appendChild(editorStatus);
                document.body.appendChild(editorRoot);
                // Add the translate component to the ige instance
                this._ige.addComponent(IgeEditorTranslateComponent);
                this._ige.addComponent(IgeEditorRotateComponent);
                // Schedule tree updates every second
                this._ige._sgTreeUpdateInterval = setInterval(() => { self.sgTreeUpdate(); }, 1000);
            }
            else {
                // Kill interval
                clearInterval(this._ige._sgTreeUpdateInterval);
                let child = document.getElementById("igeSgTree");
                child.parentNode.removeChild(child);
                child = document.getElementById("igeSgConsoleHolder");
                child.parentNode.removeChild(child);
                child = document.getElementById("igeSgEditorRoot");
                child.parentNode.removeChild(child);
                this._ige.removeComponent("editorTranslate");
                this._ige.removeComponent("editorRotate");
            }
        };
        this.sgTreeUpdate = () => {
            // Update the scenegraph tree
            document.getElementById("sceneGraph_items").innerHTML = "";
            // Get the scenegraph data
            this.addToSgTree(this.getSceneGraphData(this, true));
        };
    }
    /**
     * @constructor
     * @param {IgeObject} entity The object that the component is added to.
     * @param {Object=} options The options object that was passed to the component during
     * the call to addComponent.
     */
    init(entity, options) {
        const self = this;
        this._entity = entity;
        this._options = options;
        this._showStats = 0;
        this._templateCache = {};
        this._cacheTemplates = true;
        this.ui = {};
        this._interceptMouse = false;
        // Hook the input component's keyUp and check for the = symbol... if there, toggle editor
        this._activateKeyHandle = this._ige.components.input.on("keyUp", (event) => {
            if (event.keyIdentifier === "U+00BB") {
                // = key pressed, toggle the editor
                self.toggle();
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        // Hook the input component's keyUp and check for the - symbol... if there, toggle stats
        this._activateKeyHandle = this._ige.components.input.on("keyUp", (event) => {
            if (event.keyIdentifier === "U+00BD") {
                // Toggle the stats
                self.toggleStats();
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        // Hook the engine's input system and take over mouse interaction
        this._mouseUpHandle = this._ige.components.input.on("preMouseUp", (event) => {
            if (self._enabled && self._interceptMouse) {
                self.emit("mouseUp", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this._mouseDownHandle = this._ige.components.input.on("preMouseDown", (event) => {
            if (self._enabled && self._interceptMouse) {
                self.emit("mouseDown", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this._mouseMoveHandle = this._ige.components.input.on("preMouseMove", (event) => {
            if (self._enabled && self._interceptMouse) {
                self.emit("mouseMove", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this._contextMenuHandle = this._ige.components.input.on("preContextMenu", (event) => {
            if (self._enabled && self._interceptMouse) {
                self.emit("contextMenu", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        // Load jsRender for HTML template support
        this._ige.requireScript(igeRoot + "components/editor/vendor/jsRender.js");
        // Load jQuery, the editor will use it for DOM manipulation simplicity
        this._ige.requireScript(igeRoot + "components/editor/vendor/jquery.2.0.3.min.js");
        this._ige.on("allRequireScriptsLoaded", () => {
            // Stop drag-drop of files over the page from doing a redirect and leaving the page
            $(() => {
                $("body")
                    .on("dragover", (e) => {
                    e.preventDefault();
                })
                    .on("drop", (e) => {
                    e.preventDefault();
                });
            });
            // Load editor html into the DOM
            self.loadHtml(igeRoot + "components/editor/root.html", (html) => {
                // Add the html
                $("body").append($(html));
                this._ige.requireScript(igeRoot + "components/editor/vendor/jsrender-helpers.js");
                // Object mutation observer polyfill
                this._ige.requireScript(igeRoot + "components/editor/vendor/observe.js");
                // Load plugin styles
                this._ige.requireStylesheet(igeRoot + "components/editor/vendor/glyphicons/css/halflings.css");
                this._ige.requireStylesheet(igeRoot + "components/editor/vendor/glyphicons/css/glyphicons.css");
                this._ige.requireStylesheet(igeRoot + "components/editor/vendor/treeview_simple/css/style.css");
                // Load the editor stylesheet
                this._ige.requireStylesheet(igeRoot + "components/editor/css/editor.css");
                // Listen for scenegraph tree selection updates
                this._ige.on("sgTreeSelectionChanged", (objectId) => {
                    self._objectSelected(this._ige.$(objectId));
                });
                // Wait for all required files to finish loading
                this._ige.on("allRequireScriptsLoaded", () => {
                    // Load UI scripts
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/dialogs/dialogs.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/scenegraph/scenegraph.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/menu/menu.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/toolbox/toolbox.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/panels/panels.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/textures/textures.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/textureEditor/textureEditor.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/ui/animationEditor/animationEditor.js");
                    // Load jquery plugins
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/vendor/autoback.jquery.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/vendor/tree/tree.jquery.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/vendor/tabs/tabs.jquery.js");
                    this._ige.sync(this._ige.requireScript, igeRoot + "components/editor/vendor/treeview_simple/treeview_simple.jquery.js");
                    this._ige.on("syncComplete", () => {
                        // Observe changes to the engine to update our display
                        setInterval(() => {
                            // Update the stats counters
                            $("#editorFps").html(this._ige._fps + " fps");
                            $("#editorDps").html(this._ige._dps + " dps");
                            $("#editorDpf").html(this._ige._dpf + " dpf");
                            $("#editorUd").html(this._ige._updateTime + " ud/ms");
                            $("#editorRd").html(this._ige._renderTime + " rd/ms");
                            $("#editorTd").html(this._ige._tickTime + " td/ms");
                        }, 1000);
                        // Add auto-backing
                        $(".backed").autoback();
                        // Call finished on all ui instances
                        for (const i in self.ui) {
                            if (self.ui.hasOwnProperty(i)) {
                                if (self.ui[i].ready) {
                                    self.ui[i].ready();
                                }
                            }
                        }
                        // Enable tabs
                        $(".tabGroup").tabs();
                        // Enable the stats toggle button
                        $("#statsToggle").on("click", () => {
                            this._ige.editor.toggleStats();
                        });
                        // Enable the editor toggle button
                        $("#editorToggle").on("click", () => {
                            this._ige.editor.toggle();
                        });
                    }, null, true);
                }, null, true);
            });
        }, null, true);
        // Set the component to inactive to start with
        this._enabled = false;
        this._show = false;
        // Set object create defaults
        this.objectDefault = {
            "IgeTextureMap": {
                "drawGrid": 100
            }
        };
        this.log("Init complete");
    }
}
export default IgeEditorComponent;
