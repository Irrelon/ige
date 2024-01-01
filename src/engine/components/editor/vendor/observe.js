// Copyright 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function(global) {
  'use strict';

  var PROP_ADD_TYPE = 'add';
  var PROP_UPDATE_TYPE = 'update';
  var PROP_RECONFIGURE_TYPE = 'reconfigure';
  var PROP_DELETE_TYPE = 'delete';
  var ARRAY_SPLICE_TYPE = 'splice';

  // Detect and do basic sanity checking on Object/Array.observe.
  function detectObjectObserve() {
    if (typeof Object.observe !== 'function' ||
        typeof Array.observe !== 'function') {
      return false;
    }

    var records = [];

    function callback(recs) {
      records = recs;
    }

    var test = {};
    Object.observe(test, callback);
    test.id = 1;
    test.id = 2;
    delete test.id;
    Object.deliverChangeRecords(callback);
    if (records.length !== 3)
      return false;

    // TODO(rafaelw): Remove this when new change record type names make it to
    // chrome release.
    if (records[0].type == 'new' &&
        records[1].type == 'updated' &&
        records[2].type == 'deleted') {
      PROP_ADD_TYPE = 'new';
      PROP_UPDATE_TYPE = 'updated';
      PROP_RECONFIGURE_TYPE = 'reconfigured';
      PROP_DELETE_TYPE = 'deleted';
    } else if (records[0].type != 'add' ||
               records[1].type != 'update' ||
               records[2].type != 'delete') {
      console.error('Unexpected change record names for Object.observe. ' +
                    'Using dirty-checking instead');
      return false;
    }
    Object.unobserve(test, callback);

    test = [0];
    Array.observe(test, callback);
    test[1] = 1;
    test.length = 0;
    Object.deliverChangeRecords(callback);
    if (records.length != 2)
      return false;
    if (records[0].type != ARRAY_SPLICE_TYPE ||
        records[1].type != ARRAY_SPLICE_TYPE) {
      return false;
    }
    Array.unobserve(test, callback);

    return true;
  }

  var hasObserve = detectObjectObserve();

  function detectEval() {
    // don't test for eval if document has CSP securityPolicy object and we can see that
    // eval is not supported. This avoids an error message in console even when the exception
    // is caught
    if (global.document &&
        'securityPolicy' in global.document &&
        !global.document.securityPolicy.allowsEval) {
      return false;
    }

    try {
      var f = new Function('', 'return true;');
      return f();
    } catch (ex) {
      return false;
    }
  }

  var hasEval = detectEval();

  function isIndex(s) {
    return +s === s >>> 0;
  }

  function toNumber(s) {
    return +s;
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var numberIsNaN = global.Number.isNaN || function isNaN(value) {
    return typeof value === 'number' && global.isNaN(value);
  }

  function areSameValue(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    if (numberIsNaN(left) && numberIsNaN(right))
      return true;

    return left !== left && right !== right;
  }

  var createObject = ('__proto__' in {}) ?
    function(obj) { return obj; } :
    function(obj) {
      var proto = obj.__proto__;
      if (!proto)
        return obj;
      var newObject = Object.create(proto);
      Object.getOwnPropertyNames(obj).forEach(function(name) {
        Object.defineProperty(newObject, name,
                             Object.getOwnPropertyDescriptor(obj, name));
      });
      return newObject;
    };

  var identStart = '[\$_a-zA-Z]';
  var identPart = '[\$_a-zA-Z0-9]';
  var ident = identStart + '+' + identPart + '*';
  var elementIndex = '(?:[0-9]|[1-9]+[0-9]+)';
  var identOrElementIndex = '(?:' + ident + '|' + elementIndex + ')';
  var path = '(?:' + identOrElementIndex + ')(?:\\s*\\.\\s*' + identOrElementIndex + ')*';
  var pathRegExp = new RegExp('^' + path + '$');

  function isPathValid(s) {
    if (typeof s != 'string')
      return false;
    s = s.trim();

    if (s == '')
      return true;

    if (s[0] == '.')
      return false;

    return pathRegExp.test(s);
  }

  var constructorIsPrivate = {};

  function Path(s, privateToken) {
    if (privateToken !== constructorIsPrivate)
      throw Error('Use Path.get to retrieve path objects');

    if (s.trim() == '')
      return this;

    if (isIndex(s)) {
      this.push(s);
      return this;
    }

    s.split(/\s*\.\s*/).filter(function(part) {
      return part;
    }).forEach(function(part) {
      this.push(part);
    }, this);

    if (hasEval && !hasObserve && this.length) {
      this.getValueFrom = this.compiledGetValueFromFn();
    }
  }

  // TODO(rafaelw): Make simple LRU cache
  var pathCache = {};

  function getPath(pathString) {
    if (pathString instanceof Path)
      return pathString;

    if (pathString == null)
      pathString = '';

    if (typeof pathString !== 'string')
      pathString = String(pathString);

    var path = pathCache[pathString];
    if (path)
      return path;
    if (!isPathValid(pathString))
      return invalidPath;
    var path = new Path(pathString, constructorIsPrivate);
    pathCache[pathString] = path;
    return path;
  }

  Path.get = getPath;

  Path.prototype = createObject({
    __proto__: [],
    valid: true,

    toString: function() {
      return this.join('.');
    },

    getValueFrom: function(obj, observedSet) {
      for (var i = 0; i < this.length; i++) {
        if (obj == null)
          return;
        if (observedSet)
          observedSet.observe(obj);
        obj = obj[this[i]];
      }
      return obj;
    },

    compiledGetValueFromFn: function() {
      var accessors = this.map(function(ident) {
        return isIndex(ident) ? '["' + ident + '"]' : '.' + ident;
      });

      var str = '';
      var pathString = 'obj';
      str += 'if (obj != null';
      var i = 0;
      for (; i < (this.length - 1); i++) {
        var ident = this[i];
        pathString += accessors[i];
        str += ' &&\n     ' + pathString + ' != null';
      }
      str += ')\n';

      pathString += accessors[i];

      str += '  return ' + pathString + ';\nelse\n  return undefined;';
      return new Function('obj', str);
    },

    setValueFrom: function(obj, value) {
      if (!this.length)
        return false;

      for (var i = 0; i < this.length - 1; i++) {
        if (!isObject(obj))
          return false;
        obj = obj[this[i]];
      }

      if (!isObject(obj))
        return false;

      obj[this[i]] = value;
      return true;
    }
  });

  var invalidPath = new Path('', constructorIsPrivate);
  invalidPath.valid = false;
  invalidPath.getValueFrom = invalidPath.setValueFrom = function() {};

  var MAX_DIRTY_CHECK_CYCLES = 1000;

  function dirtyCheck(observer) {
    var cycles = 0;
    while (cycles < MAX_DIRTY_CHECK_CYCLES && observer.check_()) {
      observer.report_();
      cycles++;
    }
    if (global.testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;
  }

  function objectIsEmpty(object) {
    for (var prop in object)
      return false;
    return true;
  }

  function diffIsEmpty(diff) {
    return objectIsEmpty(diff.added) &&
           objectIsEmpty(diff.removed) &&
           objectIsEmpty(diff.changed);
  }

  function diffObjectFromOldObject(object, oldObject) {
    var added = {};
    var removed = {};
    var changed = {};
    var oldObjectHas = {};

    for (var prop in oldObject) {
      var newValue = object[prop];

      if (newValue !== undefined && newValue === oldObject[prop])
        continue;

      if (!(prop in object)) {
        removed[prop] = undefined;
        continue;
      }

      if (newValue !== oldObject[prop])
        changed[prop] = newValue;
    }

    for (var prop in object) {
      if (prop in oldObject)
        continue;

      added[prop] = object[prop];
    }

    if (Array.isArray(object) && object.length !== oldObject.length)
      changed.length = object.length;

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function copyObject(object, opt_copy) {
    var copy = opt_copy || (Array.isArray(object) ? [] : {});
    for (var prop in object) {
      copy[prop] = object[prop];
    };
    if (Array.isArray(object))
      copy.length = object.length;
    return copy;
  }

  function Observer(object, callback, target) {
    this.closed_ = false;
    this.object_ = object;
    this.callback = callback; // TODO(rafaelw): Used in NodeBind
    // TODO(rafaelw): Hold this.target weakly when WeakRef is available.
    this.target = target; // TODO(rafaelw): Used in NodeBind
    this.reporting_ = true;
    if (hasObserve) {
      var self = this;
      this.boundInternalCallback_ = function(records) {
        self.internalCallback_(records);
      };
    }

    addToAll(this);
  }

  Observer.prototype = {
    internalCallback_: function(records) {
      if (this.closed_)
        return;
      if (this.reporting_ && this.check_(records)) {
        this.report_();
        if (this.testingResults)
          this.testingResults.anyChanged = true;
      }
    },

    close: function() {
      if (this.closed_)
        return;
      if (this.object_ && typeof this.object_.close === 'function')
        this.object_.close();

      this.disconnect_();
      this.object_ = undefined;
      this.closed_ = true;
    },

    deliver: function(testingResults) {
      if (this.closed_)
        return;
      if (hasObserve) {
        this.testingResults = testingResults;
        Object.deliverChangeRecords(this.boundInternalCallback_);
        this.testingResults = undefined;
      } else {
        dirtyCheck(this);
      }
    },

    report_: function() {
      if (!this.reporting_)
        return;

      this.sync_(false);
      if (this.callback) {
        this.invokeCallback_(this.reportArgs);
      }
      this.reportArgs = undefined;
    },

    invokeCallback_: function(args) {
      try {
        this.callback.apply(this.target, args);
      } catch (ex) {
        Observer._errorThrownDuringCallback = true;
        console.error('Exception caught during observer callback: ' + (ex.stack || ex));
      }
    },

    reset: function() {
      if (this.closed_)
        return;

      if (hasObserve) {
        this.reporting_ = false;
        Object.deliverChangeRecords(this.boundInternalCallback_);
        this.reporting_ = true;
      }

      this.sync_(true);
    }
  }

  var collectObservers = !hasObserve || global.forceCollectObservers;
  var allObservers;
  Observer._allObserversCount = 0;

  if (collectObservers) {
    allObservers = [];
  }

  function addToAll(observer) {
    if (!collectObservers)
      return;

    allObservers.push(observer);
    Observer._allObserversCount++;
  }

  var runningMicrotaskCheckpoint = false;

  var hasDebugForceFullDelivery = typeof Object.deliverAllChangeRecords == 'function';

  global.Platform = global.Platform || {};

  global.Platform.performMicrotaskCheckpoint = function() {
    if (runningMicrotaskCheckpoint)
      return;

    if (hasDebugForceFullDelivery) {
      Object.deliverAllChangeRecords();
      return;
    }

    if (!collectObservers)
      return;

    runningMicrotaskCheckpoint = true;

    var cycles = 0;
    var results = {};

    do {
      cycles++;
      var toCheck = allObservers;
      allObservers = [];
      results.anyChanged = false;

      for (var i = 0; i < toCheck.length; i++) {
        var observer = toCheck[i];
        if (observer.closed_)
          continue;

        if (hasObserve) {
          observer.deliver(results);
        } else if (observer.check_()) {
          results.anyChanged = true;
          observer.report_();
        }

        allObservers.push(observer);
      }
    } while (cycles < MAX_DIRTY_CHECK_CYCLES && results.anyChanged);

    if (global.testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    Observer._allObserversCount = allObservers.length;
    runningMicrotaskCheckpoint = false;
  };

  if (collectObservers) {
    global.Platform.clearObservers = function() {
      allObservers = [];
    };
  }

  function ObjectObserver(object, callback, target) {
    Observer.call(this, object, callback, target);
    this.connect_();
    this.sync_(true);
  }

  ObjectObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect_: function() {
      if (hasObserve)
        Object.observe(this.object_, this.boundInternalCallback_);
    },

    sync_: function(hard) {
      if (!hasObserve)
        this.oldObject = copyObject(this.object_);
    },

    check_: function(changeRecords) {
      var diff;
      var oldValues;
      if (hasObserve) {
        if (!changeRecords)
          return false;

        oldValues = {};
        diff = diffObjectFromChangeRecords(this.object_, changeRecords,
                                           oldValues);
      } else {
        oldValues = this.oldObject;
        diff = diffObjectFromOldObject(this.object_, this.oldObject);
      }

      if (diffIsEmpty(diff))
        return false;

      this.reportArgs =
          [diff.added || {}, diff.removed || {}, diff.changed || {}];
      this.reportArgs.push(function(property) {
        return oldValues[property];
      });

      return true;
    },

    disconnect_: function() {
      if (!hasObserve)
        this.oldObject = undefined;
      else if (this.object_)
        Object.unobserve(this.object_, this.boundInternalCallback_);
    }
  });

  function ArrayObserver(array, callback, target) {
    if (!Array.isArray(array))
      throw Error('Provided object is not an Array');
    ObjectObserver.call(this, array, callback, target);
  }

  ArrayObserver.prototype = createObject({
    __proto__: ObjectObserver.prototype,

    connect_: function() {
      if (hasObserve)
        Array.observe(this.object_, this.boundInternalCallback_);
    },

    sync_: function() {
      if (!hasObserve)
        this.oldObject = this.object_.slice();
    },

    check_: function(changeRecords) {
      var splices;
      if (hasObserve) {
        if (!changeRecords)
          return false;
        splices = projectArraySplices(this.object_, changeRecords);
      } else {
        splices = calcSplices(this.object_, 0, this.object_.length,
                              this.oldObject, 0, this.oldObject.length);
      }

      if (!splices || !splices.length)
        return false;

      this.reportArgs = [splices];
      return true;
    }
  });

  ArrayObserver.applySplices = function(previous, current, splices) {
    splices.forEach(function(splice) {
      var spliceArgs = [splice.index, splice.removed.length];
      var addIndex = splice.index;
      while (addIndex < splice.index + splice.addedCount) {
        spliceArgs.push(current[addIndex]);
        addIndex++;
      }

      Array.prototype.splice.apply(previous, spliceArgs);
    });
  };

  function ObservedSet(callback) {
    this.arr = [];
    this.callback = callback;
    this.isObserved = true;
  }

  // TODO(rafaelw): Consider surfacing a way to avoid observing prototype
  // ancestors which are expected not to change (e.g. Element, Node...).
  var objProto = Object.getPrototypeOf({});
  var arrayProto = Object.getPrototypeOf([]);
  ObservedSet.prototype = {
    reset: function() {
      this.isObserved = !this.isObserved;
    },

    observe: function(obj) {
      if (!isObject(obj) || obj === objProto || obj === arrayProto)
        return;
      var i = this.arr.indexOf(obj);
      if (i >= 0 && this.arr[i+1] === this.isObserved)
        return;

      if (i < 0) {
        i = this.arr.length;
        this.arr[i] = obj;
        Object.observe(obj, this.callback);
      }

      this.arr[i+1] = this.isObserved;
      this.observe(Object.getPrototypeOf(obj));
    },

    cleanup: function() {
      var i = 0, j = 0;
      var isObserved = this.isObserved;
      while(j < this.arr.length) {
        var obj = this.arr[j];
        if (this.arr[j + 1] == isObserved) {
          if (i < j) {
            this.arr[i] = obj;
            this.arr[i + 1] = isObserved;
          }
          i += 2;
        } else {
          Object.unobserve(obj, this.callback);
        }
        j += 2;
      }

      this.arr.length = i;
    }
  };

  function PathObserver(object, path, callback, target, transformFn,
                        setValueFn) {
    var path = path instanceof Path ? path : getPath(path);
    if (!path.valid || !path.length || !isObject(object)) {
      this.value_ = path.getValueFrom(object);
      this.value = transformFn ? transformFn(this.value_) : this.value_;
      this.closed_ = true;
      return;
    }

    Observer.call(this, object, callback, target);
    this.transformFn_ = transformFn;
    this.setValueFn_ = setValueFn;
    this.path_ = path;

    this.connect_();
    this.sync_(true);
  }

  PathObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect_: function() {
      if (hasObserve)
        this.observedSet_ = new ObservedSet(this.boundInternalCallback_);
    },

    disconnect_: function() {
      this.value = undefined;
      this.value_ = undefined;
      if (this.observedSet_) {
        this.observedSet_.reset();
        this.observedSet_.cleanup();
        this.observedSet_ = undefined;
      }
    },

    check_: function() {
      // Note: Extracting this to a member function for use here and below
      // regresses dirty-checking path perf by about 25% =-(.
      if (this.observedSet_)
        this.observedSet_.reset();

      this.value_ = this.path_.getValueFrom(this.object_, this.observedSet_);

      if (this.observedSet_)
        this.observedSet_.cleanup();

      if (areSameValue(this.value_, this.oldValue_))
        return false;

      this.value = this.transformFn_ ? this.transformFn_(this.value_)
                                     : this.value_;
      this.reportArgs = [this.value, this.oldValue];
      return true;
    },

    sync_: function(hard) {
      if (hard) {
        if (this.observedSet_)
          this.observedSet_.reset();

        this.value_ = this.path_.getValueFrom(this.object_, this.observedSet_);
        this.value = this.transformFn_ ? this.transformFn_(this.value_)
                                       : this.value_;

        if (this.observedSet_)
          this.observedSet_.cleanup();
      }

      this.oldValue_ = this.value_;
      this.oldValue = this.value;
    },

    setValue: function(newValue) {
      if (this.setValueFn_)
        this.setValueFn_(newValue);
      else if (this.path_)
        this.path_.setValueFrom(this.object_, newValue);
    }
  });

  function CompoundPathObserver(callback, target, transformFn, setValueFn) {
    Observer.call(this, undefined, callback, target);
    this.transformFn_ = transformFn;
    this.setValueFn_ = setValueFn;

    this.observed_ = [];
    this.values_ = [];
    this.value = undefined;
    this.oldValue = undefined;
    this.oldValues_ = undefined;
    this.changeFlags_ = undefined;
    this.started_ = false;
  }

  CompoundPathObserver.prototype = createObject({
    __proto__: PathObserver.prototype,

    // TODO(rafaelw): Consider special-casing when |object| is a PathObserver
    // and path 'value' to avoid explicit observation.
    addPath: function(object, path) {
      if (this.started_)
        throw Error('Cannot add more paths once started.');

      var path = path instanceof Path ? path : getPath(path);
      var value = path.getValueFrom(object);

      this.observed_.push(object, path);
      this.values_.push(value);
    },

    start: function() {
      this.started_ = true;
      this.connect_();
      this.sync_(true);
    },

    getValues_: function() {
      if (this.observedSet_)
        this.observedSet_.reset();

      var anyChanged = false;
      for (var i = 0; i < this.observed_.length; i = i+2) {
        var path = this.observed_[i+1];
        var object = this.observed_[i];
        var value = path.getValueFrom(object, this.observedSet_);
        var oldValue = this.values_[i/2];
        if (!areSameValue(value, oldValue)) {
          if (!anyChanged && !this.transformFn_) {
            this.oldValues_ = this.oldValues_ || [];
            this.changeFlags_ = this.changeFlags_ || [];
            for (var j = 0; j < this.values_.length; j++) {
              this.oldValues_[j] = this.values_[j];
              this.changeFlags_[j] = false;
            }
          }

          if (!this.transformFn_)
            this.changeFlags_[i/2] = true;

          this.values_[i/2] = value;
          anyChanged = true;
        }
      }

      if (this.observedSet_)
        this.observedSet_.cleanup();

      return anyChanged;
    },

    check_: function() {
      if (!this.getValues_())
        return;

      if (this.transformFn_) {
        this.value = this.transformFn_(this.values_);

        if (areSameValue(this.value, this.oldValue))
          return false;

        this.reportArgs = [this.value, this.oldValue];
      } else {
        this.reportArgs = [this.values_, this.oldValues_, this.changeFlags_,
                           this.observed_];
      }

      return true;
    },

    sync_: function(hard) {
      if (hard) {
        this.getValues_();
        if (this.transformFn_)
          this.value = this.transformFn_(this.values_);
      }

      if (this.transformFn_)
        this.oldValue = this.value;
    },

    close: function() {
      if (this.observed_) {
        for (var i = 0; i < this.observed_.length; i = i + 2) {
          var object = this.observed_[i];
          if (object && typeof object.close === 'function')
            object.close();
        }
        this.observed_ = undefined;
        this.values_ = undefined;
      }

      Observer.prototype.close.call(this);
    }
  });

  var expectedRecordTypes = {};
  expectedRecordTypes[PROP_ADD_TYPE] = true;
  expectedRecordTypes[PROP_UPDATE_TYPE] = true;
  expectedRecordTypes[PROP_DELETE_TYPE] = true;

  function notifyFunction(object, name) {
    if (typeof Object.observe !== 'function')
      return;

    var notifier = Object.getNotifier(object);
    return function(type, oldValue) {
      var changeRecord = {
        object: object,
        type: type,
        name: name
      };
      if (arguments.length === 2)
        changeRecord.oldValue = oldValue;
      notifier.notify(changeRecord);
    }
  }

  // TODO(rafaelw): It should be possible for the Object.observe case to have
  // every PathObserver used by defineProperty share a single Object.observe
  // callback, and thus get() can simply call observer.deliver() and any changes
  // to any dependent value will be observed.
  PathObserver.defineProperty = function(target, name, object, path) {
    // TODO(rafaelw): Validate errors
    path = getPath(path);
    var notify = notifyFunction(target, name);

    var observer = new PathObserver(object, path,
        function(newValue, oldValue) {
          if (notify)
            notify(PROP_UPDATE_TYPE, oldValue);
        }
    );

    Object.defineProperty(target, name, {
      get: function() {
        return path.getValueFrom(object);
      },
      set: function(newValue) {
        path.setValueFrom(object, newValue);
      },
      configurable: true
    });

    return {
      close: function() {
        var oldValue = path.getValueFrom(object);
        if (notify)
          observer.deliver();
        observer.close();
        Object.defineProperty(target, name, {
          value: oldValue,
          writable: true,
          configurable: true
        });
      }
    };
  }

  function diffObjectFromChangeRecords(object, changeRecords, oldValues) {
    var added = {};
    var removed = {};

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      if (!expectedRecordTypes[record.type]) {
        console.error('Unknown changeRecord type: ' + record.type);
        console.error(record);
        continue;
      }

      if (!(record.name in oldValues))
        oldValues[record.name] = record.oldValue;

      if (record.type == PROP_UPDATE_TYPE)
        continue;

      if (record.type == PROP_ADD_TYPE) {
        if (record.name in removed)
          delete removed[record.name];
        else
          added[record.name] = true;

        continue;
      }

      // type = 'delete'
      if (record.name in added) {
        delete added[record.name];
        delete oldValues[record.name];
      } else {
        removed[record.name] = true;
      }
    }

    for (var prop in added)
      added[prop] = object[prop];

    for (var prop in removed)
      removed[prop] = undefined;

    var changed = {};
    for (var prop in oldValues) {
      if (prop in added || prop in removed)
        continue;

      var newValue = object[prop];
      if (oldValues[prop] !== newValue)
        changed[prop] = newValue;
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {

    // Note: This function is *based* on the computation of the Levenshtein
    // "edit" distance. The one change is that "updates" are treated as two
    // edits - not one. With Array splices, an update is really a delete
    // followed by an add. By retaining this, we optimize for "keeping" the
    // maximum array items in the original array. For example:
    //
    //   'xxxx123' -> '123yyyy'
    //
    // With 1-edit updates, the shortest path would be just to update all seven
    // characters. With 2-edit updates, we delete 4, leave 3, and add 4. This
    // leaves the substring '123' intact.
    calcEditDistances: function(current, currentStart, currentEnd,
                                old, oldStart, oldEnd) {
      // "Deletion" columns
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);

      // "Addition" rows. Initialize null column.
      for (var i = 0; i < rowCount; i++) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      // Initialize null row
      for (var j = 0; j < columnCount; j++)
        distances[0][j] = j;

      for (var i = 1; i < rowCount; i++) {
        for (var j = 1; j < columnCount; j++) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
            distances[i][j] = distances[i - 1][j - 1];
          else {
            var north = distances[i - 1][j] + 1;
            var west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },

    // This starts at the final weight, and walks "backward" by finding
    // the minimum previous weight recursively until the origin of the weight
    // matrix.
    spliceOperationsFromEditDistances: function(distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i == 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j == 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];

        var min;
        if (west < north)
          min = west < northWest ? west : northWest;
        else
          min = north < northWest ? north : northWest;

        if (min == northWest) {
          if (northWest == current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min == west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },

    /**
     * Splice Projection functions:
     *
     * A splice map is a representation of how a previous array of items
     * was transformed into a new array of items. Conceptually it is a list of
     * tuples of
     *
     *   <index, removed, addedCount>
     *
     * which are kept in ascending index order of. The tuple represents that at
     * the |index|, |removed| sequence of items were removed, and counting forward
     * from |index|, |addedCount| items were added.
     */

    /**
     * Lacking individual splice mutation information, the minimal set of
     * splices can be synthesized given the previous state and final state of an
     * array. The basic approach is to calculate the edit distance matrix and
     * choose the shortest path through it.
     *
     * Complexity: O(l * p)
     *   l: The length of the current array
     *   p: The length of the old array
     */
    calcSplices: function(current, currentStart, currentEnd,
                          old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;

      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart == 0 && oldStart == 0)
        prefixCount = this.sharedPrefix(current, old, minLength);

      if (currentEnd == current.length && oldEnd == old.length)
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
        return [];

      if (currentStart == currentEnd) {
        var splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd)
          splice.removed.push(old[oldStart++]);

        return [ splice ];
      } else if (oldStart == oldEnd)
        return [ newSplice(currentStart, [], currentEnd - currentStart) ];

      var ops = this.spliceOperationsFromEditDistances(
          this.calcEditDistances(current, currentStart, currentEnd,
                                 old, oldStart, oldEnd));

      var splice = undefined;
      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; i++) {
        switch(ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }
      return splices;
    },

    sharedPrefix: function(current, old, searchLength) {
      for (var i = 0; i < searchLength; i++)
        if (!this.equals(current[i], old[i]))
          return i;
      return searchLength;
    },

    sharedSuffix: function(current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2]))
        count++;

      return count;
    },

    calculateSplices: function(current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0,
                              previous.length);
    },

    equals: function(currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };

  var arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd,
                       old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd,
                                   old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    // Disjoint
    if (end1 < start2 || end2 < start1)
      return -1;

    // Adjacent
    if (end1 == start2 || end2 == start1)
      return 0;

    // Non-zero intersect, span1 first
    if (start1 < start2) {
      if (end1 < end2)
        return end1 - start2; // Overlap
      else
        return end2 - start2; // Contained
    } else {
      // Non-zero intersect, span2 first
      if (end2 < end1)
        return end2 - start1; // Overlap
      else
        return end1 - start1; // Contained
    }
  }

  function mergeSplice(splices, index, removed, addedCount) {

    var splice = newSplice(index, removed, addedCount);

    var inserted = false;
    var insertionOffset = 0;

    for (var i = 0; i < splices.length; i++) {
      var current = splices[i];
      current.index += insertionOffset;

      if (inserted)
        continue;

      var intersectCount = intersect(splice.index,
                                     splice.index + splice.removed.length,
                                     current.index,
                                     current.index + current.addedCount);

      if (intersectCount >= 0) {
        // Merge the two splices

        splices.splice(i, 1);
        i--;

        insertionOffset -= current.addedCount - current.removed.length;

        splice.addedCount += current.addedCount - intersectCount;
        var deleteCount = splice.removed.length +
                          current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          // merged splice is a noop. discard.
          inserted = true;
        } else {
          var removed = current.removed;

          if (splice.index < current.index) {
            // some prefix of splice.removed is prepended to current.removed.
            var prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, removed);
            removed = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            // some suffix of splice.removed is appended to current.removed.
            var append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(removed, append);
          }

          splice.removed = removed;
          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {
        // Insert splice here.

        inserted = true;

        splices.splice(i, 0, splice);
        i++;

        var offset = splice.addedCount - splice.removed.length
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted)
      splices.push(splice);
  }

  function createInitialSplices(array, changeRecords) {
    var splices = [];

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      switch(record.type) {
        case ARRAY_SPLICE_TYPE:
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;
        case PROP_ADD_TYPE:
        case PROP_UPDATE_TYPE:
        case PROP_DELETE_TYPE:
          if (!isIndex(record.name))
            continue;
          var index = toNumber(record.name);
          if (index < 0)
            continue;
          mergeSplice(splices, index, [record.oldValue], 1);
          break;
        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    var splices = [];

    createInitialSplices(array, changeRecords).forEach(function(splice) {
      if (splice.addedCount == 1 && splice.removed.length == 1) {
        if (splice.removed[0] !== array[splice.index])
          splices.push(splice);

        return
      };

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount,
                                           splice.removed, 0, splice.removed.length));
    });

    return splices;
  }

  global.Observer = Observer;
  global.Observer.hasObjectObserve = hasObserve;
  global.ArrayObserver = ArrayObserver;
  global.ArrayObserver.calculateSplices = function(current, previous) {
    return arraySplice.calculateSplices(current, previous);
  };

  global.ArraySplice = ArraySplice;
  global.ObjectObserver = ObjectObserver;
  global.PathObserver = PathObserver;
  global.CompoundPathObserver = CompoundPathObserver;
  global.Path = Path;

  // TODO(rafaelw): Only needed for testing until new change record names
  // make it to release.
  global.Observer.changeRecordTypes = {
    add: PROP_ADD_TYPE,
    update: PROP_UPDATE_TYPE,
    reconfigure: PROP_RECONFIGURE_TYPE,
    'delete': PROP_DELETE_TYPE,
    splice: ARRAY_SPLICE_TYPE
  };
})(typeof global !== 'undefined' && global ? global : this || window);