import { set as pathSet } from "@irrelon/path";
export class IgeStats {
    _start = {};
    _duration = {};
    _lastDuration = {};
    start(classId, objId, funcName, statType) {
        const key = [classId, objId, funcName, statType].filter((keyPart) => keyPart !== "").join(".");
        if (this._start[key]) {
            return this._start[key];
        }
        return this._start[key] = new Date().getTime();
    }
    end(classId, objId, funcName, statType, cumulative = false) {
        const key = [classId, objId, funcName, statType].filter((keyPart) => keyPart !== "").join(".");
        if (!this._start[key]) {
            return 0;
        }
        const delta = new Date().getTime() - this._start[key];
        if (cumulative) {
            return this._duration[key] = this._duration[key] += delta;
        }
        return this._duration[key] = this._duration[key] = delta;
    }
    // Called by the engine at the end of the app loop to reset the
    // values. We only want to capture timing per loop.
    cutOff() {
        this._start = {};
        this._lastDuration = this._duration;
        this._duration = {};
    }
    toObject(threshold = -1) {
        const data = {};
        Object.entries(this._lastDuration).forEach(([key, val]) => {
            if (val < threshold)
                return;
            pathSet(data, key, val);
        });
        return data;
    }
}
