import { igeCoreConfig } from "./CoreConfig.js";
export const igeLoader = function (igeRoot = "./") {
    // Load the engine stylesheet
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.type = "text/css";
    css.media = "all";
    css.href = igeRoot + "css/ige.css";
    document.getElementsByTagName("head")[0].appendChild(css);
    class IgeLoader {
        constructor() {
            this._coreList = [];
            this._clientList = [];
            this._loadingCount = 0;
            this.coreConfigReady();
        }
        coreConfigReady() {
            if (typeof igeCoreConfig === "undefined") {
                throw "ERROR READING igeCoreConfig object - was it specified in CoreConfig.js?";
            }
            // Load the client config
            const ccScript = document.createElement("script");
            ccScript.type = "module";
            ccScript.src = "./ClientConfig.js";
            ccScript.onload = () => {
                this.clientConfigReady();
            };
            ccScript.addEventListener("error", function () {
                throw "ERROR LOADING ClientConfig.js - does it exist?";
            }, true);
            document.getElementsByTagName("head")[0].appendChild(ccScript);
        }
        clientConfigReady() {
            // Add the two array items into a single array
            this._coreList = igeCoreConfig.include;
            this._clientList = igeClientConfig.include;
            this._fileList = [];
            for (i = 0; i < this._coreList.length; i++) {
                // Check that the file should be loaded on the client
                if (this._coreList[i][0].indexOf("c") > -1) {
                    this._fileList.push(igeRoot + this._coreList[i][2]);
                }
            }
            for (i = 0; i < this._clientList.length; i++) {
                this._fileList.push(this._clientList[i]);
            }
            this.loadNext();
        }
        loadNext() {
            const url = this._fileList.shift(), script = document.createElement("script"), self = this;
            if (url !== undefined) {
                script.src = url;
                script.onload = function () {
                    self.loadNext();
                };
                script.addEventListener("error", function () {
                    throw "ERROR LOADING " + url + " - does it exist?";
                }, true);
                document.getElementsByTagName("head")[0].appendChild(script);
            }
        }
    }
    return new IgeLoader();
};
