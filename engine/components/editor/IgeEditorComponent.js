import { ige } from "../../instance.js";
import IgeComponent from "../../core/IgeComponent.js";
/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
class IgeEditorComponent extends IgeComponent {
    /**
     * @constructor
     * @param entity The object that the component is added to.
     * @param options The options object that was passed to the component during
     * the call to addComponent.
     */
    constructor(entity, options) {
        super(entity, options);
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
            if (val !== undefined) {
                this._enabled = val;
                return this._entity;
            }
            return this._enabled;
        };
        this.toggle = () => {
            const elem = $("#editorToggle");
            if (elem.hasClass("active")) {
                ige.components.editor.hide();
            }
            else {
                ige.components.editor.show();
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
                ige.components.editor.hideStats();
            }
            else {
                ige.components.editor.showStats();
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
            fetch(url)
                .then((response) => response.text())
                .then(callback);
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
                    this._selectedObject = ige.$(id);
                    this._objectSelected(this._selectedObject);
                }
                else {
                    delete this._selectedObject;
                }
            }
        };
        this._objectSelected = (obj) => {
            if (obj) {
                ige.components.editor.ui.panels.showPanelByInstance(obj);
                this._selectedObjectClassList = ige.getClassDerivedList(obj);
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
                const newObj = ige.newClassInstance(classId);
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
            let self = ige.components.editor, i, watchCount, watchItem, itemName, res, html = "";
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
                ige._sgTreeSelected = this.id;
                ige._currentViewport.drawBounds(true);
                if (this.id !== "ige") {
                    ige._currentViewport.drawBoundsLimitId(this.id);
                }
                else {
                    ige._currentViewport.drawBoundsLimitId("");
                }
                ige.emit("sgTreeSelectionChanged", ige._sgTreeSelected);
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
            if (ige._sgTreeSelected === item.id) {
                elem.className += " selected";
            }
            if (igeConfig.debug._timing) {
                if (ige._timeSpentInTick[item.id]) {
                    timingString = "<span>" + ige._timeSpentInTick[item.id] + "ms</span>";
                    /*if (ige._timeSpentLastTick[item.id]) {
                        if (typeof(ige._timeSpentLastTick[item.id].ms) === 'number') {
                            timingString += ' | LastTick: ' + ige._timeSpentLastTick[item.id].ms;
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
                    ige.addToSgTree(arr[i]);
                }
            }
        };
        this.toggleShowEditor = () => {
            this._showSgTree = !this._showSgTree;
            if (this._showSgTree) {
                // Create the scenegraph tree
                let self = this, elem1 = document.createElement("div"), elem2, canvasBoundingRect;
                canvasBoundingRect = ige._canvasPosition();
                elem1.id = "igeSgTree";
                elem1.style.top = (parseInt(canvasBoundingRect.top) + 5) + "px";
                elem1.style.left = (parseInt(canvasBoundingRect.left) + 5) + "px";
                elem1.style.height = (ige.root._bounds2d.y - 30) + "px";
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
                    ige.editorRotate.enabled(false);
                    if (ige.editorTranslate.enabled()) {
                        ige.editorTranslate.enabled(false);
                        self.log("Editor: Translate mode disabled");
                    }
                    else {
                        ige.editorTranslate.enabled(true);
                        self.log("Editor: Translate mode enabled");
                    }
                });
                editorModeRotate.type = "button";
                editorModeRotate.id = "igeSgEditorRotate";
                editorModeRotate.value = "Rotate";
                editorModeRotate.addEventListener("click", () => {
                    // Disable other modes
                    ige.editorTranslate.enabled(false);
                    if (ige.editorRotate.enabled()) {
                        ige.editorRotate.enabled(false);
                        self.log("Editor: Rotate mode disabled");
                    }
                    else {
                        ige.editorRotate.enabled(true);
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
                ige.addComponent(IgeEditorTranslateComponent);
                ige.addComponent(IgeEditorRotateComponent);
                // Schedule tree updates every second
                ige._sgTreeUpdateInterval = setInterval(() => { self.sgTreeUpdate(); }, 1000);
            }
            else {
                // Kill interval
                clearInterval(ige._sgTreeUpdateInterval);
                let child = document.getElementById("igeSgTree");
                child.parentNode.removeChild(child);
                child = document.getElementById("igeSgConsoleHolder");
                child.parentNode.removeChild(child);
                child = document.getElementById("igeSgEditorRoot");
                child.parentNode.removeChild(child);
                ige.removeComponent("editorTranslate");
                ige.removeComponent("editorRotate");
            }
        };
        this.sgTreeUpdate = () => {
            // Update the scenegraph tree
            document.getElementById("sceneGraph_items").innerHTML = "";
            // Get the scenegraph data
            this.addToSgTree(this.getSceneGraphData(this, true));
        };
        this._showStats = 0;
        this._templateCache = {};
        this._cacheTemplates = true;
        this.ui = {};
        this._interceptMouse = false;
        // @ts-ignore
        const igeRoot = window.igeRoot || "";
        // Hook the input component's keyUp and check for the = symbol... if there, toggle editor
        this._activateKeyHandle = ige.components.input.on("keyUp", (event) => {
            if (event.keyIdentifier === "U+00BB") {
                // = key pressed, toggle the editor
                this.toggle();
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        // Hook the input component's keyUp and check for the - symbol... if there, toggle stats
        this._activateKeyHandle = ige.components.input.on("keyUp", (event) => {
            if (event.keyIdentifier === "U+00BD") {
                // Toggle the stats
                this.toggleStats();
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        // Hook the engine's input system and take over mouse interaction
        this._mouseUpHandle = ige.components.input.on("preMouseUp", (event) => {
            if (this._enabled && this._interceptMouse) {
                this.emit("mouseUp", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this._mouseDownHandle = ige.components.input.on("preMouseDown", (event) => {
            if (this._enabled && this._interceptMouse) {
                this.emit("mouseDown", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this._mouseMoveHandle = ige.components.input.on("preMouseMove", (event) => {
            if (this._enabled && this._interceptMouse) {
                this.emit("mouseMove", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this._contextMenuHandle = ige.components.input.on("preContextMenu", (event) => {
            if (this._enabled && this._interceptMouse) {
                this.emit("contextMenu", event);
                // Return true to stop this event from being emitted by the engine to the scenegraph
                return true;
            }
        });
        this.loadHtml(igeRoot + "engine/components/editor/root.html", (html) => {
            // Add the html
            document.body.insertAdjacentHTML("beforeend", html);
        });
        ige.sync(ige.requireScript, [igeRoot + "engine/components/editor/react/build/static/js/main.min.js", undefined]);
        ige.sync(ige.requireStylesheet, [igeRoot + "engine/components/editor/react/build/static/css/main.min.css"]);
        ige.sync(ige.requireStylesheet, [igeRoot + "engine/components/editor/css/editor.css"]);
        ige.on("syncComplete", () => {
            this.log("Editor init complete");
        });
        // // Load jsRender for HTML template support
        // ige.requireScript(igeRoot + "components/editor/vendor/jsRender.js");
        //
        // // Load jQuery, the editor will use it for DOM manipulation simplicity
        // ige.requireScript(igeRoot + "components/editor/vendor/jquery.2.0.3.min.js");
        //
        // ige.on("allRequireScriptsLoaded", () => {
        // 	// Stop drag-drop of files over the page from doing a redirect and leaving the page
        // 	$(() => {
        // 		$("body")
        // 			.on("dragover", (evt: Event) => {
        // 				evt.preventDefault();
        // 			})
        // 			.on("drop", (evt: Event) => {
        // 				evt.preventDefault();
        // 			});
        // 	});
        //
        // 	// Load editor html into the DOM
        // 	this.loadHtml(igeRoot + "components/editor/root.html", (html) => {
        // 		// Add the html
        // 		$("body").append($(html));
        //
        // 		ige.requireScript(igeRoot + "components/editor/vendor/jsrender-helpers.js");
        //
        // 		// Object mutation observer polyfill
        // 		ige.requireScript(igeRoot + "components/editor/vendor/observe.js");
        //
        // 		// Load plugin styles
        // 		ige.requireStylesheet(igeRoot + "components/editor/vendor/glyphicons/css/halflings.css");
        // 		ige.requireStylesheet(igeRoot + "components/editor/vendor/glyphicons/css/glyphicons.css");
        // 		ige.requireStylesheet(igeRoot + "components/editor/vendor/treeview_simple/css/style.css");
        //
        // 		// Load the editor stylesheet
        // 		ige.requireStylesheet(igeRoot + "components/editor/css/editor.css");
        //
        // 		// Listen for scenegraph tree selection updates
        // 		ige.on("sgTreeSelectionChanged", (objectId) => {
        // 			this._objectSelected(ige.$(objectId));
        // 		});
        //
        // 		// Wait for all required files to finish loading
        // 		ige.on("allRequireScriptsLoaded", () => {
        // 			// Load UI scripts
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/dialogs/dialogs.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/scenegraph/scenegraph.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/menu/menu.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/toolbox/toolbox.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/panels/panels.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/textures/textures.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/textureEditor/textureEditor.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/ui/animationEditor/animationEditor.js");
        //
        // 			// Load jquery plugins
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/vendor/autoback.jquery.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/vendor/tree/tree.jquery.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/vendor/tabs/tabs.jquery.js");
        // 			ige.sync(ige.requireScript, igeRoot + "components/editor/vendor/treeview_simple/treeview_simple.jquery.js");
        //
        // 			ige.on("syncComplete", () => {
        // 				// Observe changes to the engine to update our display
        // 				setInterval(() => {
        // 					// Update the stats counters
        // 					$("#editorFps").html(ige._fps + " fps");
        // 					$("#editorDps").html(ige._dps + " dps");
        // 					$("#editorDpf").html(ige._dpf + " dpf");
        // 					$("#editorUd").html(ige._updateTime + " ud/ms");
        // 					$("#editorRd").html(ige._renderTime + " rd/ms");
        // 					$("#editorTd").html(ige._tickTime + " td/ms");
        // 				}, 1000);
        //
        // 				// Add auto-backing
        // 				$(".backed").autoback();
        //
        // 				// Call finished on all ui instances
        // 				for (const i in this.ui) {
        // 					if (this.ui.hasOwnProperty(i)) {
        // 						if (this.ui[i].ready) {
        // 							this.ui[i].ready();
        // 						}
        // 					}
        // 				}
        //
        // 				// Enable tabs
        // 				$(".tabGroup").tabs();
        //
        // 				// Enable the stats toggle button
        // 				$("#statsToggle").on("click", () => {
        // 					(ige.components.editor as IgeEditorComponent).toggleStats();
        // 				});
        //
        // 				// Enable the editor toggle button
        // 				$("#editorToggle").on("click", () => {
        // 					(ige.components.editor as IgeEditorComponent).toggle();
        // 				});
        // 			}, null, true);
        // 		}, null, true);
        // 	});
        // }, null, true);
        // Set the component as inactive to start with
        this._enabled = false;
        this._show = false;
        // Set object create defaults
        this.objectDefault = {
            "IgeTextureMap": {
                "drawGrid": 100
            }
        };
    }
}
export default IgeEditorComponent;
