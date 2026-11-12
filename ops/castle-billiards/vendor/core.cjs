var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: !0 }), mod);

// ops/castle-billiards/core-entry.ts
var core_entry_exports = {};
__export(core_entry_exports, {
  Ball: () => Ball,
  EightBall: () => EightBall,
  EventType: () => EventType,
  Outcome: () => Outcome,
  OutcomeType: () => OutcomeType,
  PocketGeometry: () => PocketGeometry,
  R: () => R,
  Rack: () => Rack,
  Session: () => Session,
  State: () => State,
  Table: () => Table,
  TableConfig: () => TableConfig,
  TableGeometry: () => TableGeometry,
  Vector3: () => Vector3,
  cueStrike: () => cueStrike,
  maxPower: () => maxPower,
  offCenterLimit: () => offCenterLimit
});
module.exports = __toCommonJS(core_entry_exports);

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/three/build/three.core.js
var REVISION = "187";
var PCFShadowMap = 1;
var VSMShadowMap = 3;
var NeverDepth = 0, AlwaysDepth = 1, LessDepth = 2, LessEqualDepth = 3, EqualDepth = 4, GreaterEqualDepth = 5, GreaterDepth = 6, NotEqualDepth = 7, MultiplyOperation = 0, MixOperation = 1, AddOperation = 2;
var LinearToneMapping = 1, ReinhardToneMapping = 2, CineonToneMapping = 3, ACESFilmicToneMapping = 4, CustomToneMapping = 5, AgXToneMapping = 6, NeutralToneMapping = 7;
var UVMapping = 300;
var CubeRefractionMapping = 302;
var RepeatWrapping = 1e3, ClampToEdgeWrapping = 1001, MirroredRepeatWrapping = 1002;
var LinearFilter = 1006;
var LinearMipmapLinearFilter = 1008;
var UnsignedByteType = 1009;
var RGBAFormat = 1023;
var InterpolateDiscrete = 2300, InterpolateLinear = 2301, InterpolateSmooth = 2302, InterpolateBezier = 2303, ZeroCurvatureEnding = 2400, ZeroSlopeEnding = 2401, WrapAroundEnding = 2402;
var NoColorSpace = "", SRGBColorSpace = "srgb", LinearSRGBColorSpace = "srgb-linear", LinearTransfer = "linear", SRGBTransfer = "srgb";
var WebGLCoordinateSystem = 2e3, WebGPUCoordinateSystem = 2001;
function isTypedArray(array) {
  return ArrayBuffer.isView(array) && !(array instanceof DataView);
}
function createElementNS(name) {
  return (void 0).createElementNS("http://www.w3.org/1999/xhtml", name);
}
var _cache = {}, _setConsoleFunction = null;
function enhanceLogMessage(params) {
  let message = params[0];
  if (typeof message == "string" && message.startsWith("TSL:")) {
    let stackTrace = params[1];
    stackTrace && stackTrace.isStackTrace ? params[0] += " " + stackTrace.getLocation() : params[1] = 'Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.';
  }
  return params;
}
function warn(...params) {
  params = enhanceLogMessage(params);
  let message = "THREE." + params.shift();
  if (_setConsoleFunction)
    _setConsoleFunction("warn", message, ...params);
  else {
    let stackTrace = params[0];
    stackTrace && stackTrace.isStackTrace ? console.warn(stackTrace.getError(message)) : console.warn(message, ...params);
  }
}
function error(...params) {
  params = enhanceLogMessage(params);
  let message = "THREE." + params.shift();
  if (_setConsoleFunction)
    _setConsoleFunction("error", message, ...params);
  else {
    let stackTrace = params[0];
    stackTrace && stackTrace.isStackTrace ? console.error(stackTrace.getError(message)) : console.error(message, ...params);
  }
}
function warnOnce(...params) {
  let message = params.join(" ");
  message in _cache || (_cache[message] = !0, warn(...params));
}
var ReversedDepthFuncs = {
  [NeverDepth]: NeverDepth,
  [LessDepth]: GreaterDepth,
  [EqualDepth]: EqualDepth,
  [LessEqualDepth]: GreaterEqualDepth,
  [AlwaysDepth]: AlwaysDepth,
  [GreaterDepth]: LessDepth,
  [NotEqualDepth]: NotEqualDepth,
  [GreaterEqualDepth]: LessEqualDepth
}, EventDispatcher = class {
  /**
   * Adds the given event listener to the given event type.
   *
   * @param {string} type - The type of event to listen to.
   * @param {Function} listener - The function that gets called when the event is fired.
   */
  addEventListener(type, listener) {
    this._listeners === void 0 && (this._listeners = {});
    let listeners = this._listeners;
    listeners[type] === void 0 && (listeners[type] = []), listeners[type].indexOf(listener) === -1 && listeners[type].push(listener);
  }
  /**
   * Returns `true` if the given event listener has been added to the given event type.
   *
   * @param {string} type - The type of event.
   * @param {Function} listener - The listener to check.
   * @return {boolean} Whether the given event listener has been added to the given event type.
   */
  hasEventListener(type, listener) {
    let listeners = this._listeners;
    return listeners === void 0 ? !1 : listeners[type] !== void 0 && listeners[type].indexOf(listener) !== -1;
  }
  /**
   * Removes the given event listener from the given event type.
   *
   * @param {string} type - The type of event.
   * @param {Function} listener - The listener to remove.
   */
  removeEventListener(type, listener) {
    let listeners = this._listeners;
    if (listeners === void 0)
      return;
    let listenerArray = listeners[type];
    if (listenerArray !== void 0) {
      let index = listenerArray.indexOf(listener);
      index !== -1 && listenerArray.splice(index, 1);
    }
  }
  /**
   * Dispatches an event object.
   *
   * @param {Object} event - The event that gets fired.
   */
  dispatchEvent(event) {
    let listeners = this._listeners;
    if (listeners === void 0)
      return;
    let listenerArray = listeners[event.type];
    if (listenerArray !== void 0) {
      event.target = this;
      let array = listenerArray.slice(0);
      for (let i = 0, l = array.length; i < l; i++)
        array[i].call(this, event);
      event.target = null;
    }
  }
}, _lut = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf", "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df", "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef", "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"];
var DEG2RAD = Math.PI / 180, RAD2DEG = 180 / Math.PI;
function generateUUID() {
  let d0 = Math.random() * 4294967295 | 0, d1 = Math.random() * 4294967295 | 0, d2 = Math.random() * 4294967295 | 0, d3 = Math.random() * 4294967295 | 0;
  return (_lut[d0 & 255] + _lut[d0 >> 8 & 255] + _lut[d0 >> 16 & 255] + _lut[d0 >> 24 & 255] + "-" + _lut[d1 & 255] + _lut[d1 >> 8 & 255] + "-" + _lut[d1 >> 16 & 15 | 64] + _lut[d1 >> 24 & 255] + "-" + _lut[d2 & 63 | 128] + _lut[d2 >> 8 & 255] + "-" + _lut[d2 >> 16 & 255] + _lut[d2 >> 24 & 255] + _lut[d3 & 255] + _lut[d3 >> 8 & 255] + _lut[d3 >> 16 & 255] + _lut[d3 >> 24 & 255]).toLowerCase();
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function euclideanModulo(n, m2) {
  return (n % m2 + m2) % m2;
}
function lerp(x, y, t) {
  return (1 - t) * x + t * y;
}
var _Vector2 = class {
  /**
   * Constructs a new 2D vector.
   *
   * @param {number} [x=0] - The x value of this vector.
   * @param {number} [y=0] - The y value of this vector.
   */
  constructor(x = 0, y = 0) {
    this.x = x, this.y = y;
  }
  /**
   * Alias for {@link Vector2#x}.
   *
   * @type {number}
   */
  get width() {
    return this.x;
  }
  set width(value) {
    this.x = value;
  }
  /**
   * Alias for {@link Vector2#y}.
   *
   * @type {number}
   */
  get height() {
    return this.y;
  }
  set height(value) {
    this.y = value;
  }
  /**
   * Sets the vector components.
   *
   * @param {number} x - The value of the x component.
   * @param {number} y - The value of the y component.
   * @return {Vector2} A reference to this vector.
   */
  set(x, y) {
    return this.x = x, this.y = y, this;
  }
  /**
   * Sets the vector components to the same value.
   *
   * @param {number} scalar - The value to set for all vector components.
   * @return {Vector2} A reference to this vector.
   */
  setScalar(scalar) {
    return this.x = scalar, this.y = scalar, this;
  }
  /**
   * Sets the vector's x component to the given value
   *
   * @param {number} x - The value to set.
   * @return {Vector2} A reference to this vector.
   */
  setX(x) {
    return this.x = x, this;
  }
  /**
   * Sets the vector's y component to the given value
   *
   * @param {number} y - The value to set.
   * @return {Vector2} A reference to this vector.
   */
  setY(y) {
    return this.y = y, this;
  }
  /**
   * Allows to set a vector component with an index.
   *
   * @param {number} index - The component index. `0` equals to x, `1` equals to y.
   * @param {number} value - The value to set.
   * @return {Vector2} A reference to this vector.
   */
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      default:
        throw new Error("THREE.Vector2: index is out of range: " + index);
    }
    return this;
  }
  /**
   * Returns the value of the vector component which matches the given index.
   *
   * @param {number} index - The component index. `0` equals to x, `1` equals to y.
   * @return {number} A vector component value.
   */
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      default:
        throw new Error("THREE.Vector2: index is out of range: " + index);
    }
  }
  /**
   * Returns a new vector with copied values from this instance.
   *
   * @return {Vector2} A clone of this instance.
   */
  clone() {
    return new this.constructor(this.x, this.y);
  }
  /**
   * Copies the values of the given vector to this instance.
   *
   * @param {Vector2} v - The vector to copy.
   * @return {Vector2} A reference to this vector.
   */
  copy(v) {
    return this.x = v.x, this.y = v.y, this;
  }
  /**
   * Adds the given vector to this instance.
   *
   * @param {Vector2} v - The vector to add.
   * @return {Vector2} A reference to this vector.
   */
  add(v) {
    return this.x += v.x, this.y += v.y, this;
  }
  /**
   * Adds the given scalar value to all components of this instance.
   *
   * @param {number} s - The scalar to add.
   * @return {Vector2} A reference to this vector.
   */
  addScalar(s) {
    return this.x += s, this.y += s, this;
  }
  /**
   * Adds the given vectors and stores the result in this instance.
   *
   * @param {Vector2} a - The first vector.
   * @param {Vector2} b - The second vector.
   * @return {Vector2} A reference to this vector.
   */
  addVectors(a, b) {
    return this.x = a.x + b.x, this.y = a.y + b.y, this;
  }
  /**
   * Adds the given vector scaled by the given factor to this instance.
   *
   * @param {Vector2} v - The vector.
   * @param {number} s - The factor that scales `v`.
   * @return {Vector2} A reference to this vector.
   */
  addScaledVector(v, s) {
    return this.x += v.x * s, this.y += v.y * s, this;
  }
  /**
   * Subtracts the given vector from this instance.
   *
   * @param {Vector2} v - The vector to subtract.
   * @return {Vector2} A reference to this vector.
   */
  sub(v) {
    return this.x -= v.x, this.y -= v.y, this;
  }
  /**
   * Subtracts the given scalar value from all components of this instance.
   *
   * @param {number} s - The scalar to subtract.
   * @return {Vector2} A reference to this vector.
   */
  subScalar(s) {
    return this.x -= s, this.y -= s, this;
  }
  /**
   * Subtracts the given vectors and stores the result in this instance.
   *
   * @param {Vector2} a - The first vector.
   * @param {Vector2} b - The second vector.
   * @return {Vector2} A reference to this vector.
   */
  subVectors(a, b) {
    return this.x = a.x - b.x, this.y = a.y - b.y, this;
  }
  /**
   * Multiplies the given vector with this instance.
   *
   * @param {Vector2} v - The vector to multiply.
   * @return {Vector2} A reference to this vector.
   */
  multiply(v) {
    return this.x *= v.x, this.y *= v.y, this;
  }
  /**
   * Multiplies the given scalar value with all components of this instance.
   *
   * @param {number} scalar - The scalar to multiply.
   * @return {Vector2} A reference to this vector.
   */
  multiplyScalar(scalar) {
    return this.x *= scalar, this.y *= scalar, this;
  }
  /**
   * Divides this instance by the given vector.
   *
   * @param {Vector2} v - The vector to divide.
   * @return {Vector2} A reference to this vector.
   */
  divide(v) {
    return this.x /= v.x, this.y /= v.y, this;
  }
  /**
   * Divides this vector by the given scalar.
   *
   * @param {number} scalar - The scalar to divide.
   * @return {Vector2} A reference to this vector.
   */
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }
  /**
   * Multiplies this vector (with an implicit 1 as the 3rd component) by
   * the given 3x3 matrix.
   *
   * @param {Matrix3} m - The matrix to apply.
   * @return {Vector2} A reference to this vector.
   */
  applyMatrix3(m2) {
    let x = this.x, y = this.y, e2 = m2.elements;
    return this.x = e2[0] * x + e2[3] * y + e2[6], this.y = e2[1] * x + e2[4] * y + e2[7], this;
  }
  /**
   * If this vector's x or y value is greater than the given vector's x or y
   * value, replace that value with the corresponding min value.
   *
   * @param {Vector2} v - The vector.
   * @return {Vector2} A reference to this vector.
   */
  min(v) {
    return this.x = Math.min(this.x, v.x), this.y = Math.min(this.y, v.y), this;
  }
  /**
   * If this vector's x or y value is less than the given vector's x or y
   * value, replace that value with the corresponding max value.
   *
   * @param {Vector2} v - The vector.
   * @return {Vector2} A reference to this vector.
   */
  max(v) {
    return this.x = Math.max(this.x, v.x), this.y = Math.max(this.y, v.y), this;
  }
  /**
   * If this vector's x or y value is greater than the max vector's x or y
   * value, it is replaced by the corresponding value.
   * If this vector's x or y value is less than the min vector's x or y value,
   * it is replaced by the corresponding value.
   *
   * @param {Vector2} min - The minimum x and y values.
   * @param {Vector2} max - The maximum x and y values in the desired range.
   * @return {Vector2} A reference to this vector.
   */
  clamp(min, max) {
    return this.x = clamp(this.x, min.x, max.x), this.y = clamp(this.y, min.y, max.y), this;
  }
  /**
   * If this vector's x or y values are greater than the max value, they are
   * replaced by the max value.
   * If this vector's x or y values are less than the min value, they are
   * replaced by the min value.
   *
   * @param {number} minVal - The minimum value the components will be clamped to.
   * @param {number} maxVal - The maximum value the components will be clamped to.
   * @return {Vector2} A reference to this vector.
   */
  clampScalar(minVal, maxVal) {
    return this.x = clamp(this.x, minVal, maxVal), this.y = clamp(this.y, minVal, maxVal), this;
  }
  /**
   * If this vector's length is greater than the max value, it is replaced by
   * the max value.
   * If this vector's length is less than the min value, it is replaced by the
   * min value.
   *
   * @param {number} min - The minimum value the vector length will be clamped to.
   * @param {number} max - The maximum value the vector length will be clamped to.
   * @return {Vector2} A reference to this vector.
   */
  clampLength(min, max) {
    let length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max));
  }
  /**
   * The components of this vector are rounded down to the nearest integer value.
   *
   * @return {Vector2} A reference to this vector.
   */
  floor() {
    return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
  }
  /**
   * The components of this vector are rounded up to the nearest integer value.
   *
   * @return {Vector2} A reference to this vector.
   */
  ceil() {
    return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
  }
  /**
   * The components of this vector are rounded to the nearest integer value
   *
   * @return {Vector2} A reference to this vector.
   */
  round() {
    return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
  }
  /**
   * The components of this vector are rounded towards zero (up if negative,
   * down if positive) to an integer value.
   *
   * @return {Vector2} A reference to this vector.
   */
  roundToZero() {
    return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
  }
  /**
   * Inverts this vector - i.e. sets x = -x and y = -y.
   *
   * @return {Vector2} A reference to this vector.
   */
  negate() {
    return this.x = -this.x, this.y = -this.y, this;
  }
  /**
   * Calculates the dot product of the given vector with this instance.
   *
   * @param {Vector2} v - The vector to compute the dot product with.
   * @return {number} The result of the dot product.
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  /**
   * Calculates the cross product of the given vector with this instance.
   *
   * @param {Vector2} v - The vector to compute the cross product with.
   * @return {number} The result of the cross product.
   */
  cross(v) {
    return this.x * v.y - this.y * v.x;
  }
  /**
   * Computes the square of the Euclidean length (straight-line length) from
   * (0, 0) to (x, y). If you are comparing the lengths of vectors, you should
   * compare the length squared instead as it is slightly more efficient to calculate.
   *
   * @return {number} The square length of this vector.
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }
  /**
   * Computes the  Euclidean length (straight-line length) from (0, 0) to (x, y).
   *
   * @return {number} The length of this vector.
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  /**
   * Computes the Manhattan length of this vector.
   *
   * @return {number} The length of this vector.
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y);
  }
  /**
   * Converts this vector to a unit vector - that is, sets it equal to a vector
   * with the same direction as this one, but with a vector length of `1`.
   *
   * @return {Vector2} A reference to this vector.
   */
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  /**
   * Computes the angle in radians of this vector with respect to the positive x-axis.
   *
   * @return {number} The angle in radians.
   */
  angle() {
    return Math.atan2(-this.y, -this.x) + Math.PI;
  }
  /**
   * Returns the angle between the given vector and this instance in radians.
   *
   * @param {Vector2} v - The vector to compute the angle with.
   * @return {number} The angle in radians.
   */
  angleTo(v) {
    let denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
    if (denominator === 0)
      return Math.PI / 2;
    let theta = this.dot(v) / denominator;
    return Math.acos(clamp(theta, -1, 1));
  }
  /**
   * Computes the distance from the given vector to this instance.
   *
   * @param {Vector2} v - The vector to compute the distance to.
   * @return {number} The distance.
   */
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }
  /**
   * Computes the squared distance from the given vector to this instance.
   * If you are just comparing the distance with another distance, you should compare
   * the distance squared instead as it is slightly more efficient to calculate.
   *
   * @param {Vector2} v - The vector to compute the squared distance to.
   * @return {number} The squared distance.
   */
  distanceToSquared(v) {
    let dx = this.x - v.x, dy = this.y - v.y;
    return dx * dx + dy * dy;
  }
  /**
   * Computes the Manhattan distance from the given vector to this instance.
   *
   * @param {Vector2} v - The vector to compute the Manhattan distance to.
   * @return {number} The Manhattan distance.
   */
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
  }
  /**
   * Sets this vector to a vector with the same direction as this one, but
   * with the specified length.
   *
   * @param {number} length - The new length of this vector.
   * @return {Vector2} A reference to this vector.
   */
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
  /**
   * Linearly interpolates between the given vector and this instance, where
   * alpha is the percent distance along the line - alpha = 0 will be this
   * vector, and alpha = 1 will be the given one.
   *
   * @param {Vector2} v - The vector to interpolate towards.
   * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector2} A reference to this vector.
   */
  lerp(v, alpha) {
    return this.x += (v.x - this.x) * alpha, this.y += (v.y - this.y) * alpha, this;
  }
  /**
   * Linearly interpolates between the given vectors, where alpha is the percent
   * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
   * be the second one. The result is stored in this instance.
   *
   * @param {Vector2} v1 - The first vector.
   * @param {Vector2} v2 - The second vector.
   * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector2} A reference to this vector.
   */
  lerpVectors(v1, v2, alpha) {
    return this.x = v1.x + (v2.x - v1.x) * alpha, this.y = v1.y + (v2.y - v1.y) * alpha, this;
  }
  /**
   * Returns `true` if this vector is equal with the given one.
   *
   * @param {Vector2} v - The vector to test for equality.
   * @return {boolean} Whether this vector is equal with the given one.
   */
  equals(v) {
    return v.x === this.x && v.y === this.y;
  }
  /**
   * Sets this vector's x value to be `array[ offset ]` and y
   * value to be `array[ offset + 1 ]`.
   *
   * @param {Array<number>} array - An array holding the vector component values.
   * @param {number} [offset=0] - The offset into the array.
   * @return {Vector2} A reference to this vector.
   */
  fromArray(array, offset = 0) {
    return this.x = array[offset], this.y = array[offset + 1], this;
  }
  /**
   * Writes the components of this vector to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the vector components.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The vector components.
   */
  toArray(array = [], offset = 0) {
    return array[offset] = this.x, array[offset + 1] = this.y, array;
  }
  /**
   * Sets the components of this vector from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
   * @param {number} index - The index into the attribute.
   * @return {Vector2} A reference to this vector.
   */
  fromBufferAttribute(attribute, index) {
    return this.x = attribute.getX(index), this.y = attribute.getY(index), this;
  }
  /**
   * Rotates this vector around the given center by the given angle.
   *
   * @param {Vector2} center - The point around which to rotate.
   * @param {number} angle - The angle to rotate, in radians.
   * @return {Vector2} A reference to this vector.
   */
  rotateAround(center, angle) {
    let c = Math.cos(angle), s = Math.sin(angle), x = this.x - center.x, y = this.y - center.y;
    return this.x = x * c - y * s + center.x, this.y = x * s + y * c + center.y, this;
  }
  /**
   * Sets each component of this vector to a pseudo-random value between `0` and
   * `1`, excluding `1`.
   *
   * @return {Vector2} A reference to this vector.
   */
  random() {
    return this.x = Math.random(), this.y = Math.random(), this;
  }
  *[Symbol.iterator]() {
    yield this.x, yield this.y;
  }
}, Vector2 = _Vector2;
(() => {
  _Vector2.prototype.isVector2 = !0;
})();
var Quaternion = class {
  /**
   * Constructs a new quaternion.
   *
   * @param {number} [x=0] - The x value of this quaternion.
   * @param {number} [y=0] - The y value of this quaternion.
   * @param {number} [z=0] - The z value of this quaternion.
   * @param {number} [w=1] - The w value of this quaternion.
   */
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.isQuaternion = !0, this._x = x, this._y = y, this._z = z, this._w = w;
  }
  /**
   * Interpolates between two quaternions via SLERP. This implementation assumes the
   * quaternion data are managed in flat arrays.
   *
   * @param {Array<number>} dst - The destination array.
   * @param {number} dstOffset - An offset into the destination array.
   * @param {Array<number>} src0 - The source array of the first quaternion.
   * @param {number} srcOffset0 - An offset into the first source array.
   * @param {Array<number>} src1 -  The source array of the second quaternion.
   * @param {number} srcOffset1 - An offset into the second source array.
   * @param {number} t - The interpolation factor. A value in the range `[0,1]` will interpolate. A value outside the range `[0,1]` will extrapolate.
   * @see {@link Quaternion#slerp}
   */
  static slerpFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t) {
    let x0 = src0[srcOffset0 + 0], y0 = src0[srcOffset0 + 1], z0 = src0[srcOffset0 + 2], w0 = src0[srcOffset0 + 3], x1 = src1[srcOffset1 + 0], y1 = src1[srcOffset1 + 1], z1 = src1[srcOffset1 + 2], w1 = src1[srcOffset1 + 3];
    if (w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1) {
      let dot = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1;
      dot < 0 && (x1 = -x1, y1 = -y1, z1 = -z1, w1 = -w1, dot = -dot);
      let s = 1 - t;
      if (dot < 0.9995) {
        let theta = Math.acos(dot), sin2 = Math.sin(theta);
        s = Math.sin(s * theta) / sin2, t = Math.sin(t * theta) / sin2, x0 = x0 * s + x1 * t, y0 = y0 * s + y1 * t, z0 = z0 * s + z1 * t, w0 = w0 * s + w1 * t;
      } else {
        x0 = x0 * s + x1 * t, y0 = y0 * s + y1 * t, z0 = z0 * s + z1 * t, w0 = w0 * s + w1 * t;
        let f = 1 / Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);
        x0 *= f, y0 *= f, z0 *= f, w0 *= f;
      }
    }
    dst[dstOffset] = x0, dst[dstOffset + 1] = y0, dst[dstOffset + 2] = z0, dst[dstOffset + 3] = w0;
  }
  /**
   * Multiplies two quaternions. This implementation assumes the quaternion data are managed
   * in flat arrays.
   *
   * @param {Array<number>} dst - The destination array.
   * @param {number} dstOffset - An offset into the destination array.
   * @param {Array<number>} src0 - The source array of the first quaternion.
   * @param {number} srcOffset0 - An offset into the first source array.
   * @param {Array<number>} src1 -  The source array of the second quaternion.
   * @param {number} srcOffset1 - An offset into the second source array.
   * @return {Array<number>} The destination array.
   * @see {@link Quaternion#multiplyQuaternions}.
   */
  static multiplyQuaternionsFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1) {
    let x0 = src0[srcOffset0], y0 = src0[srcOffset0 + 1], z0 = src0[srcOffset0 + 2], w0 = src0[srcOffset0 + 3], x1 = src1[srcOffset1], y1 = src1[srcOffset1 + 1], z1 = src1[srcOffset1 + 2], w1 = src1[srcOffset1 + 3];
    return dst[dstOffset] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1, dst[dstOffset + 1] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1, dst[dstOffset + 2] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1, dst[dstOffset + 3] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1, dst;
  }
  /**
   * The x value of this quaternion.
   *
   * @type {number}
   * @default 0
   */
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value, this._onChangeCallback();
  }
  /**
   * The y value of this quaternion.
   *
   * @type {number}
   * @default 0
   */
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value, this._onChangeCallback();
  }
  /**
   * The z value of this quaternion.
   *
   * @type {number}
   * @default 0
   */
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value, this._onChangeCallback();
  }
  /**
   * The w value of this quaternion.
   *
   * @type {number}
   * @default 1
   */
  get w() {
    return this._w;
  }
  set w(value) {
    this._w = value, this._onChangeCallback();
  }
  /**
   * Sets the quaternion components.
   *
   * @param {number} x - The x value of this quaternion.
   * @param {number} y - The y value of this quaternion.
   * @param {number} z - The z value of this quaternion.
   * @param {number} w - The w value of this quaternion.
   * @return {Quaternion} A reference to this quaternion.
   */
  set(x, y, z, w) {
    return this._x = x, this._y = y, this._z = z, this._w = w, this._onChangeCallback(), this;
  }
  /**
   * Returns a new quaternion with copied values from this instance.
   *
   * @return {Quaternion} A clone of this instance.
   */
  clone() {
    return new this.constructor(this._x, this._y, this._z, this._w);
  }
  /**
   * Copies the values of the given quaternion to this instance.
   *
   * @param {Quaternion} quaternion - The quaternion to copy.
   * @return {Quaternion} A reference to this quaternion.
   */
  copy(quaternion) {
    return this._x = quaternion.x, this._y = quaternion.y, this._z = quaternion.z, this._w = quaternion.w, this._onChangeCallback(), this;
  }
  /**
   * Sets this quaternion from the rotation specified by the given
   * Euler angles.
   *
   * @param {Euler} euler - The Euler angles.
   * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
   * @return {Quaternion} A reference to this quaternion.
   */
  setFromEuler(euler, update = !0) {
    let x = euler._x, y = euler._y, z = euler._z, order = euler._order, cos2 = Math.cos, sin2 = Math.sin, c1 = cos2(x / 2), c2 = cos2(y / 2), c3 = cos2(z / 2), s1 = sin2(x / 2), s2 = sin2(y / 2), s3 = sin2(z / 2);
    switch (order) {
      case "XYZ":
        this._x = s1 * c2 * c3 + c1 * s2 * s3, this._y = c1 * s2 * c3 - s1 * c2 * s3, this._z = c1 * c2 * s3 + s1 * s2 * c3, this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case "YXZ":
        this._x = s1 * c2 * c3 + c1 * s2 * s3, this._y = c1 * s2 * c3 - s1 * c2 * s3, this._z = c1 * c2 * s3 - s1 * s2 * c3, this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case "ZXY":
        this._x = s1 * c2 * c3 - c1 * s2 * s3, this._y = c1 * s2 * c3 + s1 * c2 * s3, this._z = c1 * c2 * s3 + s1 * s2 * c3, this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case "ZYX":
        this._x = s1 * c2 * c3 - c1 * s2 * s3, this._y = c1 * s2 * c3 + s1 * c2 * s3, this._z = c1 * c2 * s3 - s1 * s2 * c3, this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case "YZX":
        this._x = s1 * c2 * c3 + c1 * s2 * s3, this._y = c1 * s2 * c3 + s1 * c2 * s3, this._z = c1 * c2 * s3 - s1 * s2 * c3, this._w = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case "XZY":
        this._x = s1 * c2 * c3 - c1 * s2 * s3, this._y = c1 * s2 * c3 - s1 * c2 * s3, this._z = c1 * c2 * s3 + s1 * s2 * c3, this._w = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      default:
        warn("Quaternion: .setFromEuler() encountered an unknown order: " + order);
    }
    return update === !0 && this._onChangeCallback(), this;
  }
  /**
   * Sets this quaternion from the given axis and angle.
   *
   * @param {Vector3} axis - The normalized axis.
   * @param {number} angle - The angle in radians.
   * @return {Quaternion} A reference to this quaternion.
   */
  setFromAxisAngle(axis, angle) {
    let halfAngle = angle / 2, s = Math.sin(halfAngle);
    return this._x = axis.x * s, this._y = axis.y * s, this._z = axis.z * s, this._w = Math.cos(halfAngle), this._onChangeCallback(), this;
  }
  /**
   * Sets this quaternion from the given rotation matrix.
   *
   * @param {Matrix4} m - A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
   * @return {Quaternion} A reference to this quaternion.
   */
  setFromRotationMatrix(m2) {
    let te = m2.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
    if (trace > 0) {
      let s = 0.5 / Math.sqrt(trace + 1);
      this._w = 0.25 / s, this._x = (m32 - m23) * s, this._y = (m13 - m31) * s, this._z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      let s = 2 * Math.sqrt(1 + m11 - m22 - m33);
      this._w = (m32 - m23) / s, this._x = 0.25 * s, this._y = (m12 + m21) / s, this._z = (m13 + m31) / s;
    } else if (m22 > m33) {
      let s = 2 * Math.sqrt(1 + m22 - m11 - m33);
      this._w = (m13 - m31) / s, this._x = (m12 + m21) / s, this._y = 0.25 * s, this._z = (m23 + m32) / s;
    } else {
      let s = 2 * Math.sqrt(1 + m33 - m11 - m22);
      this._w = (m21 - m12) / s, this._x = (m13 + m31) / s, this._y = (m23 + m32) / s, this._z = 0.25 * s;
    }
    return this._onChangeCallback(), this;
  }
  /**
   * Sets this quaternion to the rotation required to rotate the direction vector
   * `vFrom` to the direction vector `vTo`.
   *
   * @param {Vector3} vFrom - The first (normalized) direction vector.
   * @param {Vector3} vTo - The second (normalized) direction vector.
   * @return {Quaternion} A reference to this quaternion.
   */
  setFromUnitVectors(vFrom, vTo) {
    let r = vFrom.dot(vTo) + 1;
    return r < 1e-8 ? (r = 0, Math.abs(vFrom.x) > Math.abs(vFrom.z) ? (this._x = -vFrom.y, this._y = vFrom.x, this._z = 0, this._w = r) : (this._x = 0, this._y = -vFrom.z, this._z = vFrom.y, this._w = r)) : (this._x = vFrom.y * vTo.z - vFrom.z * vTo.y, this._y = vFrom.z * vTo.x - vFrom.x * vTo.z, this._z = vFrom.x * vTo.y - vFrom.y * vTo.x, this._w = r), this.normalize();
  }
  /**
   * Returns the angle between this quaternion and the given one in radians.
   *
   * @param {Quaternion} q - The quaternion to compute the angle with.
   * @return {number} The angle in radians.
   */
  angleTo(q) {
    return 2 * Math.acos(Math.abs(clamp(this.dot(q), -1, 1)));
  }
  /**
   * Rotates this quaternion by a given angular step to the given quaternion.
   * The method ensures that the final quaternion will not overshoot `q`.
   *
   * @param {Quaternion} q - The target quaternion.
   * @param {number} step - The angular step in radians.
   * @return {Quaternion} A reference to this quaternion.
   */
  rotateTowards(q, step) {
    let angle = this.angleTo(q);
    if (angle === 0)
      return this;
    let t = Math.min(1, step / angle);
    return this.slerp(q, t), this;
  }
  /**
   * Sets this quaternion to the identity quaternion; that is, to the
   * quaternion that represents "no rotation".
   *
   * @return {Quaternion} A reference to this quaternion.
   */
  identity() {
    return this.set(0, 0, 0, 1);
  }
  /**
   * Inverts this quaternion via {@link Quaternion#conjugate}. The
   * quaternion is assumed to have unit length.
   *
   * @return {Quaternion} A reference to this quaternion.
   */
  invert() {
    return this.conjugate();
  }
  /**
   * Returns the rotational conjugate of this quaternion. The conjugate of a
   * quaternion represents the same rotation in the opposite direction about
   * the rotational axis.
   *
   * @return {Quaternion} A reference to this quaternion.
   */
  conjugate() {
    return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
  }
  /**
   * Calculates the dot product of this quaternion and the given one.
   *
   * @param {Quaternion} v - The quaternion to compute the dot product with.
   * @return {number} The result of the dot product.
   */
  dot(v) {
    return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;
  }
  /**
   * Computes the squared Euclidean length (straight-line length) of this quaternion,
   * considered as a 4 dimensional vector. This can be useful if you are comparing the
   * lengths of two quaternions, as this is a slightly more efficient calculation than
   * {@link Quaternion#length}.
   *
   * @return {number} The squared Euclidean length.
   */
  lengthSq() {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }
  /**
   * Computes the Euclidean length (straight-line length) of this quaternion,
   * considered as a 4 dimensional vector.
   *
   * @return {number} The Euclidean length.
   */
  length() {
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }
  /**
   * Normalizes this quaternion - that is, calculated the quaternion that performs
   * the same rotation as this one, but has a length equal to `1`.
   *
   * @return {Quaternion} A reference to this quaternion.
   */
  normalize() {
    let l = this.length();
    return l === 0 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (l = 1 / l, this._x = this._x * l, this._y = this._y * l, this._z = this._z * l, this._w = this._w * l), this._onChangeCallback(), this;
  }
  /**
   * Multiplies this quaternion by the given one.
   *
   * @param {Quaternion} q - The quaternion.
   * @return {Quaternion} A reference to this quaternion.
   */
  multiply(q) {
    return this.multiplyQuaternions(this, q);
  }
  /**
   * Pre-multiplies this quaternion by the given one.
   *
   * @param {Quaternion} q - The quaternion.
   * @return {Quaternion} A reference to this quaternion.
   */
  premultiply(q) {
    return this.multiplyQuaternions(q, this);
  }
  /**
   * Multiplies the given quaternions and stores the result in this instance.
   *
   * @param {Quaternion} a - The first quaternion.
   * @param {Quaternion} b - The second quaternion.
   * @return {Quaternion} A reference to this quaternion.
   */
  multiplyQuaternions(a, b) {
    let qax = a._x, qay = a._y, qaz = a._z, qaw = a._w, qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;
    return this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby, this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz, this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx, this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz, this._onChangeCallback(), this;
  }
  /**
   * Performs a spherical linear interpolation between this quaternion and the target quaternion.
   *
   * @param {Quaternion} qb - The target quaternion.
   * @param {number} t - The interpolation factor. A value in the range `[0,1]` will interpolate. A value outside the range `[0,1]` will extrapolate.
   * @return {Quaternion} A reference to this quaternion.
   */
  slerp(qb, t) {
    let x = qb._x, y = qb._y, z = qb._z, w = qb._w, dot = this.dot(qb);
    dot < 0 && (x = -x, y = -y, z = -z, w = -w, dot = -dot);
    let s = 1 - t;
    if (dot < 0.9995) {
      let theta = Math.acos(dot), sin2 = Math.sin(theta);
      s = Math.sin(s * theta) / sin2, t = Math.sin(t * theta) / sin2, this._x = this._x * s + x * t, this._y = this._y * s + y * t, this._z = this._z * s + z * t, this._w = this._w * s + w * t, this._onChangeCallback();
    } else
      this._x = this._x * s + x * t, this._y = this._y * s + y * t, this._z = this._z * s + z * t, this._w = this._w * s + w * t, this.normalize();
    return this;
  }
  /**
   * Performs a spherical linear interpolation between the given quaternions
   * and stores the result in this quaternion.
   *
   * @param {Quaternion} qa - The source quaternion.
   * @param {Quaternion} qb - The target quaternion.
   * @param {number} t - The interpolation factor in the closed interval `[0, 1]`.
   * @return {Quaternion} A reference to this quaternion.
   */
  slerpQuaternions(qa, qb, t) {
    return this.copy(qa).slerp(qb, t);
  }
  /**
   * Sets this quaternion to a uniformly random, normalized quaternion.
   *
   * @return {Quaternion} A reference to this quaternion.
   */
  random() {
    let theta1 = 2 * Math.PI * Math.random(), theta2 = 2 * Math.PI * Math.random(), x0 = Math.random(), r1 = Math.sqrt(1 - x0), r2 = Math.sqrt(x0);
    return this.set(
      r1 * Math.sin(theta1),
      r1 * Math.cos(theta1),
      r2 * Math.sin(theta2),
      r2 * Math.cos(theta2)
    );
  }
  /**
   * Returns `true` if this quaternion is equal with the given one.
   *
   * @param {Quaternion} quaternion - The quaternion to test for equality.
   * @return {boolean} Whether this quaternion is equal with the given one.
   */
  equals(quaternion) {
    return quaternion._x === this._x && quaternion._y === this._y && quaternion._z === this._z && quaternion._w === this._w;
  }
  /**
   * Sets this quaternion's components from the given array.
   *
   * @param {Array<number>} array - An array holding the quaternion component values.
   * @param {number} [offset=0] - The offset into the array.
   * @return {Quaternion} A reference to this quaternion.
   */
  fromArray(array, offset = 0) {
    return this._x = array[offset], this._y = array[offset + 1], this._z = array[offset + 2], this._w = array[offset + 3], this._onChangeCallback(), this;
  }
  /**
   * Writes the components of this quaternion to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the quaternion components.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The quaternion components.
   */
  toArray(array = [], offset = 0) {
    return array[offset] = this._x, array[offset + 1] = this._y, array[offset + 2] = this._z, array[offset + 3] = this._w, array;
  }
  /**
   * Sets the components of this quaternion from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - The buffer attribute holding quaternion data.
   * @param {number} index - The index into the attribute.
   * @return {Quaternion} A reference to this quaternion.
   */
  fromBufferAttribute(attribute, index) {
    return this._x = attribute.getX(index), this._y = attribute.getY(index), this._z = attribute.getZ(index), this._w = attribute.getW(index), this._onChangeCallback(), this;
  }
  /**
   * This methods defines the serialization result of this class. Returns the
   * numerical elements of this quaternion in an array of format `[x, y, z, w]`.
   *
   * @return {Array<number>} The serialized quaternion.
   */
  toJSON() {
    return this.toArray();
  }
  _onChange(callback) {
    return this._onChangeCallback = callback, this;
  }
  _onChangeCallback() {
  }
  *[Symbol.iterator]() {
    yield this._x, yield this._y, yield this._z, yield this._w;
  }
}, _Vector3 = class {
  /**
   * Constructs a new 3D vector.
   *
   * @param {number} [x=0] - The x value of this vector.
   * @param {number} [y=0] - The y value of this vector.
   * @param {number} [z=0] - The z value of this vector.
   */
  constructor(x = 0, y = 0, z = 0) {
    this.x = x, this.y = y, this.z = z;
  }
  /**
   * Sets the vector components.
   *
   * @param {number} x - The value of the x component.
   * @param {number} y - The value of the y component.
   * @param {number} z - The value of the z component.
   * @return {Vector3} A reference to this vector.
   */
  set(x, y, z) {
    return z === void 0 && (z = this.z), this.x = x, this.y = y, this.z = z, this;
  }
  /**
   * Sets the vector components to the same value.
   *
   * @param {number} scalar - The value to set for all vector components.
   * @return {Vector3} A reference to this vector.
   */
  setScalar(scalar) {
    return this.x = scalar, this.y = scalar, this.z = scalar, this;
  }
  /**
   * Sets the vector's x component to the given value.
   *
   * @param {number} x - The value to set.
   * @return {Vector3} A reference to this vector.
   */
  setX(x) {
    return this.x = x, this;
  }
  /**
   * Sets the vector's y component to the given value.
   *
   * @param {number} y - The value to set.
   * @return {Vector3} A reference to this vector.
   */
  setY(y) {
    return this.y = y, this;
  }
  /**
   * Sets the vector's z component to the given value.
   *
   * @param {number} z - The value to set.
   * @return {Vector3} A reference to this vector.
   */
  setZ(z) {
    return this.z = z, this;
  }
  /**
   * Allows to set a vector component with an index.
   *
   * @param {number} index - The component index. `0` equals to x, `1` equals to y, `2` equals to z.
   * @param {number} value - The value to set.
   * @return {Vector3} A reference to this vector.
   */
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      case 2:
        this.z = value;
        break;
      default:
        throw new Error("THREE.Vector3: index is out of range: " + index);
    }
    return this;
  }
  /**
   * Returns the value of the vector component which matches the given index.
   *
   * @param {number} index - The component index. `0` equals to x, `1` equals to y, `2` equals to z.
   * @return {number} A vector component value.
   */
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      default:
        throw new Error("THREE.Vector3: index is out of range: " + index);
    }
  }
  /**
   * Returns a new vector with copied values from this instance.
   *
   * @return {Vector3} A clone of this instance.
   */
  clone() {
    return new this.constructor(this.x, this.y, this.z);
  }
  /**
   * Copies the values of the given vector to this instance.
   *
   * @param {Vector3} v - The vector to copy.
   * @return {Vector3} A reference to this vector.
   */
  copy(v) {
    return this.x = v.x, this.y = v.y, this.z = v.z, this;
  }
  /**
   * Adds the given vector to this instance.
   *
   * @param {Vector3} v - The vector to add.
   * @return {Vector3} A reference to this vector.
   */
  add(v) {
    return this.x += v.x, this.y += v.y, this.z += v.z, this;
  }
  /**
   * Adds the given scalar value to all components of this instance.
   *
   * @param {number} s - The scalar to add.
   * @return {Vector3} A reference to this vector.
   */
  addScalar(s) {
    return this.x += s, this.y += s, this.z += s, this;
  }
  /**
   * Adds the given vectors and stores the result in this instance.
   *
   * @param {Vector3} a - The first vector.
   * @param {Vector3} b - The second vector.
   * @return {Vector3} A reference to this vector.
   */
  addVectors(a, b) {
    return this.x = a.x + b.x, this.y = a.y + b.y, this.z = a.z + b.z, this;
  }
  /**
   * Adds the given vector scaled by the given factor to this instance.
   *
   * @param {Vector3|Vector4} v - The vector.
   * @param {number} s - The factor that scales `v`.
   * @return {Vector3} A reference to this vector.
   */
  addScaledVector(v, s) {
    return this.x += v.x * s, this.y += v.y * s, this.z += v.z * s, this;
  }
  /**
   * Subtracts the given vector from this instance.
   *
   * @param {Vector3} v - The vector to subtract.
   * @return {Vector3} A reference to this vector.
   */
  sub(v) {
    return this.x -= v.x, this.y -= v.y, this.z -= v.z, this;
  }
  /**
   * Subtracts the given scalar value from all components of this instance.
   *
   * @param {number} s - The scalar to subtract.
   * @return {Vector3} A reference to this vector.
   */
  subScalar(s) {
    return this.x -= s, this.y -= s, this.z -= s, this;
  }
  /**
   * Subtracts the given vectors and stores the result in this instance.
   *
   * @param {Vector3} a - The first vector.
   * @param {Vector3} b - The second vector.
   * @return {Vector3} A reference to this vector.
   */
  subVectors(a, b) {
    return this.x = a.x - b.x, this.y = a.y - b.y, this.z = a.z - b.z, this;
  }
  /**
   * Multiplies the given vector with this instance.
   *
   * @param {Vector3} v - The vector to multiply.
   * @return {Vector3} A reference to this vector.
   */
  multiply(v) {
    return this.x *= v.x, this.y *= v.y, this.z *= v.z, this;
  }
  /**
   * Multiplies the given scalar value with all components of this instance.
   *
   * @param {number} scalar - The scalar to multiply.
   * @return {Vector3} A reference to this vector.
   */
  multiplyScalar(scalar) {
    return this.x *= scalar, this.y *= scalar, this.z *= scalar, this;
  }
  /**
   * Multiplies the given vectors and stores the result in this instance.
   *
   * @param {Vector3} a - The first vector.
   * @param {Vector3} b - The second vector.
   * @return {Vector3} A reference to this vector.
   */
  multiplyVectors(a, b) {
    return this.x = a.x * b.x, this.y = a.y * b.y, this.z = a.z * b.z, this;
  }
  /**
   * Applies the given Euler rotation to this vector.
   *
   * @param {Euler} euler - The Euler angles.
   * @return {Vector3} A reference to this vector.
   */
  applyEuler(euler) {
    return this.applyQuaternion(_quaternion$5.setFromEuler(euler));
  }
  /**
   * Applies a rotation specified by an axis and an angle to this vector.
   *
   * @param {Vector3} axis - A normalized vector representing the rotation axis.
   * @param {number} angle - The angle in radians.
   * @return {Vector3} A reference to this vector.
   */
  applyAxisAngle(axis, angle) {
    return this.applyQuaternion(_quaternion$5.setFromAxisAngle(axis, angle));
  }
  /**
   * Multiplies this vector with the given 3x3 matrix.
   *
   * @param {Matrix3} m - The 3x3 matrix.
   * @return {Vector3} A reference to this vector.
   */
  applyMatrix3(m2) {
    let x = this.x, y = this.y, z = this.z, e2 = m2.elements;
    return this.x = e2[0] * x + e2[3] * y + e2[6] * z, this.y = e2[1] * x + e2[4] * y + e2[7] * z, this.z = e2[2] * x + e2[5] * y + e2[8] * z, this;
  }
  /**
   * Multiplies this vector by the given normal matrix and normalizes
   * the result.
   *
   * @param {Matrix3} m - The normal matrix.
   * @return {Vector3} A reference to this vector.
   */
  applyNormalMatrix(m2) {
    return this.applyMatrix3(m2).normalize();
  }
  /**
   * Multiplies this vector (with an implicit 1 in the 4th dimension) by m, and
   * divides by perspective.
   *
   * @param {Matrix4} m - The matrix to apply.
   * @return {Vector3} A reference to this vector.
   */
  applyMatrix4(m2) {
    let x = this.x, y = this.y, z = this.z, e2 = m2.elements, w = 1 / (e2[3] * x + e2[7] * y + e2[11] * z + e2[15]);
    return this.x = (e2[0] * x + e2[4] * y + e2[8] * z + e2[12]) * w, this.y = (e2[1] * x + e2[5] * y + e2[9] * z + e2[13]) * w, this.z = (e2[2] * x + e2[6] * y + e2[10] * z + e2[14]) * w, this;
  }
  /**
   * Applies the given Quaternion to this vector.
   *
   * @param {Quaternion} q - The Quaternion.
   * @return {Vector3} A reference to this vector.
   */
  applyQuaternion(q) {
    let vx = this.x, vy = this.y, vz = this.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w, tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
    return this.x = vx + qw * tx + qy * tz - qz * ty, this.y = vy + qw * ty + qz * tx - qx * tz, this.z = vz + qw * tz + qx * ty - qy * tx, this;
  }
  /**
   * Projects this vector from world space into the camera's normalized
   * device coordinate (NDC) space.
   *
   * @param {Camera} camera - The camera.
   * @return {Vector3} A reference to this vector.
   */
  project(camera) {
    return this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  }
  /**
   * Unprojects this vector from the camera's normalized device coordinate (NDC)
   * space into world space.
   *
   * @param {Camera} camera - The camera.
   * @return {Vector3} A reference to this vector.
   */
  unproject(camera) {
    return this.applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld);
  }
  /**
   * Transforms this vector by the upper left 3x3 sub-matrix of the given 4x4 matrix,
   * and normalizes the result.
   *
   * @param {Matrix4} m - The matrix.
   * @return {Vector3} A reference to this vector.
   */
  transformDirection(m2) {
    let x = this.x, y = this.y, z = this.z, e2 = m2.elements;
    return this.x = e2[0] * x + e2[4] * y + e2[8] * z, this.y = e2[1] * x + e2[5] * y + e2[9] * z, this.z = e2[2] * x + e2[6] * y + e2[10] * z, this.normalize();
  }
  /**
   * Divides this instance by the given vector.
   *
   * @param {Vector3} v - The vector to divide.
   * @return {Vector3} A reference to this vector.
   */
  divide(v) {
    return this.x /= v.x, this.y /= v.y, this.z /= v.z, this;
  }
  /**
   * Divides this vector by the given scalar.
   *
   * @param {number} scalar - The scalar to divide.
   * @return {Vector3} A reference to this vector.
   */
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }
  /**
   * If this vector's x, y or z value is greater than the given vector's x, y or z
   * value, replace that value with the corresponding min value.
   *
   * @param {Vector3} v - The vector.
   * @return {Vector3} A reference to this vector.
   */
  min(v) {
    return this.x = Math.min(this.x, v.x), this.y = Math.min(this.y, v.y), this.z = Math.min(this.z, v.z), this;
  }
  /**
   * If this vector's x, y or z value is less than the given vector's x, y or z
   * value, replace that value with the corresponding max value.
   *
   * @param {Vector3} v - The vector.
   * @return {Vector3} A reference to this vector.
   */
  max(v) {
    return this.x = Math.max(this.x, v.x), this.y = Math.max(this.y, v.y), this.z = Math.max(this.z, v.z), this;
  }
  /**
   * If this vector's x, y or z value is greater than the max vector's x, y or z
   * value, it is replaced by the corresponding value.
   * If this vector's x, y or z value is less than the min vector's x, y or z value,
   * it is replaced by the corresponding value.
   *
   * @param {Vector3} min - The minimum x, y and z values.
   * @param {Vector3} max - The maximum x, y and z values in the desired range.
   * @return {Vector3} A reference to this vector.
   */
  clamp(min, max) {
    return this.x = clamp(this.x, min.x, max.x), this.y = clamp(this.y, min.y, max.y), this.z = clamp(this.z, min.z, max.z), this;
  }
  /**
   * If this vector's x, y or z values are greater than the max value, they are
   * replaced by the max value.
   * If this vector's x, y or z values are less than the min value, they are
   * replaced by the min value.
   *
   * @param {number} minVal - The minimum value the components will be clamped to.
   * @param {number} maxVal - The maximum value the components will be clamped to.
   * @return {Vector3} A reference to this vector.
   */
  clampScalar(minVal, maxVal) {
    return this.x = clamp(this.x, minVal, maxVal), this.y = clamp(this.y, minVal, maxVal), this.z = clamp(this.z, minVal, maxVal), this;
  }
  /**
   * If this vector's length is greater than the max value, it is replaced by
   * the max value.
   * If this vector's length is less than the min value, it is replaced by the
   * min value.
   *
   * @param {number} min - The minimum value the vector length will be clamped to.
   * @param {number} max - The maximum value the vector length will be clamped to.
   * @return {Vector3} A reference to this vector.
   */
  clampLength(min, max) {
    let length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max));
  }
  /**
   * The components of this vector are rounded down to the nearest integer value.
   *
   * @return {Vector3} A reference to this vector.
   */
  floor() {
    return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
  }
  /**
   * The components of this vector are rounded up to the nearest integer value.
   *
   * @return {Vector3} A reference to this vector.
   */
  ceil() {
    return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
  }
  /**
   * The components of this vector are rounded to the nearest integer value
   *
   * @return {Vector3} A reference to this vector.
   */
  round() {
    return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
  }
  /**
   * The components of this vector are rounded towards zero (up if negative,
   * down if positive) to an integer value.
   *
   * @return {Vector3} A reference to this vector.
   */
  roundToZero() {
    return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
  }
  /**
   * Inverts this vector - i.e. sets x = -x, y = -y and z = -z.
   *
   * @return {Vector3} A reference to this vector.
   */
  negate() {
    return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
  }
  /**
   * Calculates the dot product of the given vector with this instance.
   *
   * @param {Vector3} v - The vector to compute the dot product with.
   * @return {number} The result of the dot product.
   */
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  /**
   * Computes the square of the Euclidean length (straight-line length) from
   * (0, 0, 0) to (x, y, z). If you are comparing the lengths of vectors, you should
   * compare the length squared instead as it is slightly more efficient to calculate.
   *
   * @return {number} The square length of this vector.
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  /**
   * Computes the  Euclidean length (straight-line length) from (0, 0, 0) to (x, y, z).
   *
   * @return {number} The length of this vector.
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  /**
   * Computes the Manhattan length of this vector.
   *
   * @return {number} The length of this vector.
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
  }
  /**
   * Converts this vector to a unit vector - that is, sets it equal to a vector
   * with the same direction as this one, but with a vector length of `1`.
   *
   * @return {Vector3} A reference to this vector.
   */
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  /**
   * Sets this vector to a vector with the same direction as this one, but
   * with the specified length.
   *
   * @param {number} length - The new length of this vector.
   * @return {Vector3} A reference to this vector.
   */
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
  /**
   * Linearly interpolates between the given vector and this instance, where
   * alpha is the percent distance along the line - alpha = 0 will be this
   * vector, and alpha = 1 will be the given one.
   *
   * @param {Vector3} v - The vector to interpolate towards.
   * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector3} A reference to this vector.
   */
  lerp(v, alpha) {
    return this.x += (v.x - this.x) * alpha, this.y += (v.y - this.y) * alpha, this.z += (v.z - this.z) * alpha, this;
  }
  /**
   * Linearly interpolates between the given vectors, where alpha is the percent
   * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
   * be the second one. The result is stored in this instance.
   *
   * @param {Vector3} v1 - The first vector.
   * @param {Vector3} v2 - The second vector.
   * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector3} A reference to this vector.
   */
  lerpVectors(v1, v2, alpha) {
    return this.x = v1.x + (v2.x - v1.x) * alpha, this.y = v1.y + (v2.y - v1.y) * alpha, this.z = v1.z + (v2.z - v1.z) * alpha, this;
  }
  /**
   * Calculates the cross product of the given vector with this instance.
   *
   * @param {Vector3} v - The vector to compute the cross product with.
   * @return {Vector3} The result of the cross product.
   */
  cross(v) {
    return this.crossVectors(this, v);
  }
  /**
   * Calculates the cross product of the given vectors and stores the result
   * in this instance.
   *
   * @param {Vector3} a - The first vector.
   * @param {Vector3} b - The second vector.
   * @return {Vector3} A reference to this vector.
   */
  crossVectors(a, b) {
    let ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
    return this.x = ay * bz - az * by, this.y = az * bx - ax * bz, this.z = ax * by - ay * bx, this;
  }
  /**
   * Projects this vector onto the given one.
   *
   * @param {Vector3} v - The vector to project to.
   * @return {Vector3} A reference to this vector.
   */
  projectOnVector(v) {
    let denominator = v.lengthSq();
    if (denominator === 0)
      return this.set(0, 0, 0);
    let scalar = v.dot(this) / denominator;
    return this.copy(v).multiplyScalar(scalar);
  }
  /**
   * Projects this vector onto a plane by subtracting this
   * vector projected onto the plane's normal from this vector.
   *
   * @param {Vector3} planeNormal - The plane normal.
   * @return {Vector3} A reference to this vector.
   */
  projectOnPlane(planeNormal) {
    return _vector$c.copy(this).projectOnVector(planeNormal), this.sub(_vector$c);
  }
  /**
   * Reflects this vector off a plane orthogonal to the given normal vector.
   *
   * @param {Vector3} normal - The (normalized) normal vector.
   * @return {Vector3} A reference to this vector.
   */
  reflect(normal) {
    return this.sub(_vector$c.copy(normal).multiplyScalar(2 * this.dot(normal)));
  }
  /**
   * Returns the angle between the given vector and this instance in radians.
   *
   * @param {Vector3} v - The vector to compute the angle with.
   * @return {number} The angle in radians.
   */
  angleTo(v) {
    let denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
    if (denominator === 0)
      return Math.PI / 2;
    let theta = this.dot(v) / denominator;
    return Math.acos(clamp(theta, -1, 1));
  }
  /**
   * Computes the distance from the given vector to this instance.
   *
   * @param {Vector3} v - The vector to compute the distance to.
   * @return {number} The distance.
   */
  distanceTo(v) {
    return Math.sqrt(this.distanceToSquared(v));
  }
  /**
   * Computes the squared distance from the given vector to this instance.
   * If you are just comparing the distance with another distance, you should compare
   * the distance squared instead as it is slightly more efficient to calculate.
   *
   * @param {Vector3} v - The vector to compute the squared distance to.
   * @return {number} The squared distance.
   */
  distanceToSquared(v) {
    let dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  /**
   * Computes the Manhattan distance from the given vector to this instance.
   *
   * @param {Vector3} v - The vector to compute the Manhattan distance to.
   * @return {number} The Manhattan distance.
   */
  manhattanDistanceTo(v) {
    return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
  }
  /**
   * Sets the vector components from the given spherical coordinates.
   *
   * @param {Spherical} s - The spherical coordinates.
   * @return {Vector3} A reference to this vector.
   */
  setFromSpherical(s) {
    return this.setFromSphericalCoords(s.radius, s.phi, s.theta);
  }
  /**
   * Sets the vector components from the given spherical coordinates.
   *
   * @param {number} radius - The radius.
   * @param {number} phi - The phi angle in radians.
   * @param {number} theta - The theta angle in radians.
   * @return {Vector3} A reference to this vector.
   */
  setFromSphericalCoords(radius, phi, theta) {
    let sinPhiRadius = Math.sin(phi) * radius;
    return this.x = sinPhiRadius * Math.sin(theta), this.y = Math.cos(phi) * radius, this.z = sinPhiRadius * Math.cos(theta), this;
  }
  /**
   * Sets the vector components from the given cylindrical coordinates.
   *
   * @param {Cylindrical} c - The cylindrical coordinates.
   * @return {Vector3} A reference to this vector.
   */
  setFromCylindrical(c) {
    return this.setFromCylindricalCoords(c.radius, c.theta, c.y);
  }
  /**
   * Sets the vector components from the given cylindrical coordinates.
   *
   * @param {number} radius - The radius.
   * @param {number} theta - The theta angle in radians.
   * @param {number} y - The y value.
   * @return {Vector3} A reference to this vector.
   */
  setFromCylindricalCoords(radius, theta, y) {
    return this.x = radius * Math.sin(theta), this.y = y, this.z = radius * Math.cos(theta), this;
  }
  /**
   * Sets the vector components to the position elements of the
   * given transformation matrix.
   *
   * @param {Matrix4} m - The 4x4 matrix.
   * @return {Vector3} A reference to this vector.
   */
  setFromMatrixPosition(m2) {
    let e2 = m2.elements;
    return this.x = e2[12], this.y = e2[13], this.z = e2[14], this;
  }
  /**
   * Sets the vector components to the scale elements of the
   * given transformation matrix.
   *
   * @param {Matrix4} m - The 4x4 matrix.
   * @return {Vector3} A reference to this vector.
   */
  setFromMatrixScale(m2) {
    let sx = this.setFromMatrixColumn(m2, 0).length(), sy = this.setFromMatrixColumn(m2, 1).length(), sz = this.setFromMatrixColumn(m2, 2).length();
    return this.x = sx, this.y = sy, this.z = sz, this;
  }
  /**
   * Sets the vector components from the specified matrix column.
   *
   * @param {Matrix4} m - The 4x4 matrix.
   * @param {number} index - The column index.
   * @return {Vector3} A reference to this vector.
   */
  setFromMatrixColumn(m2, index) {
    return this.fromArray(m2.elements, index * 4);
  }
  /**
   * Sets the vector components from the specified matrix column.
   *
   * @param {Matrix3} m - The 3x3 matrix.
   * @param {number} index - The column index.
   * @return {Vector3} A reference to this vector.
   */
  setFromMatrix3Column(m2, index) {
    return this.fromArray(m2.elements, index * 3);
  }
  /**
   * Sets the vector components from the given Euler angles.
   *
   * @param {Euler} e - The Euler angles to set.
   * @return {Vector3} A reference to this vector.
   */
  setFromEuler(e2) {
    return this.x = e2._x, this.y = e2._y, this.z = e2._z, this;
  }
  /**
   * Sets the vector components from the RGB components of the
   * given color.
   *
   * @param {Color} c - The color to set.
   * @return {Vector3} A reference to this vector.
   */
  setFromColor(c) {
    return this.x = c.r, this.y = c.g, this.z = c.b, this;
  }
  /**
   * Returns `true` if this vector is equal with the given one.
   *
   * @param {Vector3} v - The vector to test for equality.
   * @return {boolean} Whether this vector is equal with the given one.
   */
  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z;
  }
  /**
   * Sets this vector's x value to be `array[ offset ]`, y value to be `array[ offset + 1 ]`
   * and z value to be `array[ offset + 2 ]`.
   *
   * @param {Array<number>} array - An array holding the vector component values.
   * @param {number} [offset=0] - The offset into the array.
   * @return {Vector3} A reference to this vector.
   */
  fromArray(array, offset = 0) {
    return this.x = array[offset], this.y = array[offset + 1], this.z = array[offset + 2], this;
  }
  /**
   * Writes the components of this vector to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the vector components.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The vector components.
   */
  toArray(array = [], offset = 0) {
    return array[offset] = this.x, array[offset + 1] = this.y, array[offset + 2] = this.z, array;
  }
  /**
   * Sets the components of this vector from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
   * @param {number} index - The index into the attribute.
   * @return {Vector3} A reference to this vector.
   */
  fromBufferAttribute(attribute, index) {
    return this.x = attribute.getX(index), this.y = attribute.getY(index), this.z = attribute.getZ(index), this;
  }
  /**
   * Sets each component of this vector to a pseudo-random value between `0` and
   * `1`, excluding `1`.
   *
   * @return {Vector3} A reference to this vector.
   */
  random() {
    return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
  }
  /**
   * Sets this vector to a uniformly random point on a unit sphere.
   *
   * @return {Vector3} A reference to this vector.
   */
  randomDirection() {
    let theta = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, c = Math.sqrt(1 - u * u);
    return this.x = c * Math.cos(theta), this.y = u, this.z = c * Math.sin(theta), this;
  }
  *[Symbol.iterator]() {
    yield this.x, yield this.y, yield this.z;
  }
}, Vector3 = _Vector3;
(() => {
  _Vector3.prototype.isVector3 = !0;
})();
var _vector$c = /* @__PURE__ */ new Vector3(), _quaternion$5 = /* @__PURE__ */ new Quaternion(), _Matrix3 = class {
  /**
   * Constructs a new 3x3 matrix. The arguments are supposed to be
   * in row-major order. If no arguments are provided, the constructor
   * initializes the matrix as an identity matrix.
   *
   * @param {number} [n11] - 1-1 matrix element.
   * @param {number} [n12] - 1-2 matrix element.
   * @param {number} [n13] - 1-3 matrix element.
   * @param {number} [n21] - 2-1 matrix element.
   * @param {number} [n22] - 2-2 matrix element.
   * @param {number} [n23] - 2-3 matrix element.
   * @param {number} [n31] - 3-1 matrix element.
   * @param {number} [n32] - 3-2 matrix element.
   * @param {number} [n33] - 3-3 matrix element.
   */
  constructor(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    this.elements = [
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ], n11 !== void 0 && this.set(n11, n12, n13, n21, n22, n23, n31, n32, n33);
  }
  /**
   * Sets the elements of the matrix.The arguments are supposed to be
   * in row-major order.
   *
   * @param {number} [n11] - 1-1 matrix element.
   * @param {number} [n12] - 1-2 matrix element.
   * @param {number} [n13] - 1-3 matrix element.
   * @param {number} [n21] - 2-1 matrix element.
   * @param {number} [n22] - 2-2 matrix element.
   * @param {number} [n23] - 2-3 matrix element.
   * @param {number} [n31] - 3-1 matrix element.
   * @param {number} [n32] - 3-2 matrix element.
   * @param {number} [n33] - 3-3 matrix element.
   * @return {Matrix3} A reference to this matrix.
   */
  set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    let te = this.elements;
    return te[0] = n11, te[1] = n21, te[2] = n31, te[3] = n12, te[4] = n22, te[5] = n32, te[6] = n13, te[7] = n23, te[8] = n33, this;
  }
  /**
   * Sets this matrix to the 3x3 identity matrix.
   *
   * @return {Matrix3} A reference to this matrix.
   */
  identity() {
    return this.set(
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Copies the values of the given matrix to this instance.
   *
   * @param {Matrix3} m - The matrix to copy.
   * @return {Matrix3} A reference to this matrix.
   */
  copy(m2) {
    let te = this.elements, me = m2.elements;
    return te[0] = me[0], te[1] = me[1], te[2] = me[2], te[3] = me[3], te[4] = me[4], te[5] = me[5], te[6] = me[6], te[7] = me[7], te[8] = me[8], this;
  }
  /**
   * Extracts the basis of this matrix into the three axis vectors provided.
   *
   * @param {Vector3} xAxis - The basis's x axis.
   * @param {Vector3} yAxis - The basis's y axis.
   * @param {Vector3} zAxis - The basis's z axis.
   * @return {Matrix3} A reference to this matrix.
   */
  extractBasis(xAxis, yAxis, zAxis) {
    return xAxis.setFromMatrix3Column(this, 0), yAxis.setFromMatrix3Column(this, 1), zAxis.setFromMatrix3Column(this, 2), this;
  }
  /**
   * Set this matrix to the upper 3x3 matrix of the given 4x4 matrix.
   *
   * @param {Matrix4} m - The 4x4 matrix.
   * @return {Matrix3} A reference to this matrix.
   */
  setFromMatrix4(m2) {
    let me = m2.elements;
    return this.set(
      me[0],
      me[4],
      me[8],
      me[1],
      me[5],
      me[9],
      me[2],
      me[6],
      me[10]
    ), this;
  }
  /**
   * Post-multiplies this matrix by the given 3x3 matrix.
   *
   * @param {Matrix3} m - The matrix to multiply with.
   * @return {Matrix3} A reference to this matrix.
   */
  multiply(m2) {
    return this.multiplyMatrices(this, m2);
  }
  /**
   * Pre-multiplies this matrix by the given 3x3 matrix.
   *
   * @param {Matrix3} m - The matrix to multiply with.
   * @return {Matrix3} A reference to this matrix.
   */
  premultiply(m2) {
    return this.multiplyMatrices(m2, this);
  }
  /**
   * Multiples the given 3x3 matrices and stores the result
   * in this matrix.
   *
   * @param {Matrix3} a - The first matrix.
   * @param {Matrix3} b - The second matrix.
   * @return {Matrix3} A reference to this matrix.
   */
  multiplyMatrices(a, b) {
    let ae = a.elements, be = b.elements, te = this.elements, a11 = ae[0], a12 = ae[3], a13 = ae[6], a21 = ae[1], a22 = ae[4], a23 = ae[7], a31 = ae[2], a32 = ae[5], a33 = ae[8], b11 = be[0], b12 = be[3], b13 = be[6], b21 = be[1], b22 = be[4], b23 = be[7], b31 = be[2], b32 = be[5], b33 = be[8];
    return te[0] = a11 * b11 + a12 * b21 + a13 * b31, te[3] = a11 * b12 + a12 * b22 + a13 * b32, te[6] = a11 * b13 + a12 * b23 + a13 * b33, te[1] = a21 * b11 + a22 * b21 + a23 * b31, te[4] = a21 * b12 + a22 * b22 + a23 * b32, te[7] = a21 * b13 + a22 * b23 + a23 * b33, te[2] = a31 * b11 + a32 * b21 + a33 * b31, te[5] = a31 * b12 + a32 * b22 + a33 * b32, te[8] = a31 * b13 + a32 * b23 + a33 * b33, this;
  }
  /**
   * Multiplies every component of the matrix by the given scalar.
   *
   * @param {number} s - The scalar.
   * @return {Matrix3} A reference to this matrix.
   */
  multiplyScalar(s) {
    let te = this.elements;
    return te[0] *= s, te[3] *= s, te[6] *= s, te[1] *= s, te[4] *= s, te[7] *= s, te[2] *= s, te[5] *= s, te[8] *= s, this;
  }
  /**
   * Computes and returns the determinant of this matrix.
   *
   * @return {number} The determinant.
   */
  determinant() {
    let te = this.elements, a = te[0], b = te[1], c = te[2], d = te[3], e2 = te[4], f = te[5], g2 = te[6], h = te[7], i = te[8];
    return a * e2 * i - a * f * h - b * d * i + b * f * g2 + c * d * h - c * e2 * g2;
  }
  /**
   * Inverts this matrix, using the [analytic method](https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution).
   * You can not invert with a determinant of zero. If you attempt this, the method produces
   * a zero matrix instead.
   *
   * @return {Matrix3} A reference to this matrix.
   */
  invert() {
    let te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n12 = te[3], n22 = te[4], n32 = te[5], n13 = te[6], n23 = te[7], n33 = te[8], t11 = n33 * n22 - n32 * n23, t12 = n32 * n13 - n33 * n12, t13 = n23 * n12 - n22 * n13, det = n11 * t11 + n21 * t12 + n31 * t13;
    if (det === 0)
      return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
    let detInv = 1 / det;
    return te[0] = t11 * detInv, te[1] = (n31 * n23 - n33 * n21) * detInv, te[2] = (n32 * n21 - n31 * n22) * detInv, te[3] = t12 * detInv, te[4] = (n33 * n11 - n31 * n13) * detInv, te[5] = (n31 * n12 - n32 * n11) * detInv, te[6] = t13 * detInv, te[7] = (n21 * n13 - n23 * n11) * detInv, te[8] = (n22 * n11 - n21 * n12) * detInv, this;
  }
  /**
   * Transposes this matrix in place.
   *
   * @return {Matrix3} A reference to this matrix.
   */
  transpose() {
    let tmp, m2 = this.elements;
    return tmp = m2[1], m2[1] = m2[3], m2[3] = tmp, tmp = m2[2], m2[2] = m2[6], m2[6] = tmp, tmp = m2[5], m2[5] = m2[7], m2[7] = tmp, this;
  }
  /**
   * Computes the normal matrix which is the inverse transpose of the upper
   * left 3x3 portion of the given 4x4 matrix.
   *
   * @param {Matrix4} matrix4 - The 4x4 matrix.
   * @return {Matrix3} A reference to this matrix.
   */
  getNormalMatrix(matrix4) {
    return this.setFromMatrix4(matrix4).invert().transpose();
  }
  /**
   * Transposes this matrix into the supplied array, and returns itself unchanged.
   *
   * @param {Array<number>} r - An array to store the transposed matrix elements.
   * @return {Matrix3} A reference to this matrix.
   */
  transposeIntoArray(r) {
    let m2 = this.elements;
    return r[0] = m2[0], r[1] = m2[3], r[2] = m2[6], r[3] = m2[1], r[4] = m2[4], r[5] = m2[7], r[6] = m2[2], r[7] = m2[5], r[8] = m2[8], this;
  }
  /**
   * Sets the UV transform matrix from offset, repeat, rotation, and center.
   *
   * @param {number} tx - Offset x.
   * @param {number} ty - Offset y.
   * @param {number} sx - Repeat x.
   * @param {number} sy - Repeat y.
   * @param {number} rotation - Rotation, in radians. Positive values rotate counterclockwise.
   * @param {number} cx - Center x of rotation.
   * @param {number} cy - Center y of rotation
   * @return {Matrix3} A reference to this matrix.
   */
  setUvTransform(tx, ty, sx, sy, rotation, cx, cy) {
    let c = Math.cos(rotation), s = Math.sin(rotation);
    return this.set(
      sx * c,
      sx * s,
      -sx * (c * cx + s * cy) + cx + tx,
      -sy * s,
      sy * c,
      -sy * (-s * cx + c * cy) + cy + ty,
      0,
      0,
      1
    ), this;
  }
  /**
   * Scales this matrix with the given scalar values.
   *
   * @deprecated
   * @param {number} sx - The amount to scale in the X axis.
   * @param {number} sy - The amount to scale in the Y axis.
   * @return {Matrix3} A reference to this matrix.
   */
  scale(sx, sy) {
    return warnOnce("Matrix3: .scale() is deprecated. Use .makeScale() instead."), this.premultiply(_m3.makeScale(sx, sy)), this;
  }
  /**
   * Rotates this matrix by the given angle.
   *
   * @deprecated
   * @param {number} theta - The rotation in radians.
   * @return {Matrix3} A reference to this matrix.
   */
  rotate(theta) {
    return warnOnce("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."), this.premultiply(_m3.makeRotation(-theta)), this;
  }
  /**
   * Translates this matrix by the given scalar values.
   *
   * @deprecated
   * @param {number} tx - The amount to translate in the X axis.
   * @param {number} ty - The amount to translate in the Y axis.
   * @return {Matrix3} A reference to this matrix.
   */
  translate(tx, ty) {
    return warnOnce("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."), this.premultiply(_m3.makeTranslation(tx, ty)), this;
  }
  // for 2D Transforms
  /**
   * Sets this matrix as a 2D translation transform.
   *
   * @param {number|Vector2} x - The amount to translate in the X axis or alternatively a translation vector.
   * @param {number} y - The amount to translate in the Y axis.
   * @return {Matrix3} A reference to this matrix.
   */
  makeTranslation(x, y) {
    return x.isVector2 ? this.set(
      1,
      0,
      x.x,
      0,
      1,
      x.y,
      0,
      0,
      1
    ) : this.set(
      1,
      0,
      x,
      0,
      1,
      y,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a 2D rotational transformation.
   *
   * @param {number} theta - The rotation in radians.
   * @return {Matrix3} A reference to this matrix.
   */
  makeRotation(theta) {
    let c = Math.cos(theta), s = Math.sin(theta);
    return this.set(
      c,
      -s,
      0,
      s,
      c,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a 2D scale transform.
   *
   * @param {number} x - The amount to scale in the X axis.
   * @param {number} y - The amount to scale in the Y axis.
   * @return {Matrix3} A reference to this matrix.
   */
  makeScale(x, y) {
    return this.set(
      x,
      0,
      0,
      0,
      y,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Returns `true` if this matrix is equal with the given one.
   *
   * @param {Matrix3} matrix - The matrix to test for equality.
   * @return {boolean} Whether this matrix is equal with the given one.
   */
  equals(matrix) {
    let te = this.elements, me = matrix.elements;
    for (let i = 0; i < 9; i++)
      if (te[i] !== me[i])
        return !1;
    return !0;
  }
  /**
   * Sets the elements of the matrix from the given array.
   *
   * @param {Array<number>} array - The matrix elements in column-major order.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Matrix3} A reference to this matrix.
   */
  fromArray(array, offset = 0) {
    for (let i = 0; i < 9; i++)
      this.elements[i] = array[i + offset];
    return this;
  }
  /**
   * Writes the elements of this matrix to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the matrix elements in column-major order.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The matrix elements in column-major order.
   */
  toArray(array = [], offset = 0) {
    let te = this.elements;
    return array[offset] = te[0], array[offset + 1] = te[1], array[offset + 2] = te[2], array[offset + 3] = te[3], array[offset + 4] = te[4], array[offset + 5] = te[5], array[offset + 6] = te[6], array[offset + 7] = te[7], array[offset + 8] = te[8], array;
  }
  /**
   * Returns a matrix with copied values from this instance.
   *
   * @return {Matrix3} A clone of this instance.
   */
  clone() {
    return new this.constructor().fromArray(this.elements);
  }
}, Matrix3 = _Matrix3;
(() => {
  _Matrix3.prototype.isMatrix3 = !0;
})();
var _m3 = /* @__PURE__ */ new Matrix3(), LINEAR_REC709_TO_XYZ = /* @__PURE__ */ new Matrix3().set(
  0.4123908,
  0.3575843,
  0.1804808,
  0.212639,
  0.7151687,
  0.0721923,
  0.0193308,
  0.1191948,
  0.9505322
), XYZ_TO_LINEAR_REC709 = /* @__PURE__ */ new Matrix3().set(
  3.2409699,
  -1.5373832,
  -0.4986108,
  -0.9692436,
  1.8759675,
  0.0415551,
  0.0556301,
  -0.203977,
  1.0569715
);
function createColorManagement() {
  let ColorManagement2 = {
    enabled: !0,
    workingColorSpace: LinearSRGBColorSpace,
    /**
     * Implementations of supported color spaces.
     *
     * Required:
     *	- primaries: chromaticity coordinates [ rx ry gx gy bx by ]
     *	- whitePoint: reference white [ x y ]
     *	- transfer: transfer function (pre-defined)
     *	- toXYZ: Matrix3 RGB to XYZ transform
     *	- fromXYZ: Matrix3 XYZ to RGB transform
     *	- luminanceCoefficients: RGB luminance coefficients
     *
     * Optional:
     *  - outputColorSpaceConfig: { drawingBufferColorSpace: ColorSpace, toneMappingMode: 'extended' | 'standard' }
     *  - workingColorSpaceConfig: { unpackColorSpace: ColorSpace }
     *
     * Reference:
     * - https://www.russellcottrell.com/photo/matrixCalculator.htm
     */
    spaces: {},
    convert: function(color, sourceColorSpace, targetColorSpace) {
      return this.enabled === !1 || sourceColorSpace === targetColorSpace || !sourceColorSpace || !targetColorSpace || (this.spaces[sourceColorSpace].transfer === SRGBTransfer && (color.r = SRGBToLinear(color.r), color.g = SRGBToLinear(color.g), color.b = SRGBToLinear(color.b)), this.spaces[sourceColorSpace].primaries !== this.spaces[targetColorSpace].primaries && (color.applyMatrix3(this.spaces[sourceColorSpace].toXYZ), color.applyMatrix3(this.spaces[targetColorSpace].fromXYZ)), this.spaces[targetColorSpace].transfer === SRGBTransfer && (color.r = LinearToSRGB(color.r), color.g = LinearToSRGB(color.g), color.b = LinearToSRGB(color.b))), color;
    },
    workingToColorSpace: function(color, targetColorSpace) {
      return this.convert(color, this.workingColorSpace, targetColorSpace);
    },
    colorSpaceToWorking: function(color, sourceColorSpace) {
      return this.convert(color, sourceColorSpace, this.workingColorSpace);
    },
    getPrimaries: function(colorSpace) {
      return this.spaces[colorSpace].primaries;
    },
    getTransfer: function(colorSpace) {
      return colorSpace === NoColorSpace ? LinearTransfer : this.spaces[colorSpace].transfer;
    },
    getToneMappingMode: function(colorSpace) {
      return this.spaces[colorSpace].outputColorSpaceConfig.toneMappingMode || "standard";
    },
    getLuminanceCoefficients: function(target, colorSpace = this.workingColorSpace) {
      return target.fromArray(this.spaces[colorSpace].luminanceCoefficients);
    },
    define: function(colorSpaces) {
      Object.assign(this.spaces, colorSpaces);
    },
    // Internal APIs
    _getMatrix: function(targetMatrix, sourceColorSpace, targetColorSpace) {
      return targetMatrix.copy(this.spaces[targetColorSpace].fromXYZ).multiply(this.spaces[sourceColorSpace].toXYZ);
    },
    _getDrawingBufferColorSpace: function(colorSpace) {
      return this.spaces[colorSpace].outputColorSpaceConfig.drawingBufferColorSpace;
    },
    _getUnpackColorSpace: function(colorSpace = this.workingColorSpace) {
      return this.spaces[colorSpace].workingColorSpaceConfig.unpackColorSpace;
    }
  }, REC709_PRIMARIES = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06], REC709_LUMINANCE_COEFFICIENTS = [0.2126, 0.7152, 0.0722], D65 = [0.3127, 0.329];
  return ColorManagement2.define({
    [LinearSRGBColorSpace]: {
      primaries: REC709_PRIMARIES,
      whitePoint: D65,
      transfer: LinearTransfer,
      toXYZ: LINEAR_REC709_TO_XYZ,
      fromXYZ: XYZ_TO_LINEAR_REC709,
      luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS,
      workingColorSpaceConfig: { unpackColorSpace: SRGBColorSpace },
      outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }
    },
    [SRGBColorSpace]: {
      primaries: REC709_PRIMARIES,
      whitePoint: D65,
      transfer: SRGBTransfer,
      toXYZ: LINEAR_REC709_TO_XYZ,
      fromXYZ: XYZ_TO_LINEAR_REC709,
      luminanceCoefficients: REC709_LUMINANCE_COEFFICIENTS,
      outputColorSpaceConfig: { drawingBufferColorSpace: SRGBColorSpace }
    }
  }), ColorManagement2;
}
var ColorManagement = /* @__PURE__ */ createColorManagement();
function SRGBToLinear(c) {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}
function LinearToSRGB(c) {
  return c < 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;
}
var _canvas, ImageUtils = class {
  /**
   * Returns a data URI containing a representation of the given image.
   *
   * @param {(HTMLImageElement|HTMLCanvasElement)} image - The image object.
   * @param {string} [type='image/png'] - Indicates the image format.
   * @return {string} The data URI.
   */
  static getDataURL(image, type = "image/png") {
    if (/^data:/i.test(image.src) || typeof HTMLCanvasElement > "u")
      return image.src;
    let canvas;
    if (image instanceof HTMLCanvasElement)
      canvas = image;
    else {
      _canvas === void 0 && (_canvas = createElementNS("canvas")), _canvas.width = image.width, _canvas.height = image.height;
      let context = _canvas.getContext("2d");
      image instanceof ImageData ? context.putImageData(image, 0, 0) : context.drawImage(image, 0, 0, image.width, image.height), canvas = _canvas;
    }
    return canvas.toDataURL(type);
  }
  /**
   * Converts the given sRGB image data to linear color space.
   *
   * @param {(HTMLImageElement|HTMLCanvasElement|ImageBitmap|Object)} image - The image object.
   * @return {HTMLCanvasElement|Object} The converted image.
   */
  static sRGBToLinear(image) {
    if (typeof HTMLImageElement < "u" && image instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && image instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && image instanceof ImageBitmap) {
      let canvas = createElementNS("canvas");
      canvas.width = image.width, canvas.height = image.height;
      let context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, image.width, image.height);
      let imageData = context.getImageData(0, 0, image.width, image.height), data = imageData.data;
      for (let i = 0; i < data.length; i++)
        data[i] = SRGBToLinear(data[i] / 255) * 255;
      return context.putImageData(imageData, 0, 0), canvas;
    } else if (image.data) {
      let data = image.data.slice(0);
      for (let i = 0; i < data.length; i++)
        data instanceof Uint8Array || data instanceof Uint8ClampedArray ? data[i] = Math.floor(SRGBToLinear(data[i] / 255) * 255) : data[i] = SRGBToLinear(data[i]);
      return {
        data,
        width: image.width,
        height: image.height
      };
    } else
      return warn("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), image;
  }
}, _sourceId = 0, TextureSource = class {
  /**
   * Constructs a new texture source.
   *
   * @param {any} [data=null] - The data definition of a texture.
   */
  constructor(data = null) {
    this.isTextureSource = !0, Object.defineProperty(this, "id", { value: _sourceId++ }), this.uuid = generateUUID(), this.data = data, this.dataReady = !0, this.version = 0;
  }
  /**
   * Returns the dimensions of the source into the given target vector.
   *
   * @param {(Vector2|Vector3)} target - The target object the result is written into.
   * @return {(Vector2|Vector3)} The dimensions of the source.
   */
  getSize(target) {
    let data = this.data;
    return typeof HTMLVideoElement < "u" && data instanceof HTMLVideoElement ? target.set(data.videoWidth, data.videoHeight, 0) : typeof VideoFrame < "u" && data instanceof VideoFrame ? target.set(data.displayWidth, data.displayHeight, 0) : data !== null ? target.set(data.width || 0, data.height || 0, data.depth || 0) : target.set(0, 0, 0), target;
  }
  /**
   * When the property is set to `true`, the engine allocates the memory
   * for the texture (if necessary) and triggers the actual texture upload
   * to the GPU next time the source is used.
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value
   */
  set needsUpdate(value) {
    value === !0 && this.version++;
  }
  /**
   * Serializes the source into JSON.
   *
   * @param {?(Object|string)} meta - An optional value holding meta information about the serialization.
   * @return {Object} A JSON object representing the serialized source.
   * @see {@link ObjectLoader#parse}
   */
  toJSON(meta) {
    let isRootObject = meta === void 0 || typeof meta == "string";
    if (!isRootObject && meta.images[this.uuid] !== void 0)
      return meta.images[this.uuid];
    let output = {
      uuid: this.uuid,
      url: ""
    }, data = this.data;
    if (data !== null) {
      let url;
      if (Array.isArray(data)) {
        url = [];
        for (let i = 0, l = data.length; i < l; i++)
          data[i].isDataTexture ? url.push(serializeImage(data[i].image)) : url.push(serializeImage(data[i]));
      } else
        url = serializeImage(data);
      output.url = url;
    }
    return isRootObject || (meta.images[this.uuid] = output), output;
  }
};
function serializeImage(image) {
  return typeof HTMLImageElement < "u" && image instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && image instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && image instanceof ImageBitmap ? ImageUtils.getDataURL(image) : image.data ? {
    data: Array.from(image.data),
    width: image.width,
    height: image.height,
    type: image.data.constructor.name
  } : (warn("Texture: Unable to serialize Texture."), {});
}
var _textureId = 0, _tempVec3 = /* @__PURE__ */ new Vector3(), Texture = class extends EventDispatcher {
  /**
   * Constructs a new texture.
   *
   * @param {?Object} [image=Texture.DEFAULT_IMAGE] - The image holding the texture data.
   * @param {number} [mapping=Texture.DEFAULT_MAPPING] - The texture mapping.
   * @param {number} [wrapS=ClampToEdgeWrapping] - The wrapS value.
   * @param {number} [wrapT=ClampToEdgeWrapping] - The wrapT value.
   * @param {number} [magFilter=LinearFilter] - The mag filter value.
   * @param {number} [minFilter=LinearMipmapLinearFilter] - The min filter value.
   * @param {number} [format=RGBAFormat] - The texture format.
   * @param {number} [type=UnsignedByteType] - The texture type.
   * @param {number} [anisotropy=Texture.DEFAULT_ANISOTROPY] - The anisotropy value.
   * @param {string} [colorSpace=NoColorSpace] - The color space.
   */
  constructor(image = Texture.DEFAULT_IMAGE, mapping = Texture.DEFAULT_MAPPING, wrapS = ClampToEdgeWrapping, wrapT = ClampToEdgeWrapping, magFilter = LinearFilter, minFilter = LinearMipmapLinearFilter, format = RGBAFormat, type = UnsignedByteType, anisotropy = Texture.DEFAULT_ANISOTROPY, colorSpace = NoColorSpace) {
    super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: _textureId++ }), this.uuid = generateUUID(), this.name = "", this.source = new TextureSource(image), this.mipmaps = [], this.mapping = mapping, this.channel = 0, this.wrapS = wrapS, this.wrapT = wrapT, this.magFilter = magFilter, this.minFilter = minFilter, this.anisotropy = anisotropy, this.format = format, this.internalFormat = null, this.type = type, this.offset = new Vector2(0, 0), this.repeat = new Vector2(1, 1), this.center = new Vector2(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new Matrix3(), this.generateMipmaps = !0, this.mipmapsAutoUpdate = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = colorSpace, this.userData = {}, this.updateRanges = [], this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.isArrayTexture = !!(image && image.depth && image.depth > 1), this.pmremVersion = 0, this.isPMREMTexture = !1, this.normalized = !1;
  }
  /**
   * The width of the texture in pixels.
   */
  get width() {
    return this.source.getSize(_tempVec3).x;
  }
  /**
   * The height of the texture in pixels.
   */
  get height() {
    return this.source.getSize(_tempVec3).y;
  }
  /**
   * The depth of the texture in pixels.
   */
  get depth() {
    return this.source.getSize(_tempVec3).z;
  }
  /**
   * The image object holding the texture data.
   *
   * @type {?Object}
   */
  get image() {
    return this.source.data;
  }
  set image(value) {
    this.source.data = value;
  }
  /**
   * Updates the texture transformation matrix from the properties {@link Texture#offset},
   * {@link Texture#repeat}, {@link Texture#rotation}, and {@link Texture#center}.
   */
  updateMatrix() {
    this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
  }
  /**
   * Adds a range of data in the data texture to be updated on the GPU.
   *
   * @param {number} start - Position at which to start update.
   * @param {number} count - The number of components to update.
   */
  addUpdateRange(start, count) {
    this.updateRanges.push({ start, count });
  }
  /**
   * Clears the update ranges.
   */
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  /**
   * Returns a new texture with copied values from this instance.
   *
   * @return {Texture} A clone of this instance.
   */
  clone() {
    return new this.constructor().copy(this);
  }
  /**
   * Copies the values of the given texture to this instance.
   *
   * @param {Texture} source - The texture to copy.
   * @return {Texture} A reference to this instance.
   */
  copy(source) {
    return this.name = source.name, this.source = source.source, this.mipmaps = source.mipmaps.slice(0), this.mapping = source.mapping, this.channel = source.channel, this.wrapS = source.wrapS, this.wrapT = source.wrapT, this.magFilter = source.magFilter, this.minFilter = source.minFilter, this.anisotropy = source.anisotropy, this.format = source.format, this.internalFormat = source.internalFormat, this.type = source.type, this.normalized = source.normalized, this.offset.copy(source.offset), this.repeat.copy(source.repeat), this.center.copy(source.center), this.rotation = source.rotation, this.matrixAutoUpdate = source.matrixAutoUpdate, this.matrix.copy(source.matrix), this.generateMipmaps = source.generateMipmaps, this.mipmapsAutoUpdate = source.mipmapsAutoUpdate, this.premultiplyAlpha = source.premultiplyAlpha, this.flipY = source.flipY, this.unpackAlignment = source.unpackAlignment, this.colorSpace = source.colorSpace, this.renderTarget = source.renderTarget, this.isRenderTargetTexture = source.isRenderTargetTexture, this.isPMREMTexture = source.isPMREMTexture, this.isArrayTexture = source.isArrayTexture, this.userData = JSON.parse(JSON.stringify(source.userData)), this.needsUpdate = !0, this;
  }
  /**
   * Sets this texture's properties based on `values`.
   * @param {Object} values - A container with texture parameters.
   */
  setValues(values) {
    for (let key in values) {
      let newValue = values[key];
      if (newValue === void 0) {
        warn(`Texture.setValues(): parameter '${key}' has value of undefined.`);
        continue;
      }
      let currentValue = this[key];
      if (currentValue === void 0) {
        warn(`Texture.setValues(): property '${key}' does not exist.`);
        continue;
      }
      currentValue && newValue && currentValue.isVector2 && newValue.isVector2 || currentValue && newValue && currentValue.isVector3 && newValue.isVector3 || currentValue && newValue && currentValue.isMatrix3 && newValue.isMatrix3 ? currentValue.copy(newValue) : this[key] = newValue;
    }
  }
  /**
   * Serializes the texture into JSON.
   *
   * @param {?(Object|string)} meta - An optional value holding meta information about the serialization.
   * @return {Object} A JSON object representing the serialized texture.
   * @see {@link ObjectLoader#parse}
   */
  toJSON(meta) {
    let isRootObject = meta === void 0 || typeof meta == "string";
    if (!isRootObject && meta.textures[this.uuid] !== void 0)
      return meta.textures[this.uuid];
    let output = {
      metadata: {
        version: 4.7,
        type: "Texture",
        generator: "Texture.toJSON"
      },
      uuid: this.uuid,
      name: this.name,
      image: this.source.toJSON(meta).uuid,
      mapping: this.mapping,
      channel: this.channel,
      repeat: [this.repeat.x, this.repeat.y],
      offset: [this.offset.x, this.offset.y],
      center: [this.center.x, this.center.y],
      rotation: this.rotation,
      wrap: [this.wrapS, this.wrapT],
      format: this.format,
      internalFormat: this.internalFormat,
      type: this.type,
      normalized: this.normalized,
      colorSpace: this.colorSpace,
      minFilter: this.minFilter,
      magFilter: this.magFilter,
      anisotropy: this.anisotropy,
      flipY: this.flipY,
      generateMipmaps: this.generateMipmaps,
      mipmapsAutoUpdate: this.mipmapsAutoUpdate,
      premultiplyAlpha: this.premultiplyAlpha,
      unpackAlignment: this.unpackAlignment
    };
    return Object.keys(this.userData).length > 0 && (output.userData = this.userData), isRootObject || (meta.textures[this.uuid] = output), output;
  }
  /**
   * Frees the GPU-related resources allocated by this instance. Call this
   * method whenever this instance is no longer used in your app.
   *
   * Textures that belong to a render target are managed by the render target.
   * Calling this method on such a texture only dispatches the dispose event but
   * does not free any GPU resources. Use {@link RenderTarget#dispose} instead.
   *
   * @fires Texture#dispose
   */
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
  /**
   * Transforms the given uv vector with the textures uv transformation matrix.
   *
   * @param {Vector2} uv - The uv vector.
   * @return {Vector2} The transformed uv vector.
   */
  transformUv(uv) {
    if (this.mapping !== UVMapping)
      return uv;
    if (uv.applyMatrix3(this.matrix), uv.x < 0 || uv.x > 1)
      switch (this.wrapS) {
        case RepeatWrapping:
          uv.x = uv.x - Math.floor(uv.x);
          break;
        case ClampToEdgeWrapping:
          uv.x = uv.x < 0 ? 0 : 1;
          break;
        case MirroredRepeatWrapping:
          Math.abs(Math.floor(uv.x) % 2) === 1 ? uv.x = Math.ceil(uv.x) - uv.x : uv.x = uv.x - Math.floor(uv.x);
          break;
      }
    if (uv.y < 0 || uv.y > 1)
      switch (this.wrapT) {
        case RepeatWrapping:
          uv.y = uv.y - Math.floor(uv.y);
          break;
        case ClampToEdgeWrapping:
          uv.y = uv.y < 0 ? 0 : 1;
          break;
        case MirroredRepeatWrapping:
          Math.abs(Math.floor(uv.y) % 2) === 1 ? uv.y = Math.ceil(uv.y) - uv.y : uv.y = uv.y - Math.floor(uv.y);
          break;
      }
    return this.flipY && (uv.y = 1 - uv.y), uv;
  }
  /**
   * Setting this property to `true` indicates the engine the texture
   * must be updated in the next render. This triggers a texture upload
   * to the GPU and ensures correct texture parameter configuration.
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value
   */
  set needsUpdate(value) {
    value === !0 && (this.version++, this.source.needsUpdate = !0);
  }
  /**
   * Setting this property to `true` indicates the engine the PMREM
   * must be regenerated.
   *
   * @type {boolean}
   * @default false
   * @param {boolean} value
   */
  set needsPMREMUpdate(value) {
    value === !0 && this.pmremVersion++;
  }
};
Texture.DEFAULT_IMAGE = null;
Texture.DEFAULT_MAPPING = UVMapping;
Texture.DEFAULT_ANISOTROPY = 1;
var _Vector4 = class {
  /**
   * Constructs a new 4D vector.
   *
   * @param {number} [x=0] - The x value of this vector.
   * @param {number} [y=0] - The y value of this vector.
   * @param {number} [z=0] - The z value of this vector.
   * @param {number} [w=1] - The w value of this vector.
   */
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x, this.y = y, this.z = z, this.w = w;
  }
  /**
   * Alias for {@link Vector4#z}.
   *
   * @type {number}
   */
  get width() {
    return this.z;
  }
  set width(value) {
    this.z = value;
  }
  /**
   * Alias for {@link Vector4#w}.
   *
   * @type {number}
   */
  get height() {
    return this.w;
  }
  set height(value) {
    this.w = value;
  }
  /**
   * Sets the vector components.
   *
   * @param {number} x - The value of the x component.
   * @param {number} y - The value of the y component.
   * @param {number} z - The value of the z component.
   * @param {number} w - The value of the w component.
   * @return {Vector4} A reference to this vector.
   */
  set(x, y, z, w) {
    return this.x = x, this.y = y, this.z = z, this.w = w, this;
  }
  /**
   * Sets the vector components to the same value.
   *
   * @param {number} scalar - The value to set for all vector components.
   * @return {Vector4} A reference to this vector.
   */
  setScalar(scalar) {
    return this.x = scalar, this.y = scalar, this.z = scalar, this.w = scalar, this;
  }
  /**
   * Sets the vector's x component to the given value
   *
   * @param {number} x - The value to set.
   * @return {Vector4} A reference to this vector.
   */
  setX(x) {
    return this.x = x, this;
  }
  /**
   * Sets the vector's y component to the given value
   *
   * @param {number} y - The value to set.
   * @return {Vector4} A reference to this vector.
   */
  setY(y) {
    return this.y = y, this;
  }
  /**
   * Sets the vector's z component to the given value
   *
   * @param {number} z - The value to set.
   * @return {Vector4} A reference to this vector.
   */
  setZ(z) {
    return this.z = z, this;
  }
  /**
   * Sets the vector's w component to the given value
   *
   * @param {number} w - The value to set.
   * @return {Vector4} A reference to this vector.
   */
  setW(w) {
    return this.w = w, this;
  }
  /**
   * Allows to set a vector component with an index.
   *
   * @param {number} index - The component index. `0` equals to x, `1` equals to y,
   * `2` equals to z, `3` equals to w.
   * @param {number} value - The value to set.
   * @return {Vector4} A reference to this vector.
   */
  setComponent(index, value) {
    switch (index) {
      case 0:
        this.x = value;
        break;
      case 1:
        this.y = value;
        break;
      case 2:
        this.z = value;
        break;
      case 3:
        this.w = value;
        break;
      default:
        throw new Error("THREE.Vector4: index is out of range: " + index);
    }
    return this;
  }
  /**
   * Returns the value of the vector component which matches the given index.
   *
   * @param {number} index - The component index. `0` equals to x, `1` equals to y,
   * `2` equals to z, `3` equals to w.
   * @return {number} A vector component value.
   */
  getComponent(index) {
    switch (index) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      case 3:
        return this.w;
      default:
        throw new Error("THREE.Vector4: index is out of range: " + index);
    }
  }
  /**
   * Returns a new vector with copied values from this instance.
   *
   * @return {Vector4} A clone of this instance.
   */
  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w);
  }
  /**
   * Copies the values of the given vector to this instance.
   *
   * @param {Vector3|Vector4} v - The vector to copy.
   * @return {Vector4} A reference to this vector.
   */
  copy(v) {
    return this.x = v.x, this.y = v.y, this.z = v.z, this.w = v.w !== void 0 ? v.w : 1, this;
  }
  /**
   * Adds the given vector to this instance.
   *
   * @param {Vector4} v - The vector to add.
   * @return {Vector4} A reference to this vector.
   */
  add(v) {
    return this.x += v.x, this.y += v.y, this.z += v.z, this.w += v.w, this;
  }
  /**
   * Adds the given scalar value to all components of this instance.
   *
   * @param {number} s - The scalar to add.
   * @return {Vector4} A reference to this vector.
   */
  addScalar(s) {
    return this.x += s, this.y += s, this.z += s, this.w += s, this;
  }
  /**
   * Adds the given vectors and stores the result in this instance.
   *
   * @param {Vector4} a - The first vector.
   * @param {Vector4} b - The second vector.
   * @return {Vector4} A reference to this vector.
   */
  addVectors(a, b) {
    return this.x = a.x + b.x, this.y = a.y + b.y, this.z = a.z + b.z, this.w = a.w + b.w, this;
  }
  /**
   * Adds the given vector scaled by the given factor to this instance.
   *
   * @param {Vector4} v - The vector.
   * @param {number} s - The factor that scales `v`.
   * @return {Vector4} A reference to this vector.
   */
  addScaledVector(v, s) {
    return this.x += v.x * s, this.y += v.y * s, this.z += v.z * s, this.w += v.w * s, this;
  }
  /**
   * Subtracts the given vector from this instance.
   *
   * @param {Vector4} v - The vector to subtract.
   * @return {Vector4} A reference to this vector.
   */
  sub(v) {
    return this.x -= v.x, this.y -= v.y, this.z -= v.z, this.w -= v.w, this;
  }
  /**
   * Subtracts the given scalar value from all components of this instance.
   *
   * @param {number} s - The scalar to subtract.
   * @return {Vector4} A reference to this vector.
   */
  subScalar(s) {
    return this.x -= s, this.y -= s, this.z -= s, this.w -= s, this;
  }
  /**
   * Subtracts the given vectors and stores the result in this instance.
   *
   * @param {Vector4} a - The first vector.
   * @param {Vector4} b - The second vector.
   * @return {Vector4} A reference to this vector.
   */
  subVectors(a, b) {
    return this.x = a.x - b.x, this.y = a.y - b.y, this.z = a.z - b.z, this.w = a.w - b.w, this;
  }
  /**
   * Multiplies the given vector with this instance.
   *
   * @param {Vector4} v - The vector to multiply.
   * @return {Vector4} A reference to this vector.
   */
  multiply(v) {
    return this.x *= v.x, this.y *= v.y, this.z *= v.z, this.w *= v.w, this;
  }
  /**
   * Multiplies the given scalar value with all components of this instance.
   *
   * @param {number} scalar - The scalar to multiply.
   * @return {Vector4} A reference to this vector.
   */
  multiplyScalar(scalar) {
    return this.x *= scalar, this.y *= scalar, this.z *= scalar, this.w *= scalar, this;
  }
  /**
   * Multiplies this vector with the given 4x4 matrix.
   *
   * @param {Matrix4} m - The 4x4 matrix.
   * @return {Vector4} A reference to this vector.
   */
  applyMatrix4(m2) {
    let x = this.x, y = this.y, z = this.z, w = this.w, e2 = m2.elements;
    return this.x = e2[0] * x + e2[4] * y + e2[8] * z + e2[12] * w, this.y = e2[1] * x + e2[5] * y + e2[9] * z + e2[13] * w, this.z = e2[2] * x + e2[6] * y + e2[10] * z + e2[14] * w, this.w = e2[3] * x + e2[7] * y + e2[11] * z + e2[15] * w, this;
  }
  /**
   * Divides this instance by the given vector.
   *
   * @param {Vector4} v - The vector to divide.
   * @return {Vector4} A reference to this vector.
   */
  divide(v) {
    return this.x /= v.x, this.y /= v.y, this.z /= v.z, this.w /= v.w, this;
  }
  /**
   * Divides this vector by the given scalar.
   *
   * @param {number} scalar - The scalar to divide.
   * @return {Vector4} A reference to this vector.
   */
  divideScalar(scalar) {
    return this.multiplyScalar(1 / scalar);
  }
  /**
   * Sets the x, y and z components of this
   * vector to the quaternion's axis and w to the angle.
   *
   * @param {Quaternion} q - The Quaternion to set.
   * @return {Vector4} A reference to this vector.
   */
  setAxisAngleFromQuaternion(q) {
    this.w = 2 * Math.acos(q.w);
    let s = Math.sqrt(1 - q.w * q.w);
    return s < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = q.x / s, this.y = q.y / s, this.z = q.z / s), this;
  }
  /**
   * Sets the x, y and z components of this
   * vector to the axis of rotation and w to the angle.
   *
   * @param {Matrix4} m - A 4x4 matrix of which the upper left 3x3 matrix is a pure rotation matrix.
   * @return {Vector4} A reference to this vector.
   */
  setAxisAngleFromRotationMatrix(m2) {
    let angle, x, y, z, te = m2.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10];
    if (Math.abs(m12 - m21) < 0.01 && Math.abs(m13 - m31) < 0.01 && Math.abs(m23 - m32) < 0.01) {
      if (Math.abs(m12 + m21) < 0.1 && Math.abs(m13 + m31) < 0.1 && Math.abs(m23 + m32) < 0.1 && Math.abs(m11 + m22 + m33 - 3) < 0.1)
        return this.set(1, 0, 0, 0), this;
      angle = Math.PI;
      let xx = (m11 + 1) / 2, yy = (m22 + 1) / 2, zz = (m33 + 1) / 2, xy = (m12 + m21) / 4, xz = (m13 + m31) / 4, yz = (m23 + m32) / 4;
      return xx > yy && xx > zz ? xx < 0.01 ? (x = 0, y = 0.707106781, z = 0.707106781) : (x = Math.sqrt(xx), y = xy / x, z = xz / x) : yy > zz ? yy < 0.01 ? (x = 0.707106781, y = 0, z = 0.707106781) : (y = Math.sqrt(yy), x = xy / y, z = yz / y) : zz < 0.01 ? (x = 0.707106781, y = 0.707106781, z = 0) : (z = Math.sqrt(zz), x = xz / z, y = yz / z), this.set(x, y, z, angle), this;
    }
    let s = Math.sqrt((m32 - m23) * (m32 - m23) + (m13 - m31) * (m13 - m31) + (m21 - m12) * (m21 - m12));
    return Math.abs(s) < 1e-3 && (s = 1), this.x = (m32 - m23) / s, this.y = (m13 - m31) / s, this.z = (m21 - m12) / s, this.w = Math.acos((m11 + m22 + m33 - 1) / 2), this;
  }
  /**
   * Sets the vector components to the position elements of the
   * given transformation matrix.
   *
   * @param {Matrix4} m - The 4x4 matrix.
   * @return {Vector4} A reference to this vector.
   */
  setFromMatrixPosition(m2) {
    let e2 = m2.elements;
    return this.x = e2[12], this.y = e2[13], this.z = e2[14], this.w = e2[15], this;
  }
  /**
   * If this vector's x, y, z or w value is greater than the given vector's x, y, z or w
   * value, replace that value with the corresponding min value.
   *
   * @param {Vector4} v - The vector.
   * @return {Vector4} A reference to this vector.
   */
  min(v) {
    return this.x = Math.min(this.x, v.x), this.y = Math.min(this.y, v.y), this.z = Math.min(this.z, v.z), this.w = Math.min(this.w, v.w), this;
  }
  /**
   * If this vector's x, y, z or w value is less than the given vector's x, y, z or w
   * value, replace that value with the corresponding max value.
   *
   * @param {Vector4} v - The vector.
   * @return {Vector4} A reference to this vector.
   */
  max(v) {
    return this.x = Math.max(this.x, v.x), this.y = Math.max(this.y, v.y), this.z = Math.max(this.z, v.z), this.w = Math.max(this.w, v.w), this;
  }
  /**
   * If this vector's x, y, z or w value is greater than the max vector's x, y, z or w
   * value, it is replaced by the corresponding value.
   * If this vector's x, y, z or w value is less than the min vector's x, y, z or w value,
   * it is replaced by the corresponding value.
   *
   * @param {Vector4} min - The minimum x, y and z values.
   * @param {Vector4} max - The maximum x, y and z values in the desired range.
   * @return {Vector4} A reference to this vector.
   */
  clamp(min, max) {
    return this.x = clamp(this.x, min.x, max.x), this.y = clamp(this.y, min.y, max.y), this.z = clamp(this.z, min.z, max.z), this.w = clamp(this.w, min.w, max.w), this;
  }
  /**
   * If this vector's x, y, z or w values are greater than the max value, they are
   * replaced by the max value.
   * If this vector's x, y, z or w values are less than the min value, they are
   * replaced by the min value.
   *
   * @param {number} minVal - The minimum value the components will be clamped to.
   * @param {number} maxVal - The maximum value the components will be clamped to.
   * @return {Vector4} A reference to this vector.
   */
  clampScalar(minVal, maxVal) {
    return this.x = clamp(this.x, minVal, maxVal), this.y = clamp(this.y, minVal, maxVal), this.z = clamp(this.z, minVal, maxVal), this.w = clamp(this.w, minVal, maxVal), this;
  }
  /**
   * If this vector's length is greater than the max value, it is replaced by
   * the max value.
   * If this vector's length is less than the min value, it is replaced by the
   * min value.
   *
   * @param {number} min - The minimum value the vector length will be clamped to.
   * @param {number} max - The maximum value the vector length will be clamped to.
   * @return {Vector4} A reference to this vector.
   */
  clampLength(min, max) {
    let length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(clamp(length, min, max));
  }
  /**
   * The components of this vector are rounded down to the nearest integer value.
   *
   * @return {Vector4} A reference to this vector.
   */
  floor() {
    return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
  }
  /**
   * The components of this vector are rounded up to the nearest integer value.
   *
   * @return {Vector4} A reference to this vector.
   */
  ceil() {
    return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
  }
  /**
   * The components of this vector are rounded to the nearest integer value
   *
   * @return {Vector4} A reference to this vector.
   */
  round() {
    return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
  }
  /**
   * The components of this vector are rounded towards zero (up if negative,
   * down if positive) to an integer value.
   *
   * @return {Vector4} A reference to this vector.
   */
  roundToZero() {
    return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
  }
  /**
   * Inverts this vector - i.e. sets x = -x, y = -y, z = -z, w = -w.
   *
   * @return {Vector4} A reference to this vector.
   */
  negate() {
    return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
  }
  /**
   * Calculates the dot product of the given vector with this instance.
   *
   * @param {Vector4} v - The vector to compute the dot product with.
   * @return {number} The result of the dot product.
   */
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }
  /**
   * Computes the square of the Euclidean length (straight-line length) from
   * (0, 0, 0, 0) to (x, y, z, w). If you are comparing the lengths of vectors, you should
   * compare the length squared instead as it is slightly more efficient to calculate.
   *
   * @return {number} The square length of this vector.
   */
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }
  /**
   * Computes the  Euclidean length (straight-line length) from (0, 0, 0, 0) to (x, y, z, w).
   *
   * @return {number} The length of this vector.
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }
  /**
   * Computes the Manhattan length of this vector.
   *
   * @return {number} The length of this vector.
   */
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
  }
  /**
   * Converts this vector to a unit vector - that is, sets it equal to a vector
   * with the same direction as this one, but with a vector length of `1`.
   *
   * @return {Vector4} A reference to this vector.
   */
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  /**
   * Sets this vector to a vector with the same direction as this one, but
   * with the specified length.
   *
   * @param {number} length - The new length of this vector.
   * @return {Vector4} A reference to this vector.
   */
  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
  /**
   * Linearly interpolates between the given vector and this instance, where
   * alpha is the percent distance along the line - alpha = 0 will be this
   * vector, and alpha = 1 will be the given one.
   *
   * @param {Vector4} v - The vector to interpolate towards.
   * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector4} A reference to this vector.
   */
  lerp(v, alpha) {
    return this.x += (v.x - this.x) * alpha, this.y += (v.y - this.y) * alpha, this.z += (v.z - this.z) * alpha, this.w += (v.w - this.w) * alpha, this;
  }
  /**
   * Linearly interpolates between the given vectors, where alpha is the percent
   * distance along the line - alpha = 0 will be first vector, and alpha = 1 will
   * be the second one. The result is stored in this instance.
   *
   * @param {Vector4} v1 - The first vector.
   * @param {Vector4} v2 - The second vector.
   * @param {number} alpha - The interpolation factor, typically in the closed interval `[0, 1]`.
   * @return {Vector4} A reference to this vector.
   */
  lerpVectors(v1, v2, alpha) {
    return this.x = v1.x + (v2.x - v1.x) * alpha, this.y = v1.y + (v2.y - v1.y) * alpha, this.z = v1.z + (v2.z - v1.z) * alpha, this.w = v1.w + (v2.w - v1.w) * alpha, this;
  }
  /**
   * Returns `true` if this vector is equal with the given one.
   *
   * @param {Vector4} v - The vector to test for equality.
   * @return {boolean} Whether this vector is equal with the given one.
   */
  equals(v) {
    return v.x === this.x && v.y === this.y && v.z === this.z && v.w === this.w;
  }
  /**
   * Sets this vector's x value to be `array[ offset ]`, y value to be `array[ offset + 1 ]`,
   * z value to be `array[ offset + 2 ]`, w value to be `array[ offset + 3 ]`.
   *
   * @param {Array<number>} array - An array holding the vector component values.
   * @param {number} [offset=0] - The offset into the array.
   * @return {Vector4} A reference to this vector.
   */
  fromArray(array, offset = 0) {
    return this.x = array[offset], this.y = array[offset + 1], this.z = array[offset + 2], this.w = array[offset + 3], this;
  }
  /**
   * Writes the components of this vector to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the vector components.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The vector components.
   */
  toArray(array = [], offset = 0) {
    return array[offset] = this.x, array[offset + 1] = this.y, array[offset + 2] = this.z, array[offset + 3] = this.w, array;
  }
  /**
   * Sets the components of this vector from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - The buffer attribute holding vector data.
   * @param {number} index - The index into the attribute.
   * @return {Vector4} A reference to this vector.
   */
  fromBufferAttribute(attribute, index) {
    return this.x = attribute.getX(index), this.y = attribute.getY(index), this.z = attribute.getZ(index), this.w = attribute.getW(index), this;
  }
  /**
   * Sets each component of this vector to a pseudo-random value between `0` and
   * `1`, excluding `1`.
   *
   * @return {Vector4} A reference to this vector.
   */
  random() {
    return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
  }
  *[Symbol.iterator]() {
    yield this.x, yield this.y, yield this.z, yield this.w;
  }
}, Vector4 = _Vector4;
(() => {
  _Vector4.prototype.isVector4 = !0;
})();
var _Matrix4 = class {
  /**
   * Constructs a new 4x4 matrix. The arguments are supposed to be
   * in row-major order. If no arguments are provided, the constructor
   * initializes the matrix as an identity matrix.
   *
   * @param {number} [n11] - 1-1 matrix element.
   * @param {number} [n12] - 1-2 matrix element.
   * @param {number} [n13] - 1-3 matrix element.
   * @param {number} [n14] - 1-4 matrix element.
   * @param {number} [n21] - 2-1 matrix element.
   * @param {number} [n22] - 2-2 matrix element.
   * @param {number} [n23] - 2-3 matrix element.
   * @param {number} [n24] - 2-4 matrix element.
   * @param {number} [n31] - 3-1 matrix element.
   * @param {number} [n32] - 3-2 matrix element.
   * @param {number} [n33] - 3-3 matrix element.
   * @param {number} [n34] - 3-4 matrix element.
   * @param {number} [n41] - 4-1 matrix element.
   * @param {number} [n42] - 4-2 matrix element.
   * @param {number} [n43] - 4-3 matrix element.
   * @param {number} [n44] - 4-4 matrix element.
   */
  constructor(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    this.elements = [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ], n11 !== void 0 && this.set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44);
  }
  /**
   * Sets the elements of the matrix.The arguments are supposed to be
   * in row-major order.
   *
   * @param {number} [n11] - 1-1 matrix element.
   * @param {number} [n12] - 1-2 matrix element.
   * @param {number} [n13] - 1-3 matrix element.
   * @param {number} [n14] - 1-4 matrix element.
   * @param {number} [n21] - 2-1 matrix element.
   * @param {number} [n22] - 2-2 matrix element.
   * @param {number} [n23] - 2-3 matrix element.
   * @param {number} [n24] - 2-4 matrix element.
   * @param {number} [n31] - 3-1 matrix element.
   * @param {number} [n32] - 3-2 matrix element.
   * @param {number} [n33] - 3-3 matrix element.
   * @param {number} [n34] - 3-4 matrix element.
   * @param {number} [n41] - 4-1 matrix element.
   * @param {number} [n42] - 4-2 matrix element.
   * @param {number} [n43] - 4-3 matrix element.
   * @param {number} [n44] - 4-4 matrix element.
   * @return {Matrix4} A reference to this matrix.
   */
  set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    let te = this.elements;
    return te[0] = n11, te[4] = n12, te[8] = n13, te[12] = n14, te[1] = n21, te[5] = n22, te[9] = n23, te[13] = n24, te[2] = n31, te[6] = n32, te[10] = n33, te[14] = n34, te[3] = n41, te[7] = n42, te[11] = n43, te[15] = n44, this;
  }
  /**
   * Sets this matrix to the 4x4 identity matrix.
   *
   * @return {Matrix4} A reference to this matrix.
   */
  identity() {
    return this.set(
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Returns a matrix with copied values from this instance.
   *
   * @return {Matrix4} A clone of this instance.
   */
  clone() {
    return new _Matrix4().fromArray(this.elements);
  }
  /**
   * Copies the values of the given matrix to this instance.
   *
   * @param {Matrix4} m - The matrix to copy.
   * @return {Matrix4} A reference to this matrix.
   */
  copy(m2) {
    let te = this.elements, me = m2.elements;
    return te[0] = me[0], te[1] = me[1], te[2] = me[2], te[3] = me[3], te[4] = me[4], te[5] = me[5], te[6] = me[6], te[7] = me[7], te[8] = me[8], te[9] = me[9], te[10] = me[10], te[11] = me[11], te[12] = me[12], te[13] = me[13], te[14] = me[14], te[15] = me[15], this;
  }
  /**
   * Copies the translation component of the given matrix
   * into this matrix's translation component.
   *
   * @param {Matrix4} m - The matrix to copy the translation component.
   * @return {Matrix4} A reference to this matrix.
   */
  copyPosition(m2) {
    let te = this.elements, me = m2.elements;
    return te[12] = me[12], te[13] = me[13], te[14] = me[14], this;
  }
  /**
   * Set the upper 3x3 elements of this matrix to the values of given 3x3 matrix.
   *
   * @param {Matrix3} m - The 3x3 matrix.
   * @return {Matrix4} A reference to this matrix.
   */
  setFromMatrix3(m2) {
    let me = m2.elements;
    return this.set(
      me[0],
      me[3],
      me[6],
      0,
      me[1],
      me[4],
      me[7],
      0,
      me[2],
      me[5],
      me[8],
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Extracts the basis vectors of this matrix into the three vectors provided.
   *
   * @param {Vector3} xAxis - The basis's x axis.
   * @param {Vector3} yAxis - The basis's y axis.
   * @param {Vector3} zAxis - The basis's z axis.
   * @return {Matrix4} A reference to this matrix.
   */
  extractBasis(xAxis, yAxis, zAxis) {
    return this.determinantAffine() === 0 ? (xAxis.set(1, 0, 0), yAxis.set(0, 1, 0), zAxis.set(0, 0, 1), this) : (xAxis.setFromMatrixColumn(this, 0), yAxis.setFromMatrixColumn(this, 1), zAxis.setFromMatrixColumn(this, 2), this);
  }
  /**
   * Sets the given basis vectors to this matrix.
   *
   * @param {Vector3} xAxis - The basis's x axis.
   * @param {Vector3} yAxis - The basis's y axis.
   * @param {Vector3} zAxis - The basis's z axis.
   * @return {Matrix4} A reference to this matrix.
   */
  makeBasis(xAxis, yAxis, zAxis) {
    return this.set(
      xAxis.x,
      yAxis.x,
      zAxis.x,
      0,
      xAxis.y,
      yAxis.y,
      zAxis.y,
      0,
      xAxis.z,
      yAxis.z,
      zAxis.z,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Extracts the rotation component of the given matrix
   * into this matrix's rotation component.
   *
   * Note: This method does not support reflection matrices.
   *
   * @param {Matrix4} m - The matrix.
   * @return {Matrix4} A reference to this matrix.
   */
  extractRotation(m2) {
    if (m2.determinantAffine() === 0)
      return this.identity();
    let te = this.elements, me = m2.elements, scaleX = 1 / _v1$7.setFromMatrixColumn(m2, 0).length(), scaleY = 1 / _v1$7.setFromMatrixColumn(m2, 1).length(), scaleZ = 1 / _v1$7.setFromMatrixColumn(m2, 2).length();
    return te[0] = me[0] * scaleX, te[1] = me[1] * scaleX, te[2] = me[2] * scaleX, te[3] = 0, te[4] = me[4] * scaleY, te[5] = me[5] * scaleY, te[6] = me[6] * scaleY, te[7] = 0, te[8] = me[8] * scaleZ, te[9] = me[9] * scaleZ, te[10] = me[10] * scaleZ, te[11] = 0, te[12] = 0, te[13] = 0, te[14] = 0, te[15] = 1, this;
  }
  /**
   * Sets the rotation component (the upper left 3x3 matrix) of this matrix to
   * the rotation specified by the given Euler angles. The rest of
   * the matrix is set to the identity. Depending on the {@link Euler#order},
   * there are six possible outcomes. See [this page](https://en.wikipedia.org/wiki/Euler_angles#Rotation_matrix)
   * for a complete list.
   *
   * @param {Euler} euler - The Euler angles.
   * @return {Matrix4} A reference to this matrix.
   */
  makeRotationFromEuler(euler) {
    let te = this.elements, x = euler.x, y = euler.y, z = euler.z, a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e2 = Math.cos(z), f = Math.sin(z);
    if (euler.order === "XYZ") {
      let ae = a * e2, af = a * f, be = b * e2, bf = b * f;
      te[0] = c * e2, te[4] = -c * f, te[8] = d, te[1] = af + be * d, te[5] = ae - bf * d, te[9] = -b * c, te[2] = bf - ae * d, te[6] = be + af * d, te[10] = a * c;
    } else if (euler.order === "YXZ") {
      let ce = c * e2, cf = c * f, de = d * e2, df = d * f;
      te[0] = ce + df * b, te[4] = de * b - cf, te[8] = a * d, te[1] = a * f, te[5] = a * e2, te[9] = -b, te[2] = cf * b - de, te[6] = df + ce * b, te[10] = a * c;
    } else if (euler.order === "ZXY") {
      let ce = c * e2, cf = c * f, de = d * e2, df = d * f;
      te[0] = ce - df * b, te[4] = -a * f, te[8] = de + cf * b, te[1] = cf + de * b, te[5] = a * e2, te[9] = df - ce * b, te[2] = -a * d, te[6] = b, te[10] = a * c;
    } else if (euler.order === "ZYX") {
      let ae = a * e2, af = a * f, be = b * e2, bf = b * f;
      te[0] = c * e2, te[4] = be * d - af, te[8] = ae * d + bf, te[1] = c * f, te[5] = bf * d + ae, te[9] = af * d - be, te[2] = -d, te[6] = b * c, te[10] = a * c;
    } else if (euler.order === "YZX") {
      let ac = a * c, ad = a * d, bc = b * c, bd = b * d;
      te[0] = c * e2, te[4] = bd - ac * f, te[8] = bc * f + ad, te[1] = f, te[5] = a * e2, te[9] = -b * e2, te[2] = -d * e2, te[6] = ad * f + bc, te[10] = ac - bd * f;
    } else if (euler.order === "XZY") {
      let ac = a * c, ad = a * d, bc = b * c, bd = b * d;
      te[0] = c * e2, te[4] = -f, te[8] = d * e2, te[1] = ac * f + bd, te[5] = a * e2, te[9] = ad * f - bc, te[2] = bc * f - ad, te[6] = b * e2, te[10] = bd * f + ac;
    }
    return te[3] = 0, te[7] = 0, te[11] = 0, te[12] = 0, te[13] = 0, te[14] = 0, te[15] = 1, this;
  }
  /**
   * Sets the rotation component of this matrix to the rotation specified by
   * the given Quaternion as outlined [here](https://en.wikipedia.org/wiki/Rotation_matrix#Quaternion)
   * The rest of the matrix is set to the identity.
   *
   * @param {Quaternion} q - The Quaternion.
   * @return {Matrix4} A reference to this matrix.
   */
  makeRotationFromQuaternion(q) {
    return this.compose(_zero, q, _one);
  }
  /**
   * Sets the rotation component of the transformation matrix, looking from `eye` towards
   * `target`, and oriented by the up-direction.
   *
   * @param {Vector3} eye - The eye vector.
   * @param {Vector3} target - The target vector.
   * @param {Vector3} up - The up vector.
   * @return {Matrix4} A reference to this matrix.
   */
  lookAt(eye, target, up2) {
    let te = this.elements;
    return _z.subVectors(eye, target), _z.lengthSq() === 0 && (_z.z = 1), _z.normalize(), _x.crossVectors(up2, _z), _x.lengthSq() === 0 && (Math.abs(up2.z) === 1 ? _z.x += 1e-4 : _z.z += 1e-4, _z.normalize(), _x.crossVectors(up2, _z)), _x.normalize(), _y.crossVectors(_z, _x), te[0] = _x.x, te[4] = _y.x, te[8] = _z.x, te[1] = _x.y, te[5] = _y.y, te[9] = _z.y, te[2] = _x.z, te[6] = _y.z, te[10] = _z.z, this;
  }
  /**
   * Post-multiplies this matrix by the given 4x4 matrix.
   *
   * @param {Matrix4} m - The matrix to multiply with.
   * @return {Matrix4} A reference to this matrix.
   */
  multiply(m2) {
    return this.multiplyMatrices(this, m2);
  }
  /**
   * Pre-multiplies this matrix by the given 4x4 matrix.
   *
   * @param {Matrix4} m - The matrix to multiply with.
   * @return {Matrix4} A reference to this matrix.
   */
  premultiply(m2) {
    return this.multiplyMatrices(m2, this);
  }
  /**
   * Multiples the given 4x4 matrices and stores the result
   * in this matrix.
   *
   * @param {Matrix4} a - The first matrix.
   * @param {Matrix4} b - The second matrix.
   * @return {Matrix4} A reference to this matrix.
   */
  multiplyMatrices(a, b) {
    let ae = a.elements, be = b.elements, te = this.elements, a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12], a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13], a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14], a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15], b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12], b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13], b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14], b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
    return te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41, te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42, te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43, te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44, te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41, te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42, te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43, te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44, te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41, te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42, te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43, te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44, te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41, te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42, te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43, te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44, this;
  }
  /**
   * Multiplies every component of the matrix by the given scalar.
   *
   * @param {number} s - The scalar.
   * @return {Matrix4} A reference to this matrix.
   */
  multiplyScalar(s) {
    let te = this.elements;
    return te[0] *= s, te[4] *= s, te[8] *= s, te[12] *= s, te[1] *= s, te[5] *= s, te[9] *= s, te[13] *= s, te[2] *= s, te[6] *= s, te[10] *= s, te[14] *= s, te[3] *= s, te[7] *= s, te[11] *= s, te[15] *= s, this;
  }
  /**
   * Computes and returns the determinant of this matrix.
   *
   * @return {number} The determinant.
   */
  determinant() {
    let te = this.elements, n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12], n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13], n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14], n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15], t11 = n23 * n34 - n24 * n33, t12 = n22 * n34 - n24 * n32, t13 = n22 * n33 - n23 * n32, t21 = n21 * n34 - n24 * n31, t22 = n21 * n33 - n23 * n31, t23 = n21 * n32 - n22 * n31;
    return n11 * (n42 * t11 - n43 * t12 + n44 * t13) - n12 * (n41 * t11 - n43 * t21 + n44 * t22) + n13 * (n41 * t12 - n42 * t21 + n44 * t23) - n14 * (n41 * t13 - n42 * t22 + n43 * t23);
  }
  /**
   * Computes and returns the determinant of the 4x4 matrix, but assumes the
   * matrix is affine, saving some computations.
   *
   * For affine matrices (like an object's world matrix), this value equals the
   * full 4x4 {@link Matrix4#determinant} but is cheaper to compute.
   *
   * Assumes the bottom row is [0, 0, 0, 1].
   *
   * @return {number} The determinant of the matrix.
   */
  determinantAffine() {
    let te = this.elements, n11 = te[0], n12 = te[4], n13 = te[8], n21 = te[1], n22 = te[5], n23 = te[9], n31 = te[2], n32 = te[6], n33 = te[10];
    return n11 * (n22 * n33 - n23 * n32) - n12 * (n21 * n33 - n23 * n31) + n13 * (n21 * n32 - n22 * n31);
  }
  /**
   * Transposes this matrix in place.
   *
   * @return {Matrix4} A reference to this matrix.
   */
  transpose() {
    let te = this.elements, tmp;
    return tmp = te[1], te[1] = te[4], te[4] = tmp, tmp = te[2], te[2] = te[8], te[8] = tmp, tmp = te[6], te[6] = te[9], te[9] = tmp, tmp = te[3], te[3] = te[12], te[12] = tmp, tmp = te[7], te[7] = te[13], te[13] = tmp, tmp = te[11], te[11] = te[14], te[14] = tmp, this;
  }
  /**
   * Sets the position component for this matrix from the given vector,
   * without affecting the rest of the matrix.
   *
   * @param {number|Vector3} x - The x component of the vector or alternatively the vector object.
   * @param {number} y - The y component of the vector.
   * @param {number} z - The z component of the vector.
   * @return {Matrix4} A reference to this matrix.
   */
  setPosition(x, y, z) {
    let te = this.elements;
    return x.isVector3 ? (te[12] = x.x, te[13] = x.y, te[14] = x.z) : (te[12] = x, te[13] = y, te[14] = z), this;
  }
  /**
   * Inverts this matrix, using the [analytic method](https://en.wikipedia.org/wiki/Invertible_matrix#Analytic_solution).
   * You can not invert with a determinant of zero. If you attempt this, the method produces
   * a zero matrix instead.
   *
   * @return {Matrix4} A reference to this matrix.
   */
  invert() {
    let te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t1 = n11 * n22 - n21 * n12, t2 = n11 * n32 - n31 * n12, t3 = n11 * n42 - n41 * n12, t4 = n21 * n32 - n31 * n22, t5 = n21 * n42 - n41 * n22, t6 = n31 * n42 - n41 * n32, t7 = n13 * n24 - n23 * n14, t8 = n13 * n34 - n33 * n14, t9 = n13 * n44 - n43 * n14, t10 = n23 * n34 - n33 * n24, t11 = n23 * n44 - n43 * n24, t12 = n33 * n44 - n43 * n34, det = t1 * t12 - t2 * t11 + t3 * t10 + t4 * t9 - t5 * t8 + t6 * t7;
    if (det === 0)
      return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    let detInv = 1 / det;
    return te[0] = (n22 * t12 - n32 * t11 + n42 * t10) * detInv, te[1] = (n31 * t11 - n21 * t12 - n41 * t10) * detInv, te[2] = (n24 * t6 - n34 * t5 + n44 * t4) * detInv, te[3] = (n33 * t5 - n23 * t6 - n43 * t4) * detInv, te[4] = (n32 * t9 - n12 * t12 - n42 * t8) * detInv, te[5] = (n11 * t12 - n31 * t9 + n41 * t8) * detInv, te[6] = (n34 * t3 - n14 * t6 - n44 * t2) * detInv, te[7] = (n13 * t6 - n33 * t3 + n43 * t2) * detInv, te[8] = (n12 * t11 - n22 * t9 + n42 * t7) * detInv, te[9] = (n21 * t9 - n11 * t11 - n41 * t7) * detInv, te[10] = (n14 * t5 - n24 * t3 + n44 * t1) * detInv, te[11] = (n23 * t3 - n13 * t5 - n43 * t1) * detInv, te[12] = (n22 * t8 - n12 * t10 - n32 * t7) * detInv, te[13] = (n11 * t10 - n21 * t8 + n31 * t7) * detInv, te[14] = (n24 * t2 - n14 * t4 - n34 * t1) * detInv, te[15] = (n13 * t4 - n23 * t2 + n33 * t1) * detInv, this;
  }
  /**
   * Scales each of the first three columns of this matrix by the corresponding component of the given vector.
   *
   * @param {Vector3} v - The scale vector.
   * @return {Matrix4} A reference to this matrix.
   */
  scale(v) {
    let te = this.elements, x = v.x, y = v.y, z = v.z;
    return te[0] *= x, te[4] *= y, te[8] *= z, te[1] *= x, te[5] *= y, te[9] *= z, te[2] *= x, te[6] *= y, te[10] *= z, te[3] *= x, te[7] *= y, te[11] *= z, this;
  }
  /**
   * Gets the maximum scale value of the three axes.
   *
   * @return {number} The maximum scale.
   */
  getMaxScaleOnAxis() {
    let te = this.elements, scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2], scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6], scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
    return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
  }
  /**
   * Sets this matrix as a translation transform from the given vector.
   *
   * @param {number|Vector3} x - The amount to translate in the X axis or alternatively a translation vector.
   * @param {number} y - The amount to translate in the Y axis.
   * @param {number} z - The amount to translate in the z axis.
   * @return {Matrix4} A reference to this matrix.
   */
  makeTranslation(x, y, z) {
    return x.isVector3 ? this.set(
      1,
      0,
      0,
      x.x,
      0,
      1,
      0,
      x.y,
      0,
      0,
      1,
      x.z,
      0,
      0,
      0,
      1
    ) : this.set(
      1,
      0,
      0,
      x,
      0,
      1,
      0,
      y,
      0,
      0,
      1,
      z,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a rotational transformation around the X axis by
   * the given angle.
   *
   * @param {number} theta - The rotation in radians.
   * @return {Matrix4} A reference to this matrix.
   */
  makeRotationX(theta) {
    let c = Math.cos(theta), s = Math.sin(theta);
    return this.set(
      1,
      0,
      0,
      0,
      0,
      c,
      -s,
      0,
      0,
      s,
      c,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a rotational transformation around the Y axis by
   * the given angle.
   *
   * @param {number} theta - The rotation in radians.
   * @return {Matrix4} A reference to this matrix.
   */
  makeRotationY(theta) {
    let c = Math.cos(theta), s = Math.sin(theta);
    return this.set(
      c,
      0,
      s,
      0,
      0,
      1,
      0,
      0,
      -s,
      0,
      c,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a rotational transformation around the Z axis by
   * the given angle.
   *
   * @param {number} theta - The rotation in radians.
   * @return {Matrix4} A reference to this matrix.
   */
  makeRotationZ(theta) {
    let c = Math.cos(theta), s = Math.sin(theta);
    return this.set(
      c,
      -s,
      0,
      0,
      s,
      c,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a rotational transformation around the given axis by
   * the given angle.
   *
   * @param {Vector3} axis - The normalized rotation axis.
   * @param {number} angle - The rotation in radians.
   * @return {Matrix4} A reference to this matrix.
   */
  makeRotationAxis(axis, angle) {
    let c = Math.cos(angle), s = Math.sin(angle), t = 1 - c, x = axis.x, y = axis.y, z = axis.z, tx = t * x, ty = t * y;
    return this.set(
      tx * x + c,
      tx * y - s * z,
      tx * z + s * y,
      0,
      tx * y + s * z,
      ty * y + c,
      ty * z - s * x,
      0,
      tx * z - s * y,
      ty * z + s * x,
      t * z * z + c,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a scale transformation.
   *
   * @param {number} x - The amount to scale in the X axis.
   * @param {number} y - The amount to scale in the Y axis.
   * @param {number} z - The amount to scale in the Z axis.
   * @return {Matrix4} A reference to this matrix.
   */
  makeScale(x, y, z) {
    return this.set(
      x,
      0,
      0,
      0,
      0,
      y,
      0,
      0,
      0,
      0,
      z,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix as a shear transformation.
   *
   * @param {number} xy - The amount to shear X by Y.
   * @param {number} xz - The amount to shear X by Z.
   * @param {number} yx - The amount to shear Y by X.
   * @param {number} yz - The amount to shear Y by Z.
   * @param {number} zx - The amount to shear Z by X.
   * @param {number} zy - The amount to shear Z by Y.
   * @return {Matrix4} A reference to this matrix.
   */
  makeShear(xy, xz, yx, yz, zx, zy) {
    return this.set(
      1,
      yx,
      zx,
      0,
      xy,
      1,
      zy,
      0,
      xz,
      yz,
      1,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets this matrix to the transformation composed of the given position,
   * rotation (Quaternion) and scale.
   *
   * @param {Vector3} position - The position vector.
   * @param {Quaternion} quaternion - The rotation as a Quaternion.
   * @param {Vector3} scale - The scale vector.
   * @return {Matrix4} A reference to this matrix.
   */
  compose(position, quaternion, scale) {
    let te = this.elements, x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2, sx = scale.x, sy = scale.y, sz = scale.z;
    return te[0] = (1 - (yy + zz)) * sx, te[1] = (xy + wz) * sx, te[2] = (xz - wy) * sx, te[3] = 0, te[4] = (xy - wz) * sy, te[5] = (1 - (xx + zz)) * sy, te[6] = (yz + wx) * sy, te[7] = 0, te[8] = (xz + wy) * sz, te[9] = (yz - wx) * sz, te[10] = (1 - (xx + yy)) * sz, te[11] = 0, te[12] = position.x, te[13] = position.y, te[14] = position.z, te[15] = 1, this;
  }
  /**
   * Decomposes this matrix into its position, rotation and scale components
   * and provides the result in the given objects.
   *
   * Note: Not all matrices are decomposable in this way. For example, if an
   * object has a non-uniformly scaled parent, then the object's world matrix
   * may not be decomposable, and this method may not be appropriate.
   *
   * @param {Vector3} position - The position vector.
   * @param {Quaternion} quaternion - The rotation as a Quaternion.
   * @param {Vector3} scale - The scale vector.
   * @return {Matrix4} A reference to this matrix.
   */
  decompose(position, quaternion, scale) {
    let te = this.elements;
    position.x = te[12], position.y = te[13], position.z = te[14];
    let det = this.determinantAffine();
    if (det === 0)
      return scale.set(1, 1, 1), quaternion.identity(), this;
    let sx = _v1$7.set(te[0], te[1], te[2]).length(), sy = _v1$7.set(te[4], te[5], te[6]).length(), sz = _v1$7.set(te[8], te[9], te[10]).length();
    det < 0 && (sx = -sx), _m1$2.copy(this);
    let invSX = 1 / sx, invSY = 1 / sy, invSZ = 1 / sz;
    return _m1$2.elements[0] *= invSX, _m1$2.elements[1] *= invSX, _m1$2.elements[2] *= invSX, _m1$2.elements[4] *= invSY, _m1$2.elements[5] *= invSY, _m1$2.elements[6] *= invSY, _m1$2.elements[8] *= invSZ, _m1$2.elements[9] *= invSZ, _m1$2.elements[10] *= invSZ, quaternion.setFromRotationMatrix(_m1$2), scale.x = sx, scale.y = sy, scale.z = sz, this;
  }
  /**
  	 * Creates a perspective projection matrix. This is used internally by
  	 * {@link PerspectiveCamera#updateProjectionMatrix}.
  
  	 * @param {number} left - Left boundary of the viewing frustum at the near plane.
  	 * @param {number} right - Right boundary of the viewing frustum at the near plane.
  	 * @param {number} top - Top boundary of the viewing frustum at the near plane.
  	 * @param {number} bottom - Bottom boundary of the viewing frustum at the near plane.
  	 * @param {number} near - The distance from the camera to the near plane.
  	 * @param {number} far - The distance from the camera to the far plane.
  	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - The coordinate system.
  	 * @param {boolean} [reversedDepth=false] - Whether to use a reversed depth.
  	 * @return {Matrix4} A reference to this matrix.
  	 */
  makePerspective(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = !1) {
    let te = this.elements, x = 2 * near / (right - left), y = 2 * near / (top - bottom), a = (right + left) / (right - left), b = (top + bottom) / (top - bottom), c, d;
    if (reversedDepth)
      c = near / (far - near), d = far * near / (far - near);
    else if (coordinateSystem === WebGLCoordinateSystem)
      c = -(far + near) / (far - near), d = -2 * far * near / (far - near);
    else if (coordinateSystem === WebGPUCoordinateSystem)
      c = -far / (far - near), d = -far * near / (far - near);
    else
      throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + coordinateSystem);
    return te[0] = x, te[4] = 0, te[8] = a, te[12] = 0, te[1] = 0, te[5] = y, te[9] = b, te[13] = 0, te[2] = 0, te[6] = 0, te[10] = c, te[14] = d, te[3] = 0, te[7] = 0, te[11] = -1, te[15] = 0, this;
  }
  /**
  	 * Creates a orthographic projection matrix. This is used internally by
  	 * {@link OrthographicCamera#updateProjectionMatrix}.
  
  	 * @param {number} left - Left boundary of the viewing frustum at the near plane.
  	 * @param {number} right - Right boundary of the viewing frustum at the near plane.
  	 * @param {number} top - Top boundary of the viewing frustum at the near plane.
  	 * @param {number} bottom - Bottom boundary of the viewing frustum at the near plane.
  	 * @param {number} near - The distance from the camera to the near plane.
  	 * @param {number} far - The distance from the camera to the far plane.
  	 * @param {(WebGLCoordinateSystem|WebGPUCoordinateSystem)} [coordinateSystem=WebGLCoordinateSystem] - The coordinate system.
  	 * @param {boolean} [reversedDepth=false] - Whether to use a reversed depth.
  	 * @return {Matrix4} A reference to this matrix.
  	 */
  makeOrthographic(left, right, top, bottom, near, far, coordinateSystem = WebGLCoordinateSystem, reversedDepth = !1) {
    let te = this.elements, x = 2 / (right - left), y = 2 / (top - bottom), a = -(right + left) / (right - left), b = -(top + bottom) / (top - bottom), c, d;
    if (reversedDepth)
      c = 1 / (far - near), d = far / (far - near);
    else if (coordinateSystem === WebGLCoordinateSystem)
      c = -2 / (far - near), d = -(far + near) / (far - near);
    else if (coordinateSystem === WebGPUCoordinateSystem)
      c = -1 / (far - near), d = -near / (far - near);
    else
      throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + coordinateSystem);
    return te[0] = x, te[4] = 0, te[8] = 0, te[12] = a, te[1] = 0, te[5] = y, te[9] = 0, te[13] = b, te[2] = 0, te[6] = 0, te[10] = c, te[14] = d, te[3] = 0, te[7] = 0, te[11] = 0, te[15] = 1, this;
  }
  /**
   * Returns `true` if this matrix is equal with the given one.
   *
   * @param {Matrix4} matrix - The matrix to test for equality.
   * @return {boolean} Whether this matrix is equal with the given one.
   */
  equals(matrix) {
    let te = this.elements, me = matrix.elements;
    for (let i = 0; i < 16; i++)
      if (te[i] !== me[i])
        return !1;
    return !0;
  }
  /**
   * Sets the elements of the matrix from the given array.
   *
   * @param {Array<number>} array - The matrix elements in column-major order.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Matrix4} A reference to this matrix.
   */
  fromArray(array, offset = 0) {
    for (let i = 0; i < 16; i++)
      this.elements[i] = array[i + offset];
    return this;
  }
  /**
   * Writes the elements of this matrix to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the matrix elements in column-major order.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The matrix elements in column-major order.
   */
  toArray(array = [], offset = 0) {
    let te = this.elements;
    return array[offset] = te[0], array[offset + 1] = te[1], array[offset + 2] = te[2], array[offset + 3] = te[3], array[offset + 4] = te[4], array[offset + 5] = te[5], array[offset + 6] = te[6], array[offset + 7] = te[7], array[offset + 8] = te[8], array[offset + 9] = te[9], array[offset + 10] = te[10], array[offset + 11] = te[11], array[offset + 12] = te[12], array[offset + 13] = te[13], array[offset + 14] = te[14], array[offset + 15] = te[15], array;
  }
}, Matrix4 = _Matrix4;
(() => {
  _Matrix4.prototype.isMatrix4 = !0;
})();
var _v1$7 = /* @__PURE__ */ new Vector3(), _m1$2 = /* @__PURE__ */ new Matrix4(), _zero = /* @__PURE__ */ new Vector3(0, 0, 0), _one = /* @__PURE__ */ new Vector3(1, 1, 1), _x = /* @__PURE__ */ new Vector3(), _y = /* @__PURE__ */ new Vector3(), _z = /* @__PURE__ */ new Vector3(), _matrix$2 = /* @__PURE__ */ new Matrix4(), _quaternion$4 = /* @__PURE__ */ new Quaternion(), Euler = class {
  /**
   * Constructs a new euler instance.
   *
   * @param {number} [x=0] - The angle of the x axis in radians.
   * @param {number} [y=0] - The angle of the y axis in radians.
   * @param {number} [z=0] - The angle of the z axis in radians.
   * @param {string} [order=Euler.DEFAULT_ORDER] - A string representing the order that the rotations are applied.
   */
  constructor(x = 0, y = 0, z = 0, order = Euler.DEFAULT_ORDER) {
    this.isEuler = !0, this._x = x, this._y = y, this._z = z, this._order = order;
  }
  /**
   * The angle of the x axis in radians.
   *
   * @type {number}
   * @default 0
   */
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value, this._onChangeCallback();
  }
  /**
   * The angle of the y axis in radians.
   *
   * @type {number}
   * @default 0
   */
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value, this._onChangeCallback();
  }
  /**
   * The angle of the z axis in radians.
   *
   * @type {number}
   * @default 0
   */
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value, this._onChangeCallback();
  }
  /**
   * A string representing the order that the rotations are applied.
   *
   * @type {string}
   * @default 'XYZ'
   */
  get order() {
    return this._order;
  }
  set order(value) {
    this._order = value, this._onChangeCallback();
  }
  /**
   * Sets the Euler components.
   *
   * @param {number} x - The angle of the x axis in radians.
   * @param {number} y - The angle of the y axis in radians.
   * @param {number} z - The angle of the z axis in radians.
   * @param {string} [order] - A string representing the order that the rotations are applied.
   * @return {Euler} A reference to this Euler instance.
   */
  set(x, y, z, order = this._order) {
    return this._x = x, this._y = y, this._z = z, this._order = order, this._onChangeCallback(), this;
  }
  /**
   * Returns a new Euler instance with copied values from this instance.
   *
   * @return {Euler} A clone of this instance.
   */
  clone() {
    return new this.constructor(this._x, this._y, this._z, this._order);
  }
  /**
   * Copies the values of the given Euler instance to this instance.
   *
   * @param {Euler} euler - The Euler instance to copy.
   * @return {Euler} A reference to this Euler instance.
   */
  copy(euler) {
    return this._x = euler._x, this._y = euler._y, this._z = euler._z, this._order = euler._order, this._onChangeCallback(), this;
  }
  /**
   * Sets the angles of this Euler instance from a pure rotation matrix.
   *
   * @param {Matrix4} m - A 4x4 matrix of which the upper 3x3 of matrix is a pure rotation matrix (i.e. unscaled).
   * @param {string} [order] - A string representing the order that the rotations are applied.
   * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
   * @return {Euler} A reference to this Euler instance.
   */
  setFromRotationMatrix(m2, order = this._order, update = !0) {
    let te = m2.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10];
    switch (order) {
      case "XYZ":
        this._y = Math.asin(clamp(m13, -1, 1)), Math.abs(m13) < 0.9999999 ? (this._x = Math.atan2(-m23, m33), this._z = Math.atan2(-m12, m11)) : (this._x = Math.atan2(m32, m22), this._z = 0);
        break;
      case "YXZ":
        this._x = Math.asin(-clamp(m23, -1, 1)), Math.abs(m23) < 0.9999999 ? (this._y = Math.atan2(m13, m33), this._z = Math.atan2(m21, m22)) : (this._y = Math.atan2(-m31, m11), this._z = 0);
        break;
      case "ZXY":
        this._x = Math.asin(clamp(m32, -1, 1)), Math.abs(m32) < 0.9999999 ? (this._y = Math.atan2(-m31, m33), this._z = Math.atan2(-m12, m22)) : (this._y = 0, this._z = Math.atan2(m21, m11));
        break;
      case "ZYX":
        this._y = Math.asin(-clamp(m31, -1, 1)), Math.abs(m31) < 0.9999999 ? (this._x = Math.atan2(m32, m33), this._z = Math.atan2(m21, m11)) : (this._x = 0, this._z = Math.atan2(-m12, m22));
        break;
      case "YZX":
        this._z = Math.asin(clamp(m21, -1, 1)), Math.abs(m21) < 0.9999999 ? (this._x = Math.atan2(-m23, m22), this._y = Math.atan2(-m31, m11)) : (this._x = 0, this._y = Math.atan2(m13, m33));
        break;
      case "XZY":
        this._z = Math.asin(-clamp(m12, -1, 1)), Math.abs(m12) < 0.9999999 ? (this._x = Math.atan2(m32, m22), this._y = Math.atan2(m13, m11)) : (this._x = Math.atan2(-m23, m33), this._y = 0);
        break;
      default:
        warn("Euler: .setFromRotationMatrix() encountered an unknown order: " + order);
    }
    return this._order = order, update === !0 && this._onChangeCallback(), this;
  }
  /**
   * Sets the angles of this Euler instance from a normalized quaternion.
   *
   * @param {Quaternion} q - A normalized Quaternion.
   * @param {string} [order] - A string representing the order that the rotations are applied.
   * @param {boolean} [update=true] - Whether the internal `onChange` callback should be executed or not.
   * @return {Euler} A reference to this Euler instance.
   */
  setFromQuaternion(q, order, update) {
    return _matrix$2.makeRotationFromQuaternion(q), this.setFromRotationMatrix(_matrix$2, order, update);
  }
  /**
   * Sets the angles of this Euler instance from the given vector.
   *
   * @param {Vector3} v - The vector.
   * @param {string} [order] - A string representing the order that the rotations are applied.
   * @return {Euler} A reference to this Euler instance.
   */
  setFromVector3(v, order = this._order) {
    return this.set(v.x, v.y, v.z, order);
  }
  /**
   * Resets the euler angle with a new order by creating a quaternion from this
   * euler angle and then setting this euler angle with the quaternion and the
   * new order.
   *
   * Warning: This discards revolution information.
   *
   * @param {string} [newOrder] - A string representing the new order that the rotations are applied.
   * @return {Euler} A reference to this Euler instance.
   */
  reorder(newOrder) {
    return _quaternion$4.setFromEuler(this), this.setFromQuaternion(_quaternion$4, newOrder);
  }
  /**
   * Returns `true` if this Euler instance is equal with the given one.
   *
   * @param {Euler} euler - The Euler instance to test for equality.
   * @return {boolean} Whether this Euler instance is equal with the given one.
   */
  equals(euler) {
    return euler._x === this._x && euler._y === this._y && euler._z === this._z && euler._order === this._order;
  }
  /**
   * Sets this Euler instance's components to values from the given array. The first three
   * entries of the array are assign to the x,y and z components. An optional fourth entry
   * defines the Euler order.
   *
   * @param {Array<number,number,number,?string>} array - An array holding the Euler component values.
   * @return {Euler} A reference to this Euler instance.
   */
  fromArray(array) {
    return this._x = array[0], this._y = array[1], this._z = array[2], array[3] !== void 0 && (this._order = array[3]), this._onChangeCallback(), this;
  }
  /**
   * Writes the components of this Euler instance to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number,number,number,string>} [array=[]] - The target array holding the Euler components.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number,number,number,string>} The Euler components.
   */
  toArray(array = [], offset = 0) {
    return array[offset] = this._x, array[offset + 1] = this._y, array[offset + 2] = this._z, array[offset + 3] = this._order, array;
  }
  _onChange(callback) {
    return this._onChangeCallback = callback, this;
  }
  _onChangeCallback() {
  }
  *[Symbol.iterator]() {
    yield this._x, yield this._y, yield this._z, yield this._order;
  }
};
Euler.DEFAULT_ORDER = "XYZ";
var Layers = class {
  /**
   * Constructs a new layers instance, with membership
   * initially set to layer `0`.
   */
  constructor() {
    this.mask = 1;
  }
  /**
   * Sets membership to the given layer, and remove membership all other layers.
   *
   * @param {number} layer - The layer to set.
   */
  set(layer) {
    this.mask = (1 << layer | 0) >>> 0;
  }
  /**
   * Adds membership of the given layer.
   *
   * @param {number} layer - The layer to enable.
   */
  enable(layer) {
    this.mask |= 1 << layer | 0;
  }
  /**
   * Adds membership to all layers.
   */
  enableAll() {
    this.mask = -1;
  }
  /**
   * Toggles the membership of the given layer.
   *
   * @param {number} layer - The layer to toggle.
   */
  toggle(layer) {
    this.mask ^= 1 << layer | 0;
  }
  /**
   * Removes membership of the given layer.
   *
   * @param {number} layer - The layer to enable.
   */
  disable(layer) {
    this.mask &= ~(1 << layer | 0);
  }
  /**
   * Removes the membership from all layers.
   */
  disableAll() {
    this.mask = 0;
  }
  /**
   * Returns `true` if this and the given layers object have at least one
   * layer in common.
   *
   * @param {Layers} layers - The layers to test.
   * @return {boolean } Whether this and the given layers object have at least one layer in common or not.
   */
  test(layers) {
    return (this.mask & layers.mask) !== 0;
  }
  /**
   * Returns `true` if the given layer is enabled.
   *
   * @param {number} layer - The layer to test.
   * @return {boolean } Whether the given layer is enabled or not.
   */
  isEnabled(layer) {
    return (this.mask & (1 << layer | 0)) !== 0;
  }
}, _object3DId = 0, _v1$6 = /* @__PURE__ */ new Vector3(), _q1 = /* @__PURE__ */ new Quaternion(), _m1$1 = /* @__PURE__ */ new Matrix4(), _target = /* @__PURE__ */ new Vector3(), _position$4 = /* @__PURE__ */ new Vector3(), _scale$3 = /* @__PURE__ */ new Vector3(), _quaternion$3 = /* @__PURE__ */ new Quaternion(), _xAxis = /* @__PURE__ */ new Vector3(1, 0, 0), _yAxis = /* @__PURE__ */ new Vector3(0, 1, 0), _zAxis = /* @__PURE__ */ new Vector3(0, 0, 1), _addedEvent = { type: "added" }, _removedEvent = { type: "removed" }, _childaddedEvent = { type: "childadded", child: null }, _childremovedEvent = { type: "childremoved", child: null }, Object3D = class extends EventDispatcher {
  /**
   * Constructs a new 3D object.
   */
  constructor() {
    super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: _object3DId++ }), this.uuid = generateUUID(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = Object3D.DEFAULT_UP.clone();
    let position = new Vector3(), rotation = new Euler(), quaternion = new Quaternion(), scale = new Vector3(1, 1, 1);
    function onRotationChange() {
      quaternion.setFromEuler(rotation, !1);
    }
    function onQuaternionChange() {
      rotation.setFromQuaternion(quaternion, void 0, !1);
    }
    rotation._onChange(onRotationChange), quaternion._onChange(onQuaternionChange), Object.defineProperties(this, {
      /**
       * Represents the object's local position.
       *
       * @name Object3D#position
       * @type {Vector3}
       * @default (0,0,0)
       */
      position: {
        configurable: !0,
        enumerable: !0,
        value: position
      },
      /**
       * Represents the object's local rotation as Euler angles, in radians.
       *
       * @name Object3D#rotation
       * @type {Euler}
       * @default (0,0,0)
       */
      rotation: {
        configurable: !0,
        enumerable: !0,
        value: rotation
      },
      /**
       * Represents the object's local rotation as Quaternions.
       *
       * @name Object3D#quaternion
       * @type {Quaternion}
       */
      quaternion: {
        configurable: !0,
        enumerable: !0,
        value: quaternion
      },
      /**
       * Represents the object's local scale.
       *
       * @name Object3D#scale
       * @type {Vector3}
       * @default (1,1,1)
       */
      scale: {
        configurable: !0,
        enumerable: !0,
        value: scale
      },
      /**
       * Represents the object's model-view matrix.
       *
       * @name Object3D#modelViewMatrix
       * @type {Matrix4}
       */
      modelViewMatrix: {
        value: new Matrix4()
      },
      /**
       * Represents the object's normal matrix.
       *
       * @name Object3D#normalMatrix
       * @type {Matrix3}
       */
      normalMatrix: {
        value: new Matrix3()
      }
    }), this.matrix = new Matrix4(), this.matrixWorld = new Matrix4(), this.matrixAutoUpdate = Object3D.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Layers(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.customDepthMaterial = void 0, this.customDistanceMaterial = void 0, this.static = !1, this.userData = {}, this.pivot = null;
  }
  /**
   * A callback that is executed immediately before a 3D object is rendered to a shadow map.
   *
   * @param {Renderer|WebGLRenderer} renderer - The renderer.
   * @param {Object3D} object - The 3D object.
   * @param {Camera} camera - The camera that is used to render the scene.
   * @param {Camera} shadowCamera - The shadow camera.
   * @param {BufferGeometry} geometry - The 3D object's geometry.
   * @param {Material} depthMaterial - The depth material.
   * @param {Object} group - The geometry group data.
   */
  onBeforeShadow() {
  }
  /**
   * A callback that is executed immediately after a 3D object is rendered to a shadow map.
   *
   * @param {Renderer|WebGLRenderer} renderer - The renderer.
   * @param {Object3D} object - The 3D object.
   * @param {Camera} camera - The camera that is used to render the scene.
   * @param {Camera} shadowCamera - The shadow camera.
   * @param {BufferGeometry} geometry - The 3D object's geometry.
   * @param {Material} depthMaterial - The depth material.
   * @param {Object} group - The geometry group data.
   */
  onAfterShadow() {
  }
  /**
   * A callback that is executed immediately before a 3D object is rendered.
   *
   * @param {Renderer|WebGLRenderer} renderer - The renderer.
   * @param {Object3D} scene - The scene.
   * @param {Camera} camera - The camera that is used to render the scene.
   * @param {BufferGeometry} geometry - The 3D object's geometry.
   * @param {Material} material - The 3D object's material.
   * @param {Object} group - The geometry group data.
   */
  onBeforeRender() {
  }
  /**
   * A callback that is executed immediately after a 3D object is rendered.
   *
   * @param {Renderer|WebGLRenderer} renderer - The renderer.
   * @param {Object3D} scene - The scene.
   * @param {Camera} camera - The camera that is used to render the scene.
   * @param {BufferGeometry} geometry - The 3D object's geometry.
   * @param {Material} material - The 3D object's material.
   * @param {Object} group - The geometry group data.
   */
  onAfterRender() {
  }
  /**
   * Applies the given transformation matrix to the object and updates the object's position,
   * rotation and scale.
   *
   * @param {Matrix4} matrix - The transformation matrix.
   */
  applyMatrix4(matrix) {
    this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(matrix), this.matrix.decompose(this.position, this.quaternion, this.scale), this.pivot !== null && this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot);
  }
  /**
   * Applies a rotation represented by given the quaternion to the 3D object.
   *
   * @param {Quaternion} q - The quaternion.
   * @return {Object3D} A reference to this instance.
   */
  applyQuaternion(q) {
    return this.quaternion.premultiply(q), this;
  }
  /**
   * Sets the given rotation represented as an axis/angle couple to the 3D object.
   *
   * @param {Vector3} axis - The (normalized) axis vector.
   * @param {number} angle - The angle in radians.
   */
  setRotationFromAxisAngle(axis, angle) {
    this.quaternion.setFromAxisAngle(axis, angle);
  }
  /**
   * Sets the given rotation represented as Euler angles to the 3D object.
   *
   * @param {Euler} euler - The Euler angles.
   */
  setRotationFromEuler(euler) {
    this.quaternion.setFromEuler(euler, !0);
  }
  /**
   * Sets the given rotation represented as rotation matrix to the 3D object.
   *
   * @param {Matrix4} m - Although a 4x4 matrix is expected, the upper 3x3 portion must be
   * a pure rotation matrix (i.e, unscaled).
   */
  setRotationFromMatrix(m2) {
    this.quaternion.setFromRotationMatrix(m2);
  }
  /**
   * Sets the given rotation represented as a Quaternion to the 3D object.
   *
   * @param {Quaternion} q - The Quaternion
   */
  setRotationFromQuaternion(q) {
    this.quaternion.copy(q);
  }
  /**
   * Rotates the 3D object along an axis in local space.
   *
   * @param {Vector3} axis - The (normalized) axis vector.
   * @param {number} angle - The angle in radians.
   * @return {Object3D} A reference to this instance.
   */
  rotateOnAxis(axis, angle) {
    return _q1.setFromAxisAngle(axis, angle), this.quaternion.multiply(_q1), this;
  }
  /**
   * Rotates the 3D object along an axis in world space.
   *
   * @param {Vector3} axis - The (normalized) axis vector.
   * @param {number} angle - The angle in radians.
   * @return {Object3D} A reference to this instance.
   */
  rotateOnWorldAxis(axis, angle) {
    return _q1.setFromAxisAngle(axis, angle), this.quaternion.premultiply(_q1), this;
  }
  /**
   * Rotates the 3D object around its X axis in local space.
   *
   * @param {number} angle - The angle in radians.
   * @return {Object3D} A reference to this instance.
   */
  rotateX(angle) {
    return this.rotateOnAxis(_xAxis, angle);
  }
  /**
   * Rotates the 3D object around its Y axis in local space.
   *
   * @param {number} angle - The angle in radians.
   * @return {Object3D} A reference to this instance.
   */
  rotateY(angle) {
    return this.rotateOnAxis(_yAxis, angle);
  }
  /**
   * Rotates the 3D object around its Z axis in local space.
   *
   * @param {number} angle - The angle in radians.
   * @return {Object3D} A reference to this instance.
   */
  rotateZ(angle) {
    return this.rotateOnAxis(_zAxis, angle);
  }
  /**
   * Translate the 3D object by a distance along the given axis in local space.
   *
   * @param {Vector3} axis - The (normalized) axis vector.
   * @param {number} distance - The distance in world units.
   * @return {Object3D} A reference to this instance.
   */
  translateOnAxis(axis, distance) {
    return _v1$6.copy(axis).applyQuaternion(this.quaternion), this.position.add(_v1$6.multiplyScalar(distance)), this;
  }
  /**
   * Translate the 3D object by a distance along its X-axis in local space.
   *
   * @param {number} distance - The distance in world units.
   * @return {Object3D} A reference to this instance.
   */
  translateX(distance) {
    return this.translateOnAxis(_xAxis, distance);
  }
  /**
   * Translate the 3D object by a distance along its Y-axis in local space.
   *
   * @param {number} distance - The distance in world units.
   * @return {Object3D} A reference to this instance.
   */
  translateY(distance) {
    return this.translateOnAxis(_yAxis, distance);
  }
  /**
   * Translate the 3D object by a distance along its Z-axis in local space.
   *
   * @param {number} distance - The distance in world units.
   * @return {Object3D} A reference to this instance.
   */
  translateZ(distance) {
    return this.translateOnAxis(_zAxis, distance);
  }
  /**
   * Converts the given vector from this 3D object's local space to world space.
   *
   * @param {Vector3} vector - The vector to convert.
   * @return {Vector3} The converted vector.
   */
  localToWorld(vector) {
    return this.updateWorldMatrix(!0, !1), vector.applyMatrix4(this.matrixWorld);
  }
  /**
   * Converts the given vector from this 3D object's world space to local space.
   *
   * @param {Vector3} vector - The vector to convert.
   * @return {Vector3} The converted vector.
   */
  worldToLocal(vector) {
    return this.updateWorldMatrix(!0, !1), vector.applyMatrix4(_m1$1.copy(this.matrixWorld).invert());
  }
  /**
   * Rotates the object to face a point in world space.
   *
   * This method does not support objects having non-uniformly-scaled parent(s).
   *
   * @param {number|Vector3} x - The x coordinate in world space. Alternatively, a vector representing a position in world space
   * @param {number} [y] - The y coordinate in world space.
   * @param {number} [z] - The z coordinate in world space.
   */
  lookAt(x, y, z) {
    x.isVector3 ? _target.copy(x) : _target.set(x, y, z);
    let parent = this.parent;
    this.updateWorldMatrix(!0, !1), _position$4.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? _m1$1.lookAt(_position$4, _target, this.up) : _m1$1.lookAt(_target, _position$4, this.up), this.quaternion.setFromRotationMatrix(_m1$1), parent && (_m1$1.extractRotation(parent.matrixWorld), _q1.setFromRotationMatrix(_m1$1), this.quaternion.premultiply(_q1.invert()));
  }
  /**
   * Adds the given 3D object as a child to this 3D object. An arbitrary number of
   * objects may be added. Any current parent on an object passed in here will be
   * removed, since an object can have at most one parent.
   *
   * @fires Object3D#added
   * @fires Object3D#childadded
   * @param {Object3D} object - The 3D object to add.
   * @return {Object3D} A reference to this instance.
   */
  add(object) {
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++)
        this.add(arguments[i]);
      return this;
    }
    return object === this ? (error("Object3D.add: object can't be added as a child of itself.", object), this) : (object && object.isObject3D ? (object.removeFromParent(), object.parent = this, this.children.push(object), object.dispatchEvent(_addedEvent), _childaddedEvent.child = object, this.dispatchEvent(_childaddedEvent), _childaddedEvent.child = null) : error("Object3D.add: object not an instance of THREE.Object3D.", object), this);
  }
  /**
   * Removes the given 3D object as child from this 3D object.
   * An arbitrary number of objects may be removed.
   *
   * @fires Object3D#removed
   * @fires Object3D#childremoved
   * @param {Object3D} object - The 3D object to remove.
   * @return {Object3D} A reference to this instance.
   */
  remove(object) {
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++)
        this.remove(arguments[i]);
      return this;
    }
    let index = this.children.indexOf(object);
    return index !== -1 && (object.parent = null, this.children.splice(index, 1), object.dispatchEvent(_removedEvent), _childremovedEvent.child = object, this.dispatchEvent(_childremovedEvent), _childremovedEvent.child = null), this;
  }
  /**
   * Removes this 3D object from its current parent.
   *
   * @fires Object3D#removed
   * @fires Object3D#childremoved
   * @return {Object3D} A reference to this instance.
   */
  removeFromParent() {
    let parent = this.parent;
    return parent !== null && parent.remove(this), this;
  }
  /**
   * Removes all child objects.
   *
   * @fires Object3D#removed
   * @fires Object3D#childremoved
   * @return {Object3D} A reference to this instance.
   */
  clear() {
    return this.remove(...this.children);
  }
  /**
   * Adds the given 3D object as a child of this 3D object, while maintaining the object's world
   * transform. This method does not support scene graphs having non-uniformly-scaled nodes(s).
   *
   * @fires Object3D#added
   * @fires Object3D#childadded
   * @param {Object3D} object - The 3D object to attach.
   * @return {Object3D} A reference to this instance.
   */
  attach(object) {
    return this.updateWorldMatrix(!0, !1), _m1$1.copy(this.matrixWorld).invert(), object.parent !== null && (object.parent.updateWorldMatrix(!0, !1), _m1$1.multiply(object.parent.matrixWorld)), object.applyMatrix4(_m1$1), object.removeFromParent(), object.parent = this, this.children.push(object), object.updateWorldMatrix(!1, !0), object.dispatchEvent(_addedEvent), _childaddedEvent.child = object, this.dispatchEvent(_childaddedEvent), _childaddedEvent.child = null, this;
  }
  /**
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns the first with a matching ID.
   *
   * @param {number} id - The id.
   * @return {Object3D|undefined} The found 3D object. Returns `undefined` if no 3D object has been found.
   */
  getObjectById(id) {
    return this.getObjectByProperty("id", id);
  }
  /**
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns the first with a matching name.
   *
   * @param {string} name - The name.
   * @return {Object3D|undefined} The found 3D object. Returns `undefined` if no 3D object has been found.
   */
  getObjectByName(name) {
    return this.getObjectByProperty("name", name);
  }
  /**
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns the first with a matching property value.
   *
   * @param {string} name - The name of the property.
   * @param {any} value - The value.
   * @return {Object3D|undefined} The found 3D object. Returns `undefined` if no 3D object has been found.
   */
  getObjectByProperty(name, value) {
    if (this[name] === value)
      return this;
    for (let i = 0, l = this.children.length; i < l; i++) {
      let object = this.children[i].getObjectByProperty(name, value);
      if (object !== void 0)
        return object;
    }
  }
  /**
   * Searches through the 3D object and its children, starting with the 3D object
   * itself, and returns all 3D objects with a matching property value.
   *
   * @param {string} name - The name of the property.
   * @param {any} value - The value.
   * @param {Array<Object3D>} result - The method stores the result in this array.
   * @return {Array<Object3D>} The found 3D objects.
   */
  getObjectsByProperty(name, value, result = []) {
    this[name] === value && result.push(this);
    let children = this.children;
    for (let i = 0, l = children.length; i < l; i++)
      children[i].getObjectsByProperty(name, value, result);
    return result;
  }
  /**
   * Returns a vector representing the position of the 3D object in world space.
   *
   * @param {Vector3} target - The target vector the result is stored to.
   * @return {Vector3} The 3D object's position in world space.
   */
  getWorldPosition(target) {
    return this.updateWorldMatrix(!0, !1), target.setFromMatrixPosition(this.matrixWorld);
  }
  /**
   * Returns a Quaternion representing the position of the 3D object in world space.
   *
   * @param {Quaternion} target - The target Quaternion the result is stored to.
   * @return {Quaternion} The 3D object's rotation in world space.
   */
  getWorldQuaternion(target) {
    return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(_position$4, target, _scale$3), target;
  }
  /**
   * Returns a vector representing the scale of the 3D object in world space.
   *
   * @param {Vector3} target - The target vector the result is stored to.
   * @return {Vector3} The 3D object's scale in world space.
   */
  getWorldScale(target) {
    return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(_position$4, _quaternion$3, target), target;
  }
  /**
   * Returns a vector representing the ("look") direction of the 3D object in world space.
   *
   * @param {Vector3} target - The target vector the result is stored to.
   * @return {Vector3} The 3D object's direction in world space.
   */
  getWorldDirection(target) {
    this.updateWorldMatrix(!0, !1);
    let e2 = this.matrixWorld.elements;
    return target.set(e2[8], e2[9], e2[10]).normalize();
  }
  /**
   * Abstract method to get intersections between a casted ray and this
   * 3D object. Renderable 3D objects such as {@link Mesh}, {@link Line} or {@link Points}
   * implement this method in order to use raycasting.
   *
   * @abstract
   * @param {Raycaster} raycaster - The raycaster.
   * @param {Array<Object>} intersects - An array holding the result of the method.
   */
  raycast() {
  }
  /**
   * Returns `true` if this 3D object intersects the given frustum. Renderable 3D objects
   * such as {@link Mesh}, {@link Line} or {@link Points} override this method in order
   * to use frustum culling. The default implementation always returns `true`.
   *
   * @param {Frustum|FrustumArray} frustum - The frustum to test.
   * @return {boolean} Whether this 3D object intersects the given frustum or not.
   */
  intersectsFrustum() {
    return !0;
  }
  /**
   * Executes the callback on this 3D object and all descendants.
   *
   * Note: Modifying the scene graph inside the callback is discouraged.
   *
   * @param {Function} callback - A callback function that allows to process the current 3D object.
   */
  traverse(callback) {
    callback(this);
    let children = this.children;
    for (let i = 0, l = children.length; i < l; i++)
      children[i].traverse(callback);
  }
  /**
   * Like {@link Object3D#traverse}, but the callback will only be executed for visible 3D objects.
   * Descendants of invisible 3D objects are not traversed.
   *
   * Note: Modifying the scene graph inside the callback is discouraged.
   *
   * @param {Function} callback - A callback function that allows to process the current 3D object.
   */
  traverseVisible(callback) {
    if (this.visible === !1)
      return;
    callback(this);
    let children = this.children;
    for (let i = 0, l = children.length; i < l; i++)
      children[i].traverseVisible(callback);
  }
  /**
   * Like {@link Object3D#traverse}, but the callback will only be executed for all ancestors.
   *
   * Note: Modifying the scene graph inside the callback is discouraged.
   *
   * @param {Function} callback - A callback function that allows to process the current 3D object.
   */
  traverseAncestors(callback) {
    let parent = this.parent;
    parent !== null && (callback(parent), parent.traverseAncestors(callback));
  }
  /**
   * Updates the transformation matrix in local space by computing it from the current
   * position, rotation and scale values.
   */
  updateMatrix() {
    this.matrix.compose(this.position, this.quaternion, this.scale);
    let pivot = this.pivot;
    if (pivot !== null) {
      let px = pivot.x, py = pivot.y, pz = pivot.z, te = this.matrix.elements;
      te[12] += px - te[0] * px - te[4] * py - te[8] * pz, te[13] += py - te[1] * px - te[5] * py - te[9] * pz, te[14] += pz - te[2] * px - te[6] * py - te[10] * pz;
    }
    this.matrixWorldNeedsUpdate = !0;
  }
  /**
   * Updates the transformation matrix in world space of this 3D objects and its descendants.
   *
   * To ensure correct results, this method also recomputes the 3D object's transformation matrix in
   * local space. The computation of the local and world matrix can be controlled with the
   * {@link Object3D#matrixAutoUpdate} and {@link Object3D#matrixWorldAutoUpdate} flags which are both
   * `true` by default.  Set these flags to `false` if you need more control over the update matrix process.
   *
   * @param {boolean} [force=false] - When set to `true`, a recomputation of world matrices is forced even
   * when {@link Object3D#matrixWorldNeedsUpdate} is `false`.
   */
  updateMatrixWorld(force) {
    this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || force) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, force = !0);
    let children = this.children;
    for (let i = 0, l = children.length; i < l; i++)
      children[i].updateMatrixWorld(force);
  }
  /**
   * An alternative version of {@link Object3D#updateMatrixWorld} with more control over the
   * update of ancestor and descendant nodes.
   *
   * @param {boolean} [updateParents=false] Whether ancestor nodes should be updated or not.
   * @param {boolean} [updateChildren=false] Whether descendant nodes should be updated or not.
   * @param {boolean} [force=false] - When set to `true`, a recomputation of world matrices is forced even
   * when {@link Object3D#matrixWorldNeedsUpdate} is `false`.
   */
  updateWorldMatrix(updateParents, updateChildren, force = !1) {
    let parent = this.parent;
    if (updateParents === !0 && parent !== null && parent.updateWorldMatrix(!0, !1), this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || force) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, force = !0), updateChildren === !0) {
      let children = this.children;
      for (let i = 0, l = children.length; i < l; i++)
        children[i].updateWorldMatrix(!1, !0, force);
    }
  }
  /**
   * Serializes the 3D object into JSON.
   *
   * @param {?(Object|string)} meta - An optional value holding meta information about the serialization.
   * @return {Object} A JSON object representing the serialized 3D object.
   * @see {@link ObjectLoader#parse}
   */
  toJSON(meta) {
    let isRootObject = meta === void 0 || typeof meta == "string", output = {};
    isRootObject && (meta = {
      geometries: {},
      materials: {},
      textures: {},
      images: {},
      shapes: {},
      skeletons: {},
      animations: {},
      nodes: {}
    }, output.metadata = {
      version: 4.7,
      type: "Object",
      generator: "Object3D.toJSON"
    });
    let object = {};
    object.uuid = this.uuid, object.type = this.type, object.name = this.name, object.castShadow = this.castShadow, object.receiveShadow = this.receiveShadow, object.visible = this.visible, object.frustumCulled = this.frustumCulled, object.renderOrder = this.renderOrder, object.static = this.static, object.matrixAutoUpdate = this.matrixAutoUpdate, Object.keys(this.userData).length > 0 && (object.userData = this.userData), object.layers = this.layers.mask, object.matrix = this.matrix.toArray(), object.up = this.up.toArray(), this.pivot !== null && (object.pivot = this.pivot.toArray()), this.morphTargetDictionary !== void 0 && (object.morphTargetDictionary = Object.assign({}, this.morphTargetDictionary)), this.morphTargetInfluences !== void 0 && (object.morphTargetInfluences = this.morphTargetInfluences.slice()), this.isInstancedMesh && (object.type = "InstancedMesh", object.count = this.count, object.instanceMatrix = this.instanceMatrix.toJSON(), this.instanceColor !== null && (object.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (object.type = "BatchedMesh", object.perObjectFrustumCulled = this.perObjectFrustumCulled, object.sortObjects = this.sortObjects, object.drawRanges = this._drawRanges, object.reservedRanges = this._reservedRanges, object.geometryInfo = this._geometryInfo.map((info) => ({
      ...info,
      boundingBox: info.boundingBox ? info.boundingBox.toJSON() : void 0,
      boundingSphere: info.boundingSphere ? info.boundingSphere.toJSON() : void 0
    })), object.instanceInfo = this._instanceInfo.map((info) => ({ ...info })), object.availableInstanceIds = this._availableInstanceIds.slice(), object.availableGeometryIds = this._availableGeometryIds.slice(), object.nextIndexStart = this._nextIndexStart, object.nextVertexStart = this._nextVertexStart, object.geometryCount = this._geometryCount, object.maxInstanceCount = this._maxInstanceCount, object.maxVertexCount = this._maxVertexCount, object.maxIndexCount = this._maxIndexCount, object.geometryInitialized = this._geometryInitialized, object.matricesTexture = this._matricesTexture.toJSON(meta), object.indirectTexture = this._indirectTexture.toJSON(meta), this._colorsTexture !== null && (object.colorsTexture = this._colorsTexture.toJSON(meta)), this.boundingSphere !== null && (object.boundingSphere = this.boundingSphere.toJSON()), this.boundingBox !== null && (object.boundingBox = this.boundingBox.toJSON()));
    function serialize(library, element) {
      return library[element.uuid] === void 0 && (library[element.uuid] = element.toJSON(meta)), element.uuid;
    }
    if (this.isScene)
      this.background && (this.background.isColor ? object.background = this.background.toJSON() : this.background.isTexture && (object.background = this.background.toJSON(meta).uuid)), this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== !0 && (object.environment = this.environment.toJSON(meta).uuid);
    else if (this.isMesh || this.isLine || this.isPoints) {
      object.geometry = serialize(meta.geometries, this.geometry);
      let parameters = this.geometry.parameters;
      if (parameters !== void 0 && parameters.shapes !== void 0) {
        let shapes = parameters.shapes;
        if (Array.isArray(shapes))
          for (let i = 0, l = shapes.length; i < l; i++) {
            let shape = shapes[i];
            serialize(meta.shapes, shape);
          }
        else
          serialize(meta.shapes, shapes);
      }
    }
    if (this.isSkinnedMesh && (object.bindMode = this.bindMode, object.bindMatrix = this.bindMatrix.toArray(), this.skeleton !== void 0 && (serialize(meta.skeletons, this.skeleton), object.skeleton = this.skeleton.uuid)), this.material !== void 0)
      if (Array.isArray(this.material)) {
        let uuids = [];
        for (let i = 0, l = this.material.length; i < l; i++)
          uuids.push(serialize(meta.materials, this.material[i]));
        object.material = uuids;
      } else
        object.material = serialize(meta.materials, this.material);
    if (this.children.length > 0) {
      object.children = [];
      for (let i = 0; i < this.children.length; i++)
        object.children.push(this.children[i].toJSON(meta).object);
    }
    if (this.animations.length > 0) {
      object.animations = [];
      for (let i = 0; i < this.animations.length; i++) {
        let animation = this.animations[i];
        object.animations.push(serialize(meta.animations, animation));
      }
    }
    if (isRootObject) {
      let geometries = extractFromCache(meta.geometries), materials = extractFromCache(meta.materials), textures = extractFromCache(meta.textures), images = extractFromCache(meta.images), shapes = extractFromCache(meta.shapes), skeletons = extractFromCache(meta.skeletons), animations = extractFromCache(meta.animations), nodes = extractFromCache(meta.nodes);
      geometries.length > 0 && (output.geometries = geometries), materials.length > 0 && (output.materials = materials), textures.length > 0 && (output.textures = textures), images.length > 0 && (output.images = images), shapes.length > 0 && (output.shapes = shapes), skeletons.length > 0 && (output.skeletons = skeletons), animations.length > 0 && (output.animations = animations), nodes.length > 0 && (output.nodes = nodes);
    }
    return output.object = object, output;
    function extractFromCache(cache) {
      let values = [];
      for (let key in cache) {
        let data = cache[key];
        delete data.metadata, values.push(data);
      }
      return values;
    }
  }
  /**
   * Returns a new 3D object with copied values from this instance.
   *
   * @param {boolean} [recursive=true] - When set to `true`, descendants of the 3D object are also cloned.
   * @return {Object3D} A clone of this instance.
   */
  clone(recursive) {
    return new this.constructor().copy(this, recursive);
  }
  /**
   * Copies the values of the given 3D object to this instance.
   *
   * @param {Object3D} source - The 3D object to copy.
   * @param {boolean} [recursive=true] - When set to `true`, descendants of the 3D object are cloned.
   * @return {Object3D} A reference to this instance.
   */
  copy(source, recursive = !0) {
    if (this.name = source.name, this.up.copy(source.up), this.position.copy(source.position), this.rotation.order = source.rotation.order, this.quaternion.copy(source.quaternion), this.scale.copy(source.scale), this.pivot = source.pivot !== null ? source.pivot.clone() : null, this.matrix.copy(source.matrix), this.matrixWorld.copy(source.matrixWorld), this.matrixAutoUpdate = source.matrixAutoUpdate, this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate, this.layers.mask = source.layers.mask, this.visible = source.visible, this.castShadow = source.castShadow, this.receiveShadow = source.receiveShadow, this.frustumCulled = source.frustumCulled, this.renderOrder = source.renderOrder, this.static = source.static, this.animations = source.animations.slice(), this.userData = JSON.parse(JSON.stringify(source.userData)), recursive === !0)
      for (let i = 0; i < source.children.length; i++) {
        let child = source.children[i];
        this.add(child.clone());
      }
    return this;
  }
  /**
   * Frees the GPU-related resources allocated by this instance. Call this
   * method whenever this instance is no longer used in your app.
   *
   * Geometries, materials and textures are potentially shared with other
   * 3D objects and must be disposed of separately.
   *
   * @fires Object3D#dispose
   */
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
};
Object3D.DEFAULT_UP = /* @__PURE__ */ new Vector3(0, 1, 0);
Object3D.DEFAULT_MATRIX_AUTO_UPDATE = !0;
Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
var _colorKeywords = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
}, _hslA = { h: 0, s: 0, l: 0 }, _hslB = { h: 0, s: 0, l: 0 };
function hue2rgb(p, q, t) {
  return t < 0 && (t += 1), t > 1 && (t -= 1), t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * 6 * (2 / 3 - t) : p;
}
var Color = class {
  /**
   * Constructs a new color.
   *
   * Note that standard method of specifying color in three.js is with a hexadecimal triplet,
   * and that method is used throughout the rest of the documentation.
   *
   * @param {(number|string|Color)} [r] - The red component of the color. If `g` and `b` are
   * not provided, it can be hexadecimal triplet, a CSS-style string or another `Color` instance.
   * @param {number} [g] - The green component.
   * @param {number} [b] - The blue component.
   */
  constructor(r, g2, b) {
    return this.isColor = !0, this.r = 1, this.g = 1, this.b = 1, this.set(r, g2, b);
  }
  /**
   * Sets the colors's components from the given values.
   *
   * @param {(number|string|Color)} [r] - The red component of the color. If `g` and `b` are
   * not provided, it can be hexadecimal triplet, a CSS-style string or another `Color` instance.
   * @param {number} [g] - The green component.
   * @param {number} [b] - The blue component.
   * @return {Color} A reference to this color.
   */
  set(r, g2, b) {
    if (g2 === void 0 && b === void 0) {
      let value = r;
      value && value.isColor ? this.copy(value) : typeof value == "number" ? this.setHex(value) : typeof value == "string" && this.setStyle(value);
    } else
      this.setRGB(r, g2, b);
    return this;
  }
  /**
   * Sets the colors's components to the given scalar value.
   *
   * @param {number} scalar - The scalar value.
   * @return {Color} A reference to this color.
   */
  setScalar(scalar) {
    return this.r = scalar, this.g = scalar, this.b = scalar, this;
  }
  /**
   * Sets this color from a hexadecimal value.
   *
   * @param {number} hex - The hexadecimal value.
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {Color} A reference to this color.
   */
  setHex(hex, colorSpace = SRGBColorSpace) {
    return hex = Math.floor(hex), this.r = (hex >> 16 & 255) / 255, this.g = (hex >> 8 & 255) / 255, this.b = (hex & 255) / 255, ColorManagement.colorSpaceToWorking(this, colorSpace), this;
  }
  /**
   * Sets this color from RGB values.
   *
   * @param {number} r - Red channel value between `0.0` and `1.0`.
   * @param {number} g - Green channel value between `0.0` and `1.0`.
   * @param {number} b - Blue channel value between `0.0` and `1.0`.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - The color space.
   * @return {Color} A reference to this color.
   */
  setRGB(r, g2, b, colorSpace = ColorManagement.workingColorSpace) {
    return this.r = r, this.g = g2, this.b = b, ColorManagement.colorSpaceToWorking(this, colorSpace), this;
  }
  /**
   * Sets this color from RGB values.
   *
   * @param {number} h - Hue value between `0.0` and `1.0`.
   * @param {number} s - Saturation value between `0.0` and `1.0`.
   * @param {number} l - Lightness value between `0.0` and `1.0`.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - The color space.
   * @return {Color} A reference to this color.
   */
  setHSL(h, s, l, colorSpace = ColorManagement.workingColorSpace) {
    if (h = euclideanModulo(h, 1), s = clamp(s, 0, 1), l = clamp(l, 0, 1), s === 0)
      this.r = this.g = this.b = l;
    else {
      let p = l <= 0.5 ? l * (1 + s) : l + s - l * s, q = 2 * l - p;
      this.r = hue2rgb(q, p, h + 1 / 3), this.g = hue2rgb(q, p, h), this.b = hue2rgb(q, p, h - 1 / 3);
    }
    return ColorManagement.colorSpaceToWorking(this, colorSpace), this;
  }
  /**
   * Sets this color from a CSS-style string. For example, `rgb(250, 0,0)`,
   * `rgb(100%, 0%, 0%)`, `hsl(0, 100%, 50%)`, `#ff0000`, `#f00`, or `red` ( or
   * any [X11 color name](https://en.wikipedia.org/wiki/X11_color_names#Color_name_chart) -
   * all 140 color names are supported).
   *
   * @param {string} style - Color as a CSS-style string.
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {Color} A reference to this color.
   */
  setStyle(style, colorSpace = SRGBColorSpace) {
    function handleAlpha(string) {
      string !== void 0 && parseFloat(string) < 1 && warn("Color: Alpha component of " + style + " will be ignored.");
    }
    let m2;
    if (m2 = /^(\w+)\(([^\)]*)\)/.exec(style)) {
      let color, name = m2[1], components = m2[2];
      switch (name) {
        case "rgb":
        case "rgba":
          if (color = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(components))
            return handleAlpha(color[4]), this.setRGB(
              Math.min(255, parseInt(color[1], 10)) / 255,
              Math.min(255, parseInt(color[2], 10)) / 255,
              Math.min(255, parseInt(color[3], 10)) / 255,
              colorSpace
            );
          if (color = /^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(components))
            return handleAlpha(color[4]), this.setRGB(
              Math.min(100, parseFloat(color[1])) / 100,
              Math.min(100, parseFloat(color[2])) / 100,
              Math.min(100, parseFloat(color[3])) / 100,
              colorSpace
            );
          break;
        case "hsl":
        case "hsla":
          if (color = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(components))
            return handleAlpha(color[4]), this.setHSL(
              parseFloat(color[1]) / 360,
              parseFloat(color[2]) / 100,
              parseFloat(color[3]) / 100,
              colorSpace
            );
          break;
        default:
          warn("Color: Unknown color model " + style);
      }
    } else if (m2 = /^\#([A-Fa-f\d]+)$/.exec(style)) {
      let hex = m2[1], size = hex.length;
      if (size === 3)
        return this.setRGB(
          parseInt(hex.charAt(0), 16) / 15,
          parseInt(hex.charAt(1), 16) / 15,
          parseInt(hex.charAt(2), 16) / 15,
          colorSpace
        );
      if (size === 6)
        return this.setHex(parseInt(hex, 16), colorSpace);
      warn("Color: Invalid hex color " + style);
    } else if (style && style.length > 0)
      return this.setColorName(style, colorSpace);
    return this;
  }
  /**
   * Sets this color from a color name. Faster than {@link Color#setStyle} if
   * you don't need the other CSS-style formats.
   *
   * For convenience, the list of names is exposed in `Color.NAMES` as a hash.
   * ```js
   * Color.NAMES.aliceblue // returns 0xF0F8FF
   * ```
   *
   * @param {string} style - The color name.
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {Color} A reference to this color.
   */
  setColorName(style, colorSpace = SRGBColorSpace) {
    let hex = _colorKeywords[style.toLowerCase()];
    return hex !== void 0 ? this.setHex(hex, colorSpace) : warn("Color: Unknown color " + style), this;
  }
  /**
   * Returns a new color with copied values from this instance.
   *
   * @return {Color} A clone of this instance.
   */
  clone() {
    return new this.constructor(this.r, this.g, this.b);
  }
  /**
   * Copies the values of the given color to this instance.
   *
   * @param {Color} color - The color to copy.
   * @return {Color} A reference to this color.
   */
  copy(color) {
    return this.r = color.r, this.g = color.g, this.b = color.b, this;
  }
  /**
   * Copies the given color into this color, and then converts this color from
   * `SRGBColorSpace` to `LinearSRGBColorSpace`.
   *
   * @param {Color} color - The color to copy/convert.
   * @return {Color} A reference to this color.
   */
  copySRGBToLinear(color) {
    return this.r = SRGBToLinear(color.r), this.g = SRGBToLinear(color.g), this.b = SRGBToLinear(color.b), this;
  }
  /**
   * Copies the given color into this color, and then converts this color from
   * `LinearSRGBColorSpace` to `SRGBColorSpace`.
   *
   * @param {Color} color - The color to copy/convert.
   * @return {Color} A reference to this color.
   */
  copyLinearToSRGB(color) {
    return this.r = LinearToSRGB(color.r), this.g = LinearToSRGB(color.g), this.b = LinearToSRGB(color.b), this;
  }
  /**
   * Converts this color from `SRGBColorSpace` to `LinearSRGBColorSpace`.
   *
   * @return {Color} A reference to this color.
   */
  convertSRGBToLinear() {
    return this.copySRGBToLinear(this), this;
  }
  /**
   * Converts this color from `LinearSRGBColorSpace` to `SRGBColorSpace`.
   *
   * @return {Color} A reference to this color.
   */
  convertLinearToSRGB() {
    return this.copyLinearToSRGB(this), this;
  }
  /**
   * Returns the hexadecimal value of this color.
   *
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {number} The hexadecimal value.
   */
  getHex(colorSpace = SRGBColorSpace) {
    return ColorManagement.workingToColorSpace(_color.copy(this), colorSpace), Math.round(clamp(_color.r * 255, 0, 255)) * 65536 + Math.round(clamp(_color.g * 255, 0, 255)) * 256 + Math.round(clamp(_color.b * 255, 0, 255));
  }
  /**
   * Returns the hexadecimal value of this color as a string (for example, 'FFFFFF').
   *
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {string} The hexadecimal value as a string.
   */
  getHexString(colorSpace = SRGBColorSpace) {
    return ("000000" + this.getHex(colorSpace).toString(16)).slice(-6);
  }
  /**
   * Converts the colors RGB values into the HSL format and stores them into the
   * given target object.
   *
   * @param {{h:number,s:number,l:number}} target - The target object that is used to store the method's result.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - The color space.
   * @return {{h:number,s:number,l:number}} The HSL representation of this color.
   */
  getHSL(target, colorSpace = ColorManagement.workingColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);
    let r = _color.r, g2 = _color.g, b = _color.b, max = Math.max(r, g2, b), min = Math.min(r, g2, b), hue, saturation, lightness = (min + max) / 2;
    if (min === max)
      hue = 0, saturation = 0;
    else {
      let delta2 = max - min;
      switch (saturation = lightness <= 0.5 ? delta2 / (max + min) : delta2 / (2 - max - min), max) {
        case r:
          hue = (g2 - b) / delta2 + (g2 < b ? 6 : 0);
          break;
        case g2:
          hue = (b - r) / delta2 + 2;
          break;
        case b:
          hue = (r - g2) / delta2 + 4;
          break;
      }
      hue /= 6;
    }
    return target.h = hue, target.s = saturation, target.l = lightness, target;
  }
  /**
   * Returns the RGB values of this color and stores them into the given target object.
   *
   * @param {Color} target - The target color that is used to store the method's result.
   * @param {string} [colorSpace=ColorManagement.workingColorSpace] - The color space.
   * @return {Color} The RGB representation of this color.
   */
  getRGB(target, colorSpace = ColorManagement.workingColorSpace) {
    return ColorManagement.workingToColorSpace(_color.copy(this), colorSpace), target.r = _color.r, target.g = _color.g, target.b = _color.b, target;
  }
  /**
   * Returns the value of this color as a CSS style string. Example: `rgb(255,0,0)`.
   *
   * @param {string} [colorSpace=SRGBColorSpace] - The color space.
   * @return {string} The CSS representation of this color.
   */
  getStyle(colorSpace = SRGBColorSpace) {
    ColorManagement.workingToColorSpace(_color.copy(this), colorSpace);
    let r = _color.r, g2 = _color.g, b = _color.b;
    return colorSpace !== SRGBColorSpace ? `color(${colorSpace} ${r.toFixed(3)} ${g2.toFixed(3)} ${b.toFixed(3)})` : `rgb(${Math.round(r * 255)},${Math.round(g2 * 255)},${Math.round(b * 255)})`;
  }
  /**
   * Adds the given HSL values to this color's values.
   * Internally, this converts the color's RGB values to HSL, adds HSL
   * and then converts the color back to RGB.
   *
   * @param {number} h - Hue value between `0.0` and `1.0`.
   * @param {number} s - Saturation value between `0.0` and `1.0`.
   * @param {number} l - Lightness value between `0.0` and `1.0`.
   * @return {Color} A reference to this color.
   */
  offsetHSL(h, s, l) {
    return this.getHSL(_hslA), this.setHSL(_hslA.h + h, _hslA.s + s, _hslA.l + l);
  }
  /**
   * Adds the RGB values of the given color to the RGB values of this color.
   *
   * @param {Color} color - The color to add.
   * @return {Color} A reference to this color.
   */
  add(color) {
    return this.r += color.r, this.g += color.g, this.b += color.b, this;
  }
  /**
   * Adds the RGB values of the given colors and stores the result in this instance.
   *
   * @param {Color} color1 - The first color.
   * @param {Color} color2 - The second color.
   * @return {Color} A reference to this color.
   */
  addColors(color1, color2) {
    return this.r = color1.r + color2.r, this.g = color1.g + color2.g, this.b = color1.b + color2.b, this;
  }
  /**
   * Adds the given scalar value to the RGB values of this color.
   *
   * @param {number} s - The scalar to add.
   * @return {Color} A reference to this color.
   */
  addScalar(s) {
    return this.r += s, this.g += s, this.b += s, this;
  }
  /**
   * Subtracts the RGB values of the given color from the RGB values of this color.
   *
   * @param {Color} color - The color to subtract.
   * @return {Color} A reference to this color.
   */
  sub(color) {
    return this.r = Math.max(0, this.r - color.r), this.g = Math.max(0, this.g - color.g), this.b = Math.max(0, this.b - color.b), this;
  }
  /**
   * Multiplies the RGB values of the given color with the RGB values of this color.
   *
   * @param {Color} color - The color to multiply.
   * @return {Color} A reference to this color.
   */
  multiply(color) {
    return this.r *= color.r, this.g *= color.g, this.b *= color.b, this;
  }
  /**
   * Multiplies the given scalar value with the RGB values of this color.
   *
   * @param {number} s - The scalar to multiply.
   * @return {Color} A reference to this color.
   */
  multiplyScalar(s) {
    return this.r *= s, this.g *= s, this.b *= s, this;
  }
  /**
   * Linearly interpolates this color's RGB values toward the RGB values of the
   * given color. The alpha argument can be thought of as the ratio between
   * the two colors, where `0.0` is this color and `1.0` is the first argument.
   *
   * @param {Color} color - The color to converge on.
   * @param {number} alpha - The interpolation factor in the closed interval `[0,1]`.
   * @return {Color} A reference to this color.
   */
  lerp(color, alpha) {
    return this.r += (color.r - this.r) * alpha, this.g += (color.g - this.g) * alpha, this.b += (color.b - this.b) * alpha, this;
  }
  /**
   * Linearly interpolates between the given colors and stores the result in this instance.
   * The alpha argument can be thought of as the ratio between the two colors, where `0.0`
   * is the first and `1.0` is the second color.
   *
   * @param {Color} color1 - The first color.
   * @param {Color} color2 - The second color.
   * @param {number} alpha - The interpolation factor in the closed interval `[0,1]`.
   * @return {Color} A reference to this color.
   */
  lerpColors(color1, color2, alpha) {
    return this.r = color1.r + (color2.r - color1.r) * alpha, this.g = color1.g + (color2.g - color1.g) * alpha, this.b = color1.b + (color2.b - color1.b) * alpha, this;
  }
  /**
   * Linearly interpolates this color's HSL values toward the HSL values of the
   * given color. It differs from {@link Color#lerp} by not interpolating straight
   * from one color to the other, but instead going through all the hues in between
   * those two colors. The alpha argument can be thought of as the ratio between
   * the two colors, where 0.0 is this color and 1.0 is the first argument.
   *
   * @param {Color} color - The color to converge on.
   * @param {number} alpha - The interpolation factor in the closed interval `[0,1]`.
   * @return {Color} A reference to this color.
   */
  lerpHSL(color, alpha) {
    this.getHSL(_hslA), color.getHSL(_hslB);
    let h = lerp(_hslA.h, _hslB.h, alpha), s = lerp(_hslA.s, _hslB.s, alpha), l = lerp(_hslA.l, _hslB.l, alpha);
    return this.setHSL(h, s, l), this;
  }
  /**
   * Sets the color's RGB components from the given 3D vector.
   *
   * @param {Vector3} v - The vector to set.
   * @return {Color} A reference to this color.
   */
  setFromVector3(v) {
    return this.r = v.x, this.g = v.y, this.b = v.z, this;
  }
  /**
   * Transforms this color with the given 3x3 matrix.
   *
   * @param {Matrix3} m - The matrix.
   * @return {Color} A reference to this color.
   */
  applyMatrix3(m2) {
    let r = this.r, g2 = this.g, b = this.b, e2 = m2.elements;
    return this.r = e2[0] * r + e2[3] * g2 + e2[6] * b, this.g = e2[1] * r + e2[4] * g2 + e2[7] * b, this.b = e2[2] * r + e2[5] * g2 + e2[8] * b, this;
  }
  /**
   * Returns `true` if this color is equal with the given one.
   *
   * @param {Color} c - The color to test for equality.
   * @return {boolean} Whether this bounding color is equal with the given one.
   */
  equals(c) {
    return c.r === this.r && c.g === this.g && c.b === this.b;
  }
  /**
   * Sets this color's RGB components from the given array.
   *
   * @param {Array<number>} array - An array holding the RGB values.
   * @param {number} [offset=0] - The offset into the array.
   * @return {Color} A reference to this color.
   */
  fromArray(array, offset = 0) {
    return this.r = array[offset], this.g = array[offset + 1], this.b = array[offset + 2], this;
  }
  /**
   * Writes the RGB components of this color to the given array. If no array is provided,
   * the method returns a new instance.
   *
   * @param {Array<number>} [array=[]] - The target array holding the color components.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Array<number>} The color components.
   */
  toArray(array = [], offset = 0) {
    return array[offset] = this.r, array[offset + 1] = this.g, array[offset + 2] = this.b, array;
  }
  /**
   * Sets the components of this color from the given buffer attribute.
   *
   * @param {BufferAttribute} attribute - The buffer attribute holding color data.
   * @param {number} index - The index into the attribute.
   * @return {Color} A reference to this color.
   */
  fromBufferAttribute(attribute, index) {
    return this.r = attribute.getX(index), this.g = attribute.getY(index), this.b = attribute.getZ(index), this;
  }
  /**
   * This methods defines the serialization result of this class. Returns the color
   * as a hexadecimal value.
   *
   * @return {number} The hexadecimal value.
   */
  toJSON() {
    return this.getHex();
  }
  *[Symbol.iterator]() {
    yield this.r, yield this.g, yield this.b;
  }
}, _color = /* @__PURE__ */ new Color();
Color.NAMES = _colorKeywords;
function cloneUniforms(src) {
  let dst = {};
  for (let u in src) {
    dst[u] = {};
    for (let p in src[u]) {
      let property = src[u][p];
      if (isThreeObject(property))
        property.isRenderTargetTexture ? (warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."), dst[u][p] = null) : dst[u][p] = property.clone();
      else if (Array.isArray(property))
        if (isThreeObject(property[0])) {
          let clonedProperty = [];
          for (let i = 0, l = property.length; i < l; i++)
            clonedProperty[i] = property[i].clone();
          dst[u][p] = clonedProperty;
        } else
          dst[u][p] = property.slice();
      else
        dst[u][p] = property;
    }
  }
  return dst;
}
function mergeUniforms(uniforms) {
  let merged = {};
  for (let u = 0; u < uniforms.length; u++) {
    let tmp = cloneUniforms(uniforms[u]);
    for (let p in tmp)
      merged[p] = tmp[p];
  }
  return merged;
}
function isThreeObject(property) {
  return property && (property.isColor || property.isMatrix3 || property.isMatrix4 || property.isVector2 || property.isVector3 || property.isVector4 || property.isTexture || property.isQuaternion);
}
function convertArray(array, type) {
  return !array || array.constructor === type ? array : typeof type.BYTES_PER_ELEMENT == "number" ? new type(array) : Array.prototype.slice.call(array);
}
function hasTangents(settings) {
  return settings !== void 0 && settings.inTangents !== void 0 && settings.outTangents !== void 0;
}
var Interpolant = class {
  /**
   * Constructs a new interpolant.
   *
   * @param {TypedArray} parameterPositions - The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - The sample values.
   * @param {number} sampleSize - The sample size
   * @param {TypedArray} [resultBuffer] - The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    this.parameterPositions = parameterPositions, this._cachedIndex = 0, this.resultBuffer = resultBuffer !== void 0 ? resultBuffer : new sampleValues.constructor(sampleSize), this.sampleValues = sampleValues, this.valueSize = sampleSize, this.settings = null, this.DefaultSettings_ = {};
  }
  /**
   * Evaluate the interpolant at position `t`.
   *
   * @param {number} t - The interpolation factor.
   * @return {TypedArray} The result buffer.
   */
  evaluate(t) {
    let pp = this.parameterPositions, i1 = this._cachedIndex, t1 = pp[i1], t0 = pp[i1 - 1];
    validate_interval: {
      seek: {
        let right;
        linear_scan: {
          forward_scan:
            if (!(t < t1)) {
              for (let giveUpAt = i1 + 2; ; ) {
                if (t1 === void 0) {
                  if (t < t0)
                    break forward_scan;
                  return i1 = pp.length, this._cachedIndex = i1, this.copySampleValue_(i1 - 1);
                }
                if (i1 === giveUpAt)
                  break;
                if (t0 = t1, t1 = pp[++i1], t < t1)
                  break seek;
              }
              right = pp.length;
              break linear_scan;
            }
          if (!(t >= t0)) {
            let t1global = pp[1];
            t < t1global && (i1 = 2, t0 = t1global);
            for (let giveUpAt = i1 - 2; ; ) {
              if (t0 === void 0)
                return this._cachedIndex = 0, this.copySampleValue_(0);
              if (i1 === giveUpAt)
                break;
              if (t1 = t0, t0 = pp[--i1 - 1], t >= t0)
                break seek;
            }
            right = i1, i1 = 0;
            break linear_scan;
          }
          break validate_interval;
        }
        for (; i1 < right; ) {
          let mid = i1 + right >>> 1;
          t < pp[mid] ? right = mid : i1 = mid + 1;
        }
        if (t1 = pp[i1], t0 = pp[i1 - 1], t0 === void 0)
          return this._cachedIndex = 0, this.copySampleValue_(0);
        if (t1 === void 0)
          return i1 = pp.length, this._cachedIndex = i1, this.copySampleValue_(i1 - 1);
      }
      this._cachedIndex = i1, this.intervalChanged_(i1, t0, t1);
    }
    return this.interpolate_(i1, t0, t, t1);
  }
  /**
   * Returns the interpolation settings.
   *
   * @return {Object} The interpolation settings.
   */
  getSettings_() {
    return this.settings || this.DefaultSettings_;
  }
  /**
   * Copies a sample value to the result buffer.
   *
   * @param {number} index - An index into the sample value buffer.
   * @return {TypedArray} The result buffer.
   */
  copySampleValue_(index) {
    let result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, offset = index * stride;
    for (let i = 0; i !== stride; ++i)
      result[i] = values[offset + i];
    return result;
  }
  /**
   * Copies a sample value to the result buffer.
   *
   * @abstract
   * @param {number} i1 - An index into the sample value buffer.
   * @param {number} t0 - The previous interpolation factor.
   * @param {number} t - The current interpolation factor.
   * @param {number} t1 - The next interpolation factor.
   * @return {TypedArray} The result buffer.
   */
  interpolate_() {
    throw new Error("THREE.Interpolant: Call to abstract method.");
  }
  /**
   * Optional method that is executed when the interval has changed.
   *
   * @param {number} i1 - An index into the sample value buffer.
   * @param {number} t0 - The previous interpolation factor.
   * @param {number} t1 - The next interpolation factor.
   */
  intervalChanged_() {
  }
}, CubicInterpolant = class extends Interpolant {
  /**
   * Constructs a new cubic interpolant.
   *
   * @param {TypedArray} parameterPositions - The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - The sample values.
   * @param {number} sampleSize - The sample size
   * @param {TypedArray} [resultBuffer] - The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
      endingStart: ZeroCurvatureEnding,
      endingEnd: ZeroCurvatureEnding
    };
  }
  intervalChanged_(i1, t0, t1) {
    let pp = this.parameterPositions, iPrev = i1 - 2, iNext = i1 + 1, tPrev = pp[iPrev], tNext = pp[iNext];
    if (tPrev === void 0)
      switch (this.getSettings_().endingStart) {
        case ZeroSlopeEnding:
          iPrev = i1, tPrev = 2 * t0 - t1;
          break;
        case WrapAroundEnding:
          iPrev = pp.length - 2, tPrev = t0 + pp[iPrev] - pp[iPrev + 1];
          break;
        default:
          iPrev = i1, tPrev = t1;
      }
    if (tNext === void 0)
      switch (this.getSettings_().endingEnd) {
        case ZeroSlopeEnding:
          iNext = i1, tNext = 2 * t1 - t0;
          break;
        case WrapAroundEnding:
          iNext = 1, tNext = t1 + pp[1] - pp[0];
          break;
        default:
          iNext = i1 - 1, tNext = t0;
      }
    let halfDt = (t1 - t0) * 0.5, stride = this.valueSize;
    this._weightPrev = halfDt / (t0 - tPrev), this._weightNext = halfDt / (tNext - t1), this._offsetPrev = iPrev * stride, this._offsetNext = iNext * stride;
  }
  interpolate_(i1, t0, t, t1) {
    let result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, o1 = i1 * stride, o0 = o1 - stride, oP = this._offsetPrev, oN = this._offsetNext, wP = this._weightPrev, wN = this._weightNext, p = (t - t0) / (t1 - t0), pp = p * p, ppp = pp * p, sP = -wP * ppp + 2 * wP * pp - wP * p, s02 = (1 + wP) * ppp + (-1.5 - 2 * wP) * pp + (-0.5 + wP) * p + 1, s1 = (-1 - wN) * ppp + (1.5 + wN) * pp + 0.5 * p, sN = wN * ppp - wN * pp;
    for (let i = 0; i !== stride; ++i)
      result[i] = sP * values[oP + i] + s02 * values[o0 + i] + s1 * values[o1 + i] + sN * values[oN + i];
    return result;
  }
}, LinearInterpolant = class extends Interpolant {
  /**
   * Constructs a new linear interpolant.
   *
   * @param {TypedArray} parameterPositions - The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - The sample values.
   * @param {number} sampleSize - The sample size
   * @param {TypedArray} [resultBuffer] - The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  interpolate_(i1, t0, t, t1) {
    let result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, offset1 = i1 * stride, offset0 = offset1 - stride, weight1 = (t - t0) / (t1 - t0), weight0 = 1 - weight1;
    for (let i = 0; i !== stride; ++i)
      result[i] = values[offset0 + i] * weight0 + values[offset1 + i] * weight1;
    return result;
  }
}, DiscreteInterpolant = class extends Interpolant {
  /**
   * Constructs a new discrete interpolant.
   *
   * @param {TypedArray} parameterPositions - The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - The sample values.
   * @param {number} sampleSize - The sample size
   * @param {TypedArray} [resultBuffer] - The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  interpolate_(i1) {
    return this.copySampleValue_(i1 - 1);
  }
}, BezierInterpolant = class extends Interpolant {
  interpolate_(i1, t0, t, t1) {
    let result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, offset1 = i1 * stride, offset0 = offset1 - stride, inTangents = this.inTangents, outTangents = this.outTangents;
    if (!inTangents || !outTangents) {
      let weight1 = (t - t0) / (t1 - t0), weight0 = 1 - weight1;
      for (let i = 0; i !== stride; ++i)
        result[i] = values[offset0 + i] * weight0 + values[offset1 + i] * weight1;
      return result;
    }
    let tangentStride = stride * 2, i0 = i1 - 1;
    for (let i = 0; i !== stride; ++i) {
      let v0 = values[offset0 + i], v1 = values[offset1 + i], outTangentOffset = i0 * tangentStride + i * 2, c0x = outTangents[outTangentOffset], c0y = outTangents[outTangentOffset + 1], inTangentOffset = i1 * tangentStride + i * 2, c1x = inTangents[inTangentOffset], c1y = inTangents[inTangentOffset + 1], s = solveBezierParameter(t, t0, c0x, c1x, t1);
      result[i] = cubicBezier(s, v0, c0y, c1y, v1);
    }
    return result;
  }
};
function cubicBezier(s, p0, p1, p2, p3) {
  let k = 1 - s;
  return k * k * k * p0 + 3 * k * k * s * p1 + 3 * k * s * s * p2 + s * s * s * p3;
}
function cubicBezierSlope(s, p0, p1, p2, p3) {
  let k = 1 - s;
  return 3 * k * k * (p1 - p0) + 6 * k * s * (p2 - p1) + 3 * s * s * (p3 - p2);
}
function solveBezierParameter(x, x0, x1, x2, x3) {
  let s = (x - x0) / (x3 - x0);
  for (let i = 0; i < 8; i++) {
    let error2 = cubicBezier(s, x0, x1, x2, x3) - x;
    if (Math.abs(error2) < 1e-10)
      break;
    let slope = cubicBezierSlope(s, x0, x1, x2, x3);
    if (Math.abs(slope) < 1e-10)
      break;
    s = Math.max(0, Math.min(1, s - error2 / slope));
  }
  return s;
}
var KeyframeTrack = class {
  /**
   * Constructs a new keyframe track.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<number|string|boolean>} values - A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth|InterpolateBezier)} [interpolation] - The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    if (name === void 0)
      throw new Error("THREE.KeyframeTrack: track name is undefined");
    if (times === void 0 || times.length === 0)
      throw new Error("THREE.KeyframeTrack: no keyframes in track named " + name);
    this.name = name, this.times = convertArray(times, this.TimeBufferType), this.values = convertArray(values, this.ValueBufferType), this.setInterpolation(interpolation || this.DefaultInterpolation);
  }
  /**
   * Converts the keyframe track to JSON.
   *
   * @static
   * @param {KeyframeTrack} track - The keyframe track to serialize.
   * @return {Object} The serialized keyframe track as JSON.
   */
  static toJSON(track) {
    let trackType = track.constructor, json;
    if (trackType.toJSON !== this.toJSON)
      json = trackType.toJSON(track);
    else {
      json = {
        name: track.name,
        times: convertArray(track.times, Array),
        values: convertArray(track.values, Array)
      };
      let interpolation = track.getInterpolation();
      interpolation !== track.DefaultInterpolation && (json.interpolation = interpolation), hasTangents(track.settings) && (json.settings = {
        inTangents: convertArray(track.settings.inTangents, Array),
        outTangents: convertArray(track.settings.outTangents, Array)
      });
    }
    return json.type = track.ValueTypeName, json;
  }
  /**
   * Factory method for creating a new discrete interpolant.
   *
   * @static
   * @param {TypedArray} [result] - The result buffer.
   * @return {DiscreteInterpolant} The new interpolant.
   */
  InterpolantFactoryMethodDiscrete(result) {
    return new DiscreteInterpolant(this.times, this.values, this.getValueSize(), result);
  }
  /**
   * Factory method for creating a new linear interpolant.
   *
   * @static
   * @param {TypedArray} [result] - The result buffer.
   * @return {LinearInterpolant} The new interpolant.
   */
  InterpolantFactoryMethodLinear(result) {
    return new LinearInterpolant(this.times, this.values, this.getValueSize(), result);
  }
  /**
   * Factory method for creating a new smooth interpolant.
   *
   * @static
   * @param {TypedArray} [result] - The result buffer.
   * @return {CubicInterpolant} The new interpolant.
   */
  InterpolantFactoryMethodSmooth(result) {
    return new CubicInterpolant(this.times, this.values, this.getValueSize(), result);
  }
  /**
   * Factory method for creating a new Bezier interpolant.
   *
   * The Bezier interpolant requires tangent data to be set via the `settings` property
   * on the track before creating the interpolant. The settings should contain:
   * - `inTangents`: Float32Array with [time, value] pairs per keyframe per component
   * - `outTangents`: Float32Array with [time, value] pairs per keyframe per component
   *
   * @static
   * @param {TypedArray} [result] - The result buffer.
   * @return {BezierInterpolant} The new interpolant.
   */
  InterpolantFactoryMethodBezier(result) {
    let interpolant = new BezierInterpolant(this.times, this.values, this.getValueSize(), result);
    return this.settings && (interpolant.inTangents = this.settings.inTangents, interpolant.outTangents = this.settings.outTangents), interpolant;
  }
  /**
   * Defines the interpolation factor method for this keyframe track.
   *
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth|InterpolateBezier)} interpolation - The interpolation type.
   * @return {KeyframeTrack} A reference to this keyframe track.
   */
  setInterpolation(interpolation) {
    let factoryMethod;
    switch (interpolation) {
      case InterpolateDiscrete:
        factoryMethod = this.InterpolantFactoryMethodDiscrete;
        break;
      case InterpolateLinear:
        factoryMethod = this.InterpolantFactoryMethodLinear;
        break;
      case InterpolateSmooth:
        factoryMethod = this.InterpolantFactoryMethodSmooth;
        break;
      case InterpolateBezier:
        factoryMethod = this.InterpolantFactoryMethodBezier;
        break;
    }
    if (factoryMethod === void 0) {
      let message = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
      if (this.createInterpolant === void 0)
        if (interpolation !== this.DefaultInterpolation)
          this.setInterpolation(this.DefaultInterpolation);
        else
          throw new Error(message);
      return warn("KeyframeTrack:", message), this;
    }
    return this.createInterpolant = factoryMethod, this;
  }
  /**
   * Returns the current interpolation type.
   *
   * @return {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth|InterpolateBezier)} The interpolation type.
   */
  getInterpolation() {
    switch (this.createInterpolant) {
      case this.InterpolantFactoryMethodDiscrete:
        return InterpolateDiscrete;
      case this.InterpolantFactoryMethodLinear:
        return InterpolateLinear;
      case this.InterpolantFactoryMethodSmooth:
        return InterpolateSmooth;
      case this.InterpolantFactoryMethodBezier:
        return InterpolateBezier;
    }
  }
  /**
   * Returns the value size.
   *
   * @return {number} The value size.
   */
  getValueSize() {
    return this.values.length / this.times.length;
  }
  /**
   * Moves all keyframes either forward or backward in time.
   *
   * @param {number} timeOffset - The offset to move the time values.
   * @return {KeyframeTrack} A reference to this keyframe track.
   */
  shift(timeOffset) {
    if (timeOffset !== 0) {
      let times = this.times;
      for (let i = 0, n = times.length; i !== n; ++i)
        times[i] += timeOffset;
      hasTangents(this.settings) && (shiftTangentTimes(this.settings.inTangents, timeOffset), shiftTangentTimes(this.settings.outTangents, timeOffset));
    }
    return this;
  }
  /**
   * Scale all keyframe times by a factor (useful for frame - seconds conversions).
   *
   * @param {number} timeScale - The time scale.
   * @return {KeyframeTrack} A reference to this keyframe track.
   */
  scale(timeScale) {
    if (timeScale !== 1) {
      let times = this.times;
      for (let i = 0, n = times.length; i !== n; ++i)
        times[i] *= timeScale;
      hasTangents(this.settings) && (scaleTangentTimes(this.settings.inTangents, timeScale), scaleTangentTimes(this.settings.outTangents, timeScale));
    }
    return this;
  }
  /**
   * Removes keyframes before and after animation without changing any values within the defined time range.
   *
   * Note: The method does not shift around keys to the start of the track time, because for interpolated
   * keys this will change their values
   *
   * @param {number} startTime - The start time.
   * @param {number} endTime - The end time.
   * @return {KeyframeTrack} A reference to this keyframe track.
   */
  trim(startTime, endTime) {
    let times = this.times, nKeys = times.length, from = 0, to = nKeys - 1;
    for (; from !== nKeys && times[from] < startTime; )
      ++from;
    for (; to !== -1 && times[to] > endTime; )
      --to;
    if (++to, from !== 0 || to !== nKeys) {
      from >= to && (to = Math.max(to, 1), from = to - 1);
      let stride = this.getValueSize();
      this.times = times.slice(from, to), this.values = this.values.slice(from * stride, to * stride);
    }
    return this;
  }
  /**
   * Performs minimal validation on the keyframe track. Returns `true` if the values
   * are valid.
   *
   * @return {boolean} Whether the keyframes are valid or not.
   */
  validate() {
    let valid = !0, valueSize = this.getValueSize();
    valueSize - Math.floor(valueSize) !== 0 && (error("KeyframeTrack: Invalid value size in track.", this), valid = !1);
    let times = this.times, values = this.values, nKeys = times.length;
    nKeys === 0 && (error("KeyframeTrack: Track is empty.", this), valid = !1);
    let prevTime = null;
    for (let i = 0; i !== nKeys; i++) {
      let currTime = times[i];
      if (typeof currTime == "number" && isNaN(currTime)) {
        error("KeyframeTrack: Time is not a valid number.", this, i, currTime), valid = !1;
        break;
      }
      if (prevTime !== null && prevTime > currTime) {
        error("KeyframeTrack: Out of order keys.", this, i, currTime, prevTime), valid = !1;
        break;
      }
      prevTime = currTime;
    }
    if (values !== void 0 && isTypedArray(values))
      for (let i = 0, n = values.length; i !== n; ++i) {
        let value = values[i];
        if (isNaN(value)) {
          error("KeyframeTrack: Value is not a valid number.", this, i, value), valid = !1;
          break;
        }
      }
    return valid;
  }
  /**
   * Optimizes this keyframe track by removing equivalent sequential keys (which are
   * common in morph target sequences).
   *
   * @return {KeyframeTrack} A reference to this keyframe track.
   */
  optimize() {
    let times = this.times.slice(), values = this.values.slice(), stride = this.getValueSize(), smoothInterpolation = this.getInterpolation() === InterpolateSmooth, lastIndex = times.length - 1, writeIndex = 1;
    for (let i = 1; i < lastIndex; ++i) {
      let keep = !1, time = times[i], timeNext = times[i + 1];
      if (time !== timeNext && (i !== 1 || time !== times[0]))
        if (smoothInterpolation)
          keep = !0;
        else {
          let offset = i * stride, offsetP = offset - stride, offsetN = offset + stride;
          for (let j = 0; j !== stride; ++j) {
            let value = values[offset + j];
            if (value !== values[offsetP + j] || value !== values[offsetN + j]) {
              keep = !0;
              break;
            }
          }
        }
      if (keep) {
        if (i !== writeIndex) {
          times[writeIndex] = times[i];
          let readOffset = i * stride, writeOffset = writeIndex * stride;
          for (let j = 0; j !== stride; ++j)
            values[writeOffset + j] = values[readOffset + j];
        }
        ++writeIndex;
      }
    }
    if (lastIndex > 0) {
      times[writeIndex] = times[lastIndex];
      for (let readOffset = lastIndex * stride, writeOffset = writeIndex * stride, j = 0; j !== stride; ++j)
        values[writeOffset + j] = values[readOffset + j];
      ++writeIndex;
    }
    return writeIndex !== times.length ? (this.times = times.slice(0, writeIndex), this.values = values.slice(0, writeIndex * stride)) : (this.times = times, this.values = values), this;
  }
  /**
   * Returns a new keyframe track with copied values from this instance.
   *
   * @return {KeyframeTrack} A clone of this instance.
   */
  clone() {
    let times = this.times.slice(), values = this.values.slice(), TypedKeyframeTrack = this.constructor, track = new TypedKeyframeTrack(this.name, times, values);
    return track.createInterpolant = this.createInterpolant, hasTangents(this.settings) && (track.settings = {
      inTangents: this.settings.inTangents.slice(),
      outTangents: this.settings.outTangents.slice()
    }), track;
  }
};
function shiftTangentTimes(tangents, timeOffset) {
  for (let i = 0, n = tangents.length; i !== n; i += 2)
    tangents[i] += timeOffset;
}
function scaleTangentTimes(tangents, timeScale) {
  for (let i = 0, n = tangents.length; i !== n; i += 2)
    tangents[i] *= timeScale;
}
KeyframeTrack.prototype.ValueTypeName = "";
KeyframeTrack.prototype.TimeBufferType = Float32Array;
KeyframeTrack.prototype.ValueBufferType = Float32Array;
KeyframeTrack.prototype.DefaultInterpolation = InterpolateLinear;
var BooleanKeyframeTrack = class extends KeyframeTrack {
  /**
   * Constructs a new boolean keyframe track.
   *
   * This keyframe track type has no `interpolation` parameter because the
   * interpolation is always discrete.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<boolean>} values - A list of keyframe values.
   */
  constructor(name, times, values) {
    super(name, times, values);
  }
};
BooleanKeyframeTrack.prototype.ValueTypeName = "bool";
BooleanKeyframeTrack.prototype.ValueBufferType = Array;
BooleanKeyframeTrack.prototype.DefaultInterpolation = InterpolateDiscrete;
BooleanKeyframeTrack.prototype.InterpolantFactoryMethodLinear = void 0;
BooleanKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = void 0;
var ColorKeyframeTrack = class extends KeyframeTrack {
  /**
   * Constructs a new color keyframe track.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<number>} values - A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
};
ColorKeyframeTrack.prototype.ValueTypeName = "color";
var NumberKeyframeTrack = class extends KeyframeTrack {
  /**
   * Constructs a new number keyframe track.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<number>} values - A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
};
NumberKeyframeTrack.prototype.ValueTypeName = "number";
var QuaternionLinearInterpolant = class extends Interpolant {
  /**
   * Constructs a new SLERP interpolant.
   *
   * @param {TypedArray} parameterPositions - The parameter positions hold the interpolation factors.
   * @param {TypedArray} sampleValues - The sample values.
   * @param {number} sampleSize - The sample size
   * @param {TypedArray} [resultBuffer] - The result buffer.
   */
  constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer);
  }
  interpolate_(i1, t0, t, t1) {
    let result = this.resultBuffer, values = this.sampleValues, stride = this.valueSize, alpha = (t - t0) / (t1 - t0), offset = i1 * stride;
    for (let end = offset + stride; offset !== end; offset += 4)
      Quaternion.slerpFlat(result, 0, values, offset - stride, values, offset, alpha);
    return result;
  }
}, QuaternionKeyframeTrack = class extends KeyframeTrack {
  /**
   * Constructs a new Quaternion keyframe track.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<number>} values - A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
  /**
   * Overwritten so the method returns Quaternion based interpolant.
   *
   * @static
   * @param {TypedArray} [result] - The result buffer.
   * @return {QuaternionLinearInterpolant} The new interpolant.
   */
  InterpolantFactoryMethodLinear(result) {
    return new QuaternionLinearInterpolant(this.times, this.values, this.getValueSize(), result);
  }
};
QuaternionKeyframeTrack.prototype.ValueTypeName = "quaternion";
QuaternionKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = void 0;
var StringKeyframeTrack = class extends KeyframeTrack {
  /**
   * Constructs a new string keyframe track.
   *
   * This keyframe track type has no `interpolation` parameter because the
   * interpolation is always discrete.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<string>} values - A list of keyframe values.
   */
  constructor(name, times, values) {
    super(name, times, values);
  }
};
StringKeyframeTrack.prototype.ValueTypeName = "string";
StringKeyframeTrack.prototype.ValueBufferType = Array;
StringKeyframeTrack.prototype.DefaultInterpolation = InterpolateDiscrete;
StringKeyframeTrack.prototype.InterpolantFactoryMethodLinear = void 0;
StringKeyframeTrack.prototype.InterpolantFactoryMethodSmooth = void 0;
var VectorKeyframeTrack = class extends KeyframeTrack {
  /**
   * Constructs a new vector keyframe track.
   *
   * @param {string} name - The keyframe track's name.
   * @param {Array<number>} times - A list of keyframe times.
   * @param {Array<number>} values - A list of keyframe values.
   * @param {(InterpolateLinear|InterpolateDiscrete|InterpolateSmooth)} [interpolation] - The interpolation type.
   */
  constructor(name, times, values, interpolation) {
    super(name, times, values, interpolation);
  }
};
VectorKeyframeTrack.prototype.ValueTypeName = "vector";
var LoadingManager = class {
  /**
   * Constructs a new loading manager.
   *
   * @param {Function} [onLoad] - Executes when all items have been loaded.
   * @param {Function} [onProgress] - Executes when single items have been loaded.
   * @param {Function} [onError] - Executes when an error occurs.
   */
  constructor(onLoad, onProgress, onError) {
    let scope = this, isLoading = !1, itemsLoaded = 0, itemsTotal = 0, urlModifier, handlers = [];
    this.onStart = void 0, this.onLoad = onLoad, this.onProgress = onProgress, this.onError = onError, this._abortController = null, this.itemStart = function(url) {
      itemsTotal++, isLoading === !1 && scope.onStart !== void 0 && scope.onStart(url, itemsLoaded, itemsTotal), isLoading = !0;
    }, this.itemEnd = function(url) {
      itemsLoaded++, scope.onProgress !== void 0 && scope.onProgress(url, itemsLoaded, itemsTotal), itemsLoaded === itemsTotal && (isLoading = !1, scope.onLoad !== void 0 && scope.onLoad());
    }, this.itemError = function(url) {
      scope.onError !== void 0 && scope.onError(url);
    }, this.resolveURL = function(url) {
      return url = url.normalize("NFC"), urlModifier ? urlModifier(url) : url;
    }, this.setURLModifier = function(transform) {
      return urlModifier = transform, this;
    }, this.addHandler = function(regex, loader) {
      return handlers.push(regex, loader), this;
    }, this.removeHandler = function(regex) {
      let index = handlers.indexOf(regex);
      return index !== -1 && handlers.splice(index, 2), this;
    }, this.getHandler = function(file) {
      for (let i = 0, l = handlers.length; i < l; i += 2) {
        let regex = handlers[i], loader = handlers[i + 1];
        if (regex.global && (regex.lastIndex = 0), regex.test(file))
          return loader;
      }
      return null;
    }, this.abort = function() {
      return this.abortController.abort(), this._abortController = null, this;
    };
  }
  // TODO: Revert this back to a single member variable once this issue has been fixed
  // https://github.com/cloudflare/workerd/issues/3657
  /**
   * Used for aborting ongoing requests in loaders using this manager.
   *
   * @type {AbortController}
   */
  get abortController() {
    return this._abortController || (this._abortController = new AbortController()), this._abortController;
  }
}, DefaultLoadingManager = /* @__PURE__ */ new LoadingManager(), Loader = class {
  /**
   * Constructs a new loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(manager) {
    this.manager = manager !== void 0 ? manager : DefaultLoadingManager, this.crossOrigin = "anonymous", this.withCredentials = !1, this.path = "", this.resourcePath = "", this.requestHeader = {}, this.priority = "auto", this.cache = "default", typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
  }
  /**
   * This method needs to be implemented by all concrete loaders. It holds the
   * logic for loading assets from the backend.
   *
   * @abstract
   * @param {string} url - The path/URL of the file to be loaded.
   * @param {Function} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} [onProgress] - Executed while the loading is in progress.
   * @param {onErrorCallback} [onError] - Executed when errors occur.
   */
  load() {
  }
  /**
   * A async version of {@link Loader#load}.
   *
   * @param {string} url - The path/URL of the file to be loaded.
   * @param {onProgressCallback} [onProgress] - Executed while the loading is in progress.
   * @return {Promise} A Promise that resolves when the asset has been loaded.
   */
  loadAsync(url, onProgress) {
    let scope = this;
    return new Promise(function(resolve, reject) {
      scope.load(url, resolve, onProgress, reject);
    });
  }
  /**
   * This method needs to be implemented by all concrete loaders. It holds the
   * logic for parsing the asset into three.js entities.
   *
   * @abstract
   * @param {any} data - The data to parse.
   */
  parse() {
  }
  /**
   * Sets the `crossOrigin` String to implement CORS for loading the URL
   * from a different domain that allows CORS.
   *
   * @param {string} crossOrigin - The `crossOrigin` value.
   * @return {Loader} A reference to this instance.
   */
  setCrossOrigin(crossOrigin) {
    return this.crossOrigin = crossOrigin, this;
  }
  /**
   * Whether the XMLHttpRequest uses credentials such as cookies, authorization
   * headers or TLS client certificates, see [XMLHttpRequest.withCredentials](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials).
   *
   * Note: This setting has no effect if you are loading files locally or from the same domain.
   *
   * @param {boolean} value - The `withCredentials` value.
   * @return {Loader} A reference to this instance.
   */
  setWithCredentials(value) {
    return this.withCredentials = value, this;
  }
  /**
   * Sets the base path for the asset.
   *
   * @param {string} path - The base path.
   * @return {Loader} A reference to this instance.
   */
  setPath(path) {
    return this.path = path, this;
  }
  /**
   * Sets the base path for dependent resources like textures.
   *
   * @param {string} resourcePath - The resource path.
   * @return {Loader} A reference to this instance.
   */
  setResourcePath(resourcePath) {
    return this.resourcePath = resourcePath, this;
  }
  /**
   * Sets the given request header.
   *
   * @param {Object} requestHeader - A [request header](https://developer.mozilla.org/en-US/docs/Glossary/Request_header)
   * for configuring the HTTP request.
   * @return {Loader} A reference to this instance.
   */
  setRequestHeader(requestHeader) {
    return this.requestHeader = requestHeader, this;
  }
  /**
   * Sets a browser scheduling hint. Browsers may ignore this hint.
   * Internally created loaders inherit it. Loaders supplied by the application
   * (for example decoder loaders or loading manager handlers) retain their own settings.
   *
   * @param {('high'|'low'|'auto')} value - The request priority hint.
   * @return {Loader} A reference to this instance.
   */
  setPriority(value) {
    return this.priority = value, this;
  }
  /**
   * Sets the HTTP cache mode for fetch requests. `no-cache` revalidates cached
   * responses; `no-store` bypasses the HTTP cache. This does not affect
   * {@link Cache} or image element requests.
   *
   * @param {('default'|'no-store'|'reload'|'no-cache'|'force-cache')} value - The HTTP cache mode.
   * @return {Loader} A reference to this instance.
   */
  setCache(value) {
    return this.cache = value, this;
  }
  /**
   * This method can be implemented in loaders for aborting ongoing requests.
   *
   * @abstract
   * @return {Loader} A reference to this instance.
   */
  abort() {
    return this;
  }
};
Loader.DEFAULT_MATERIAL_NAME = "__DEFAULT";
var _RESERVED_CHARS_RE = "\\[\\]\\.:\\/", _reservedRe = new RegExp("[" + _RESERVED_CHARS_RE + "]", "g"), _wordChar = "[^" + _RESERVED_CHARS_RE + "]", _wordCharOrDot = "[^" + _RESERVED_CHARS_RE.replace("\\.", "") + "]", _directoryRe = /* @__PURE__ */ /((?:WC+[\/:])*)/.source.replace("WC", _wordChar), _nodeRe = /* @__PURE__ */ /(WCOD+)?/.source.replace("WCOD", _wordCharOrDot), _objectRe = /* @__PURE__ */ /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC", _wordChar), _propertyRe = /* @__PURE__ */ /\.(WC+)(?:\[(.+)\])?/.source.replace("WC", _wordChar), _trackRe = new RegExp(
  "^" + _directoryRe + _nodeRe + _objectRe + _propertyRe + "$"
), _supportedObjectNames = ["material", "materials", "bones", "map"], Composite = class {
  constructor(targetGroup, path, optionalParsedPath) {
    let parsedPath = optionalParsedPath || PropertyBinding.parseTrackName(path);
    this._targetGroup = targetGroup, this._bindings = targetGroup.subscribe_(path, parsedPath);
  }
  getValue(array, offset) {
    this.bind();
    let firstValidIndex = this._targetGroup.nCachedObjects_, binding = this._bindings[firstValidIndex];
    binding !== void 0 && binding.getValue(array, offset);
  }
  setValue(array, offset) {
    let bindings = this._bindings;
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++i)
      bindings[i].setValue(array, offset);
  }
  bind() {
    let bindings = this._bindings;
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++i)
      bindings[i].bind();
  }
  unbind() {
    let bindings = this._bindings;
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++i)
      bindings[i].unbind();
  }
}, PropertyBinding = class {
  /**
   * Constructs a new property binding.
   *
   * @param {Object} rootNode - The root node.
   * @param {string} path - The path.
   * @param {?Object} [parsedPath] - The parsed path.
   */
  constructor(rootNode, path, parsedPath) {
    this.path = path, this.parsedPath = parsedPath || PropertyBinding.parseTrackName(path), this.node = PropertyBinding.findNode(rootNode, this.parsedPath.nodeName), this.rootNode = rootNode, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
  }
  /**
   * Factory method for creating a property binding from the given parameters.
   *
   * @static
   * @param {Object} root - The root node.
   * @param {string} path - The path.
   * @param {?Object} [parsedPath] - The parsed path.
   * @return {PropertyBinding|Composite} The created property binding or composite.
   */
  static create(root, path, parsedPath) {
    return root && root.isAnimationObjectGroup ? new PropertyBinding.Composite(root, path, parsedPath) : new PropertyBinding(root, path, parsedPath);
  }
  /**
   * Replaces spaces with underscores and removes unsupported characters from
   * node names, to ensure compatibility with parseTrackName().
   *
   * @param {string} name - Node name to be sanitized.
   * @return {string} The sanitized node name.
   */
  static sanitizeNodeName(name) {
    return name.replace(/\s/g, "_").replace(_reservedRe, "");
  }
  /**
   * Parses the given track name (an object path to an animated property) and
   * returns an object with information about the path. Matches strings in the following forms:
   *
   * - nodeName.property
   * - nodeName.property[accessor]
   * - nodeName.material.property[accessor]
   * - uuid.property[accessor]
   * - uuid.objectName[objectIndex].propertyName[propertyIndex]
   * - parentName/nodeName.property
   * - parentName/parentName/nodeName.property[index]
   * - .bone[Armature.DEF_cog].position
   * - scene:helium_balloon_model:helium_balloon_model.position
   *
   * @static
   * @param {string} trackName - The track name to parse.
   * @return {Object} The parsed track name as an object.
   */
  static parseTrackName(trackName) {
    let matches = _trackRe.exec(trackName);
    if (matches === null)
      throw new Error("THREE.PropertyBinding: Cannot parse trackName: " + trackName);
    let results = {
      // directoryName: matches[ 1 ], // (tschw) currently unused
      nodeName: matches[2],
      objectName: matches[3],
      objectIndex: matches[4],
      propertyName: matches[5],
      // required
      propertyIndex: matches[6]
    }, lastDot = results.nodeName && results.nodeName.lastIndexOf(".");
    if (lastDot !== void 0 && lastDot !== -1) {
      let objectName = results.nodeName.substring(lastDot + 1);
      _supportedObjectNames.indexOf(objectName) !== -1 && (results.nodeName = results.nodeName.substring(0, lastDot), results.objectName = objectName);
    }
    if (results.propertyName === null || results.propertyName.length === 0)
      throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: " + trackName);
    return results;
  }
  /**
   * Searches for a node in the hierarchy of the given root object by the given
   * node name.
   *
   * @static
   * @param {Object} root - The root object.
   * @param {string|number} nodeName - The name of the node.
   * @return {?Object} The found node. Returns `null` if no object was found.
   */
  static findNode(root, nodeName) {
    if (nodeName === void 0 || nodeName === "" || nodeName === "." || nodeName === -1 || nodeName === root.name || nodeName === root.uuid)
      return root;
    if (root.skeleton) {
      let bone = root.skeleton.getBoneByName(nodeName);
      if (bone !== void 0)
        return bone;
    }
    if (root.children) {
      let searchNodeSubtree = function(children) {
        for (let i = 0; i < children.length; i++) {
          let childNode = children[i];
          if (childNode.name === nodeName || childNode.uuid === nodeName)
            return childNode;
          let result = searchNodeSubtree(childNode.children);
          if (result)
            return result;
        }
        return null;
      }, subTreeNode = searchNodeSubtree(root.children);
      if (subTreeNode)
        return subTreeNode;
    }
    return null;
  }
  // these are used to "bind" a nonexistent property
  _getValue_unavailable() {
  }
  _setValue_unavailable() {
  }
  // Getters
  _getValue_direct(buffer, offset) {
    buffer[offset] = this.targetObject[this.propertyName];
  }
  _getValue_array(buffer, offset) {
    let source = this.resolvedProperty;
    for (let i = 0, n = source.length; i !== n; ++i)
      buffer[offset++] = source[i];
  }
  _getValue_arrayElement(buffer, offset) {
    buffer[offset] = this.resolvedProperty[this.propertyIndex];
  }
  _getValue_toArray(buffer, offset) {
    this.resolvedProperty.toArray(buffer, offset);
  }
  // Direct
  _setValue_direct(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
  }
  _setValue_direct_setNeedsUpdate(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset], this.targetObject.needsUpdate = !0;
  }
  _setValue_direct_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset], this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  // EntireArray
  _setValue_array(buffer, offset) {
    let dest = this.resolvedProperty;
    for (let i = 0, n = dest.length; i !== n; ++i)
      dest[i] = buffer[offset++];
  }
  _setValue_array_setNeedsUpdate(buffer, offset) {
    let dest = this.resolvedProperty;
    for (let i = 0, n = dest.length; i !== n; ++i)
      dest[i] = buffer[offset++];
    this.targetObject.needsUpdate = !0;
  }
  _setValue_array_setMatrixWorldNeedsUpdate(buffer, offset) {
    let dest = this.resolvedProperty;
    for (let i = 0, n = dest.length; i !== n; ++i)
      dest[i] = buffer[offset++];
    this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  // ArrayElement
  _setValue_arrayElement(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
  }
  _setValue_arrayElement_setNeedsUpdate(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset], this.targetObject.needsUpdate = !0;
  }
  _setValue_arrayElement_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset], this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  // HasToFromArray
  _setValue_fromArray(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
  }
  _setValue_fromArray_setNeedsUpdate(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset), this.targetObject.needsUpdate = !0;
  }
  _setValue_fromArray_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset), this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  _getValue_unbound(targetArray, offset) {
    this.bind(), this.getValue(targetArray, offset);
  }
  _setValue_unbound(sourceArray, offset) {
    this.bind(), this.setValue(sourceArray, offset);
  }
  /**
   * Creates a getter / setter pair for the property tracked by this binding.
   */
  bind() {
    let targetObject = this.node, parsedPath = this.parsedPath, objectName = parsedPath.objectName, propertyName = parsedPath.propertyName, propertyIndex = parsedPath.propertyIndex;
    if (targetObject || (targetObject = PropertyBinding.findNode(this.rootNode, parsedPath.nodeName), this.node = targetObject), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !targetObject) {
      warn("PropertyBinding: No target node found for track: " + this.path + ".");
      return;
    }
    if (objectName) {
      let objectIndex = parsedPath.objectIndex;
      switch (objectName) {
        case "materials":
          if (!targetObject.material) {
            error("PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }
          if (!targetObject.material.materials) {
            error("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
            return;
          }
          targetObject = targetObject.material.materials;
          break;
        case "bones":
          if (!targetObject.skeleton) {
            error("PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
            return;
          }
          targetObject = targetObject.skeleton.bones;
          for (let i = 0; i < targetObject.length; i++)
            if (targetObject[i].name === objectIndex) {
              objectIndex = i;
              break;
            }
          break;
        case "map":
          if ("map" in targetObject) {
            targetObject = targetObject.map;
            break;
          }
          if (!targetObject.material) {
            error("PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }
          if (!targetObject.material.map) {
            error("PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
            return;
          }
          targetObject = targetObject.material.map;
          break;
        default:
          if (targetObject[objectName] === void 0) {
            error("PropertyBinding: Can not bind to objectName of node undefined.", this);
            return;
          }
          targetObject = targetObject[objectName];
      }
      if (objectIndex !== void 0) {
        if (targetObject[objectIndex] === void 0) {
          error("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, targetObject);
          return;
        }
        targetObject = targetObject[objectIndex];
      }
    }
    let nodeProperty = targetObject[propertyName];
    if (nodeProperty === void 0) {
      let nodeName = parsedPath.nodeName;
      error("PropertyBinding: Trying to update property for track: " + nodeName + "." + propertyName + " but it wasn't found.", targetObject);
      return;
    }
    let versioning = this.Versioning.None;
    this.targetObject = targetObject, targetObject.isMaterial === !0 ? versioning = this.Versioning.NeedsUpdate : targetObject.isObject3D === !0 && (versioning = this.Versioning.MatrixWorldNeedsUpdate);
    let bindingType = this.BindingType.Direct;
    if (propertyIndex !== void 0) {
      if (propertyName === "morphTargetInfluences") {
        if (!targetObject.geometry) {
          error("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
          return;
        }
        if (!targetObject.geometry.morphAttributes) {
          error("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
          return;
        }
        targetObject.morphTargetDictionary[propertyIndex] !== void 0 && (propertyIndex = targetObject.morphTargetDictionary[propertyIndex]);
      }
      bindingType = this.BindingType.ArrayElement, this.resolvedProperty = nodeProperty, this.propertyIndex = propertyIndex;
    } else
      nodeProperty.fromArray !== void 0 && nodeProperty.toArray !== void 0 ? (bindingType = this.BindingType.HasFromToArray, this.resolvedProperty = nodeProperty) : Array.isArray(nodeProperty) ? (bindingType = this.BindingType.EntireArray, this.resolvedProperty = nodeProperty) : this.propertyName = propertyName;
    this.getValue = this.GetterByBindingType[bindingType], this.setValue = this.SetterByBindingTypeAndVersioning[bindingType][versioning];
  }
  /**
   * Unbinds the property.
   */
  unbind() {
    this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
  }
};
PropertyBinding.Composite = Composite;
PropertyBinding.prototype.BindingType = {
  Direct: 0,
  EntireArray: 1,
  ArrayElement: 2,
  HasFromToArray: 3
};
PropertyBinding.prototype.Versioning = {
  None: 0,
  NeedsUpdate: 1,
  MatrixWorldNeedsUpdate: 2
};
PropertyBinding.prototype.GetterByBindingType = [
  PropertyBinding.prototype._getValue_direct,
  PropertyBinding.prototype._getValue_array,
  PropertyBinding.prototype._getValue_arrayElement,
  PropertyBinding.prototype._getValue_toArray
];
PropertyBinding.prototype.SetterByBindingTypeAndVersioning = [
  [
    // Direct
    PropertyBinding.prototype._setValue_direct,
    PropertyBinding.prototype._setValue_direct_setNeedsUpdate,
    PropertyBinding.prototype._setValue_direct_setMatrixWorldNeedsUpdate
  ],
  [
    // EntireArray
    PropertyBinding.prototype._setValue_array,
    PropertyBinding.prototype._setValue_array_setNeedsUpdate,
    PropertyBinding.prototype._setValue_array_setMatrixWorldNeedsUpdate
  ],
  [
    // ArrayElement
    PropertyBinding.prototype._setValue_arrayElement,
    PropertyBinding.prototype._setValue_arrayElement_setNeedsUpdate,
    PropertyBinding.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
  ],
  [
    // HasToFromArray
    PropertyBinding.prototype._setValue_fromArray,
    PropertyBinding.prototype._setValue_fromArray_setNeedsUpdate,
    PropertyBinding.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
  ]
];
var _controlInterpolantsResultBuffer = new Float32Array(1);
var _Matrix2 = class {
  /**
   * Constructs a new 2x2 matrix. The arguments are supposed to be
   * in row-major order. If no arguments are provided, the constructor
   * initializes the matrix as an identity matrix.
   *
   * @param {number} [n11] - 1-1 matrix element.
   * @param {number} [n12] - 1-2 matrix element.
   * @param {number} [n21] - 2-1 matrix element.
   * @param {number} [n22] - 2-2 matrix element.
   */
  constructor(n11, n12, n21, n22) {
    this.elements = [
      1,
      0,
      0,
      1
    ], n11 !== void 0 && this.set(n11, n12, n21, n22);
  }
  /**
   * Sets this matrix to the 2x2 identity matrix.
   *
   * @return {Matrix2} A reference to this matrix.
   */
  identity() {
    return this.set(
      1,
      0,
      0,
      1
    ), this;
  }
  /**
   * Sets the elements of the matrix from the given array.
   *
   * @param {Array<number>} array - The matrix elements in column-major order.
   * @param {number} [offset=0] - Index of the first element in the array.
   * @return {Matrix2} A reference to this matrix.
   */
  fromArray(array, offset = 0) {
    for (let i = 0; i < 4; i++)
      this.elements[i] = array[i + offset];
    return this;
  }
  /**
   * Sets the elements of the matrix.The arguments are supposed to be
   * in row-major order.
   *
   * @param {number} n11 - 1-1 matrix element.
   * @param {number} n12 - 1-2 matrix element.
   * @param {number} n21 - 2-1 matrix element.
   * @param {number} n22 - 2-2 matrix element.
   * @return {Matrix2} A reference to this matrix.
   */
  set(n11, n12, n21, n22) {
    let te = this.elements;
    return te[0] = n11, te[2] = n12, te[1] = n21, te[3] = n22, this;
  }
}, Matrix2 = _Matrix2;
(() => {
  _Matrix2.prototype.isMatrix2 = !0;
})();
typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: {
  revision: REVISION
} }));
typeof window < "u" && (window.__THREE__ ? warn("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = REVISION);

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/three/build/three.module.js
var alphahash_fragment = `#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`, alphahash_pars_fragment = `#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`, alphamap_fragment = `#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`, alphamap_pars_fragment = `#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`, alphatest_fragment = `#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`, alphatest_pars_fragment = `#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`, aomap_fragment = `#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`, aomap_pars_fragment = `#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`, batching_pars_vertex = `#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`, batching_vertex = `#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`, begin_vertex = `vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`, beginnormal_vertex = `vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`, bsdfs = `float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`, iridescence_fragment = `#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`, bumpmap_pars_fragment = `#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`, clipping_planes_fragment = `#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`, clipping_planes_pars_fragment = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`, clipping_planes_pars_vertex = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`, clipping_planes_vertex = `#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`, color_fragment = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`, color_pars_fragment = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`, color_pars_vertex = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`, color_vertex = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`, common = `#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`, defaultnormal_vertex = `vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`, displacementmap_pars_vertex = `#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`, displacementmap_vertex = `#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`, emissivemap_fragment = `#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`, emissivemap_pars_fragment = `#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`, colorspace_fragment = "gl_FragColor = linearToOutputTexel( gl_FragColor );", colorspace_pars_fragment = `vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`, envmap_fragment = `#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`, envmap_common_pars_fragment = `#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`, envmap_pars_fragment = `#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`, envmap_pars_vertex = `#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`, envmap_vertex = `#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`, fog_vertex = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`, fog_pars_vertex = `#ifdef USE_FOG
	varying float vFogDepth;
#endif`, fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`, fog_pars_fragment = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`, gradientmap_pars_fragment = `#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`, lightmap_pars_fragment = `#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`, lights_lambert_fragment = `LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`, lights_lambert_pars_fragment = `varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`, lights_pars_begin = `uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`, envmap_physical_pars_fragment = `#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`, lights_toon_fragment = `ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`, lights_toon_pars_fragment = `varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`, lights_phong_fragment = `BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`, lights_phong_pars_fragment = `varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`, lights_physical_fragment = `PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`, lights_physical_pars_fragment = `uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`, lights_fragment_begin = `
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`, lights_fragment_maps = `#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`, lights_fragment_end = `#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`, lightprobes_pars_fragment = `#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`, logdepthbuf_fragment = `#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`, logdepthbuf_pars_fragment = `#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`, logdepthbuf_pars_vertex = `#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`, logdepthbuf_vertex = `#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`, map_fragment = `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`, map_pars_fragment = `#ifdef USE_MAP
	uniform sampler2D map;
#endif`, map_particle_fragment = `#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`, map_particle_pars_fragment = `#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`, metalnessmap_fragment = `float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`, metalnessmap_pars_fragment = `#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`, morphinstance_vertex = `#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`, morphcolor_vertex = `#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`, morphnormal_vertex = `#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`, morphtarget_pars_vertex = `#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`, morphtarget_vertex = `#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`, normal_fragment_begin = `float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`, normal_fragment_maps = `#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`, normal_pars_fragment = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`, normal_pars_vertex = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`, normal_vertex = `#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`, normalmap_pars_fragment = `#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`, clearcoat_normal_fragment_begin = `#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`, clearcoat_normal_fragment_maps = `#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`, clearcoat_pars_fragment = `#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`, iridescence_pars_fragment = `#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`, opaque_fragment = `#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`, packing = `vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`, premultiplied_alpha_fragment = `#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`, project_vertex = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`, dithering_fragment = `#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`, dithering_pars_fragment = `#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`, roughnessmap_fragment = `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`, roughnessmap_pars_fragment = `#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`, shadowmap_pars_fragment = `#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`, shadowmap_pars_vertex = `#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`, shadowmap_vertex = `#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`, shadowmask_pars_fragment = `float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`, skinbase_vertex = `#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`, skinning_pars_vertex = `#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`, skinning_vertex = `#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`, skinnormal_vertex = `#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`, specularmap_fragment = `float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`, specularmap_pars_fragment = `#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`, tonemapping_fragment = `#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`, tonemapping_pars_fragment = `#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`, transmission_fragment = `#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`, transmission_pars_fragment = `#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`, uv_pars_fragment = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`, uv_pars_vertex = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`, uv_vertex = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`, worldpos_vertex = `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`, vertex$h = `varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`, fragment$h = `uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, vertex$g = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`, fragment$g = `uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, vertex$f = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`, fragment$f = `uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, vertex$e = `#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`, fragment$e = `#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`, vertex$d = `#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`, fragment$d = `#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`, vertex$c = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`, fragment$c = `uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, vertex$b = `uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`, fragment$b = `uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`, vertex$a = `#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`, fragment$a = `uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, vertex$9 = `#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, fragment$9 = `#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, vertex$8 = `#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`, fragment$8 = `#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, vertex$7 = `#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`, fragment$7 = `#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`, vertex$6 = `#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, fragment$6 = `#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, vertex$5 = `#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`, fragment$5 = `#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, vertex$4 = `#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, fragment$4 = `#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, vertex$3 = `uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`, fragment$3 = `uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`, vertex$2 = `#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, fragment$2 = `uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`, vertex$1 = `uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`, fragment$1 = `uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`, ShaderChunk = {
  alphahash_fragment,
  alphahash_pars_fragment,
  alphamap_fragment,
  alphamap_pars_fragment,
  alphatest_fragment,
  alphatest_pars_fragment,
  aomap_fragment,
  aomap_pars_fragment,
  batching_pars_vertex,
  batching_vertex,
  begin_vertex,
  beginnormal_vertex,
  bsdfs,
  iridescence_fragment,
  bumpmap_pars_fragment,
  clipping_planes_fragment,
  clipping_planes_pars_fragment,
  clipping_planes_pars_vertex,
  clipping_planes_vertex,
  color_fragment,
  color_pars_fragment,
  color_pars_vertex,
  color_vertex,
  common,
  defaultnormal_vertex,
  displacementmap_pars_vertex,
  displacementmap_vertex,
  emissivemap_fragment,
  emissivemap_pars_fragment,
  colorspace_fragment,
  colorspace_pars_fragment,
  envmap_fragment,
  envmap_common_pars_fragment,
  envmap_pars_fragment,
  envmap_pars_vertex,
  envmap_physical_pars_fragment,
  envmap_vertex,
  fog_vertex,
  fog_pars_vertex,
  fog_fragment,
  fog_pars_fragment,
  gradientmap_pars_fragment,
  lightmap_pars_fragment,
  lights_lambert_fragment,
  lights_lambert_pars_fragment,
  lights_pars_begin,
  lights_toon_fragment,
  lights_toon_pars_fragment,
  lights_phong_fragment,
  lights_phong_pars_fragment,
  lights_physical_fragment,
  lights_physical_pars_fragment,
  lights_fragment_begin,
  lights_fragment_maps,
  lights_fragment_end,
  lightprobes_pars_fragment,
  logdepthbuf_fragment,
  logdepthbuf_pars_fragment,
  logdepthbuf_pars_vertex,
  logdepthbuf_vertex,
  map_fragment,
  map_pars_fragment,
  map_particle_fragment,
  map_particle_pars_fragment,
  metalnessmap_fragment,
  metalnessmap_pars_fragment,
  morphinstance_vertex,
  morphcolor_vertex,
  morphnormal_vertex,
  morphtarget_pars_vertex,
  morphtarget_vertex,
  normal_fragment_begin,
  normal_fragment_maps,
  normal_pars_fragment,
  normal_pars_vertex,
  normal_vertex,
  normalmap_pars_fragment,
  clearcoat_normal_fragment_begin,
  clearcoat_normal_fragment_maps,
  clearcoat_pars_fragment,
  iridescence_pars_fragment,
  opaque_fragment,
  packing,
  premultiplied_alpha_fragment,
  project_vertex,
  dithering_fragment,
  dithering_pars_fragment,
  roughnessmap_fragment,
  roughnessmap_pars_fragment,
  shadowmap_pars_fragment,
  shadowmap_pars_vertex,
  shadowmap_vertex,
  shadowmask_pars_fragment,
  skinbase_vertex,
  skinning_pars_vertex,
  skinning_vertex,
  skinnormal_vertex,
  specularmap_fragment,
  specularmap_pars_fragment,
  tonemapping_fragment,
  tonemapping_pars_fragment,
  transmission_fragment,
  transmission_pars_fragment,
  uv_pars_fragment,
  uv_pars_vertex,
  uv_vertex,
  worldpos_vertex,
  background_vert: vertex$h,
  background_frag: fragment$h,
  backgroundCube_vert: vertex$g,
  backgroundCube_frag: fragment$g,
  cube_vert: vertex$f,
  cube_frag: fragment$f,
  depth_vert: vertex$e,
  depth_frag: fragment$e,
  distance_vert: vertex$d,
  distance_frag: fragment$d,
  equirect_vert: vertex$c,
  equirect_frag: fragment$c,
  linedashed_vert: vertex$b,
  linedashed_frag: fragment$b,
  meshbasic_vert: vertex$a,
  meshbasic_frag: fragment$a,
  meshlambert_vert: vertex$9,
  meshlambert_frag: fragment$9,
  meshmatcap_vert: vertex$8,
  meshmatcap_frag: fragment$8,
  meshnormal_vert: vertex$7,
  meshnormal_frag: fragment$7,
  meshphong_vert: vertex$6,
  meshphong_frag: fragment$6,
  meshphysical_vert: vertex$5,
  meshphysical_frag: fragment$5,
  meshtoon_vert: vertex$4,
  meshtoon_frag: fragment$4,
  points_vert: vertex$3,
  points_frag: fragment$3,
  shadow_vert: vertex$2,
  shadow_frag: fragment$2,
  sprite_vert: vertex$1,
  sprite_frag: fragment$1
}, UniformsLib = {
  common: {
    diffuse: { value: /* @__PURE__ */ new Color(16777215) },
    opacity: { value: 1 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Matrix3() },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Matrix3() },
    alphaTest: { value: 0 }
  },
  specularmap: {
    specularMap: { value: null },
    specularMapTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  envmap: {
    envMap: { value: null },
    envMapRotation: { value: /* @__PURE__ */ new Matrix3() },
    reflectivity: { value: 1 },
    // basic, lambert, phong
    ior: { value: 1.5 },
    // physical
    refractionRatio: { value: 0.98 },
    // basic, lambert, phong
    dfgLUT: { value: null }
    // DFG LUT for physically-based rendering
  },
  aomap: {
    aoMap: { value: null },
    aoMapIntensity: { value: 1 },
    aoMapTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  lightmap: {
    lightMap: { value: null },
    lightMapIntensity: { value: 1 },
    lightMapTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  bumpmap: {
    bumpMap: { value: null },
    bumpMapTransform: { value: /* @__PURE__ */ new Matrix3() },
    bumpScale: { value: 1 }
  },
  normalmap: {
    normalMap: { value: null },
    normalMapTransform: { value: /* @__PURE__ */ new Matrix3() },
    normalScale: { value: /* @__PURE__ */ new Vector2(1, 1) }
  },
  displacementmap: {
    displacementMap: { value: null },
    displacementMapTransform: { value: /* @__PURE__ */ new Matrix3() },
    displacementScale: { value: 1 },
    displacementBias: { value: 0 }
  },
  emissivemap: {
    emissiveMap: { value: null },
    emissiveMapTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  metalnessmap: {
    metalnessMap: { value: null },
    metalnessMapTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  roughnessmap: {
    roughnessMap: { value: null },
    roughnessMapTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  gradientmap: {
    gradientMap: { value: null }
  },
  fog: {
    fogDensity: { value: 25e-5 },
    fogNear: { value: 1 },
    fogFar: { value: 2e3 },
    fogColor: { value: /* @__PURE__ */ new Color(16777215) }
  },
  lights: {
    ambientLightColor: { value: [] },
    lightProbe: { value: [] },
    sunLights: { value: [], properties: {
      direction: {},
      color: {}
    } },
    sunLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    sunShadowMatrix: { value: [] },
    sunShadowCascade: { value: [] },
    directionalLights: { value: [], properties: {
      direction: {},
      color: {}
    } },
    directionalLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    directionalShadowMatrix: { value: [] },
    spotLights: { value: [], properties: {
      color: {},
      position: {},
      direction: {},
      distance: {},
      coneCos: {},
      penumbraCos: {},
      decay: {}
    } },
    spotLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    spotLightMap: { value: [] },
    spotLightMatrix: { value: [] },
    pointLights: { value: [], properties: {
      color: {},
      position: {},
      decay: {},
      distance: {}
    } },
    pointLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {},
      shadowCameraNear: {},
      shadowCameraFar: {}
    } },
    pointShadowMatrix: { value: [] },
    hemisphereLights: { value: [], properties: {
      direction: {},
      skyColor: {},
      groundColor: {}
    } },
    // TODO (abelnation): RectAreaLight BRDF data needs to be moved from example to main src
    rectAreaLights: { value: [], properties: {
      color: {},
      position: {},
      width: {},
      height: {}
    } },
    ltc_1: { value: null },
    ltc_2: { value: null },
    probesSH: { value: [] },
    probesMin: { value: [] },
    probesMax: { value: [] },
    probesResolution: { value: [] }
  },
  points: {
    diffuse: { value: /* @__PURE__ */ new Color(16777215) },
    opacity: { value: 1 },
    size: { value: 1 },
    scale: { value: 1 },
    map: { value: null },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Matrix3() },
    alphaTest: { value: 0 },
    uvTransform: { value: /* @__PURE__ */ new Matrix3() }
  },
  sprite: {
    diffuse: { value: /* @__PURE__ */ new Color(16777215) },
    opacity: { value: 1 },
    center: { value: /* @__PURE__ */ new Vector2(0.5, 0.5) },
    rotation: { value: 0 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Matrix3() },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Matrix3() },
    alphaTest: { value: 0 }
  }
}, ShaderLib = {
  basic: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.specularmap,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.fog
    ]),
    vertexShader: ShaderChunk.meshbasic_vert,
    fragmentShader: ShaderChunk.meshbasic_frag
  },
  lambert: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.specularmap,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshlambert_vert,
    fragmentShader: ShaderChunk.meshlambert_frag
  },
  phong: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.specularmap,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) },
        specular: { value: /* @__PURE__ */ new Color(1118481) },
        shininess: { value: 30 },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshphong_vert,
    fragmentShader: ShaderChunk.meshphong_frag
  },
  standard: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.envmap,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.roughnessmap,
      UniformsLib.metalnessmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) },
        roughness: { value: 1 },
        metalness: { value: 0 },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshphysical_vert,
    fragmentShader: ShaderChunk.meshphysical_frag
  },
  toon: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.aomap,
      UniformsLib.lightmap,
      UniformsLib.emissivemap,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.gradientmap,
      UniformsLib.fog,
      UniformsLib.lights,
      {
        emissive: { value: /* @__PURE__ */ new Color(0) }
      }
    ]),
    vertexShader: ShaderChunk.meshtoon_vert,
    fragmentShader: ShaderChunk.meshtoon_frag
  },
  matcap: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      UniformsLib.fog,
      {
        matcap: { value: null }
      }
    ]),
    vertexShader: ShaderChunk.meshmatcap_vert,
    fragmentShader: ShaderChunk.meshmatcap_frag
  },
  points: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.points,
      UniformsLib.fog
    ]),
    vertexShader: ShaderChunk.points_vert,
    fragmentShader: ShaderChunk.points_frag
  },
  dashed: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.fog,
      {
        scale: { value: 1 },
        dashSize: { value: 1 },
        totalSize: { value: 2 }
      }
    ]),
    vertexShader: ShaderChunk.linedashed_vert,
    fragmentShader: ShaderChunk.linedashed_frag
  },
  depth: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.displacementmap
    ]),
    vertexShader: ShaderChunk.depth_vert,
    fragmentShader: ShaderChunk.depth_frag
  },
  normal: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.bumpmap,
      UniformsLib.normalmap,
      UniformsLib.displacementmap,
      {
        opacity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.meshnormal_vert,
    fragmentShader: ShaderChunk.meshnormal_frag
  },
  sprite: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.sprite,
      UniformsLib.fog
    ]),
    vertexShader: ShaderChunk.sprite_vert,
    fragmentShader: ShaderChunk.sprite_frag
  },
  background: {
    uniforms: {
      uvTransform: { value: /* @__PURE__ */ new Matrix3() },
      t2D: { value: null },
      backgroundIntensity: { value: 1 }
    },
    vertexShader: ShaderChunk.background_vert,
    fragmentShader: ShaderChunk.background_frag
  },
  backgroundCube: {
    uniforms: {
      envMap: { value: null },
      backgroundBlurriness: { value: 0 },
      backgroundIntensity: { value: 1 },
      backgroundRotation: { value: /* @__PURE__ */ new Matrix3() }
    },
    vertexShader: ShaderChunk.backgroundCube_vert,
    fragmentShader: ShaderChunk.backgroundCube_frag
  },
  cube: {
    uniforms: {
      tCube: { value: null },
      tFlip: { value: -1 },
      opacity: { value: 1 }
    },
    vertexShader: ShaderChunk.cube_vert,
    fragmentShader: ShaderChunk.cube_frag
  },
  equirect: {
    uniforms: {
      tEquirect: { value: null }
    },
    vertexShader: ShaderChunk.equirect_vert,
    fragmentShader: ShaderChunk.equirect_frag
  },
  distance: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.common,
      UniformsLib.displacementmap,
      {
        referencePosition: { value: /* @__PURE__ */ new Vector3() },
        nearDistance: { value: 1 },
        farDistance: { value: 1e3 }
      }
    ]),
    vertexShader: ShaderChunk.distance_vert,
    fragmentShader: ShaderChunk.distance_frag
  },
  shadow: {
    uniforms: /* @__PURE__ */ mergeUniforms([
      UniformsLib.lights,
      UniformsLib.fog,
      {
        color: { value: /* @__PURE__ */ new Color(0) },
        opacity: { value: 1 }
      }
    ]),
    vertexShader: ShaderChunk.shadow_vert,
    fragmentShader: ShaderChunk.shadow_frag
  }
};
ShaderLib.physical = {
  uniforms: /* @__PURE__ */ mergeUniforms([
    ShaderLib.standard.uniforms,
    {
      clearcoat: { value: 0 },
      clearcoatMap: { value: null },
      clearcoatMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      clearcoatNormalMap: { value: null },
      clearcoatNormalMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      clearcoatNormalScale: { value: /* @__PURE__ */ new Vector2(1, 1) },
      clearcoatRoughness: { value: 0 },
      clearcoatRoughnessMap: { value: null },
      clearcoatRoughnessMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      diffuseRoughness: { value: 0 },
      diffuseRoughnessMap: { value: null },
      diffuseRoughnessMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      dispersion: { value: 0 },
      retroreflectivity: { value: 0 },
      iridescence: { value: 0 },
      iridescenceMap: { value: null },
      iridescenceMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      iridescenceIOR: { value: 1.3 },
      iridescenceThicknessMinimum: { value: 100 },
      iridescenceThicknessMaximum: { value: 400 },
      iridescenceThicknessMap: { value: null },
      iridescenceThicknessMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      sheen: { value: 0 },
      sheenColor: { value: /* @__PURE__ */ new Color(0) },
      sheenColorMap: { value: null },
      sheenColorMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      sheenRoughness: { value: 1 },
      sheenRoughnessMap: { value: null },
      sheenRoughnessMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      transmission: { value: 0 },
      transmissionMap: { value: null },
      transmissionMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      transmissionSamplerSize: { value: /* @__PURE__ */ new Vector2() },
      transmissionSamplerMap: { value: null },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      thicknessMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      attenuationDistance: { value: 0 },
      attenuationColor: { value: /* @__PURE__ */ new Color(0) },
      specularColor: { value: /* @__PURE__ */ new Color(1, 1, 1) },
      specularColorMap: { value: null },
      specularColorMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      specularIntensity: { value: 1 },
      specularIntensityMap: { value: null },
      specularIntensityMapTransform: { value: /* @__PURE__ */ new Matrix3() },
      anisotropyVector: { value: /* @__PURE__ */ new Vector2() },
      anisotropyMap: { value: null },
      anisotropyMapTransform: { value: /* @__PURE__ */ new Matrix3() }
    }
  ]),
  vertexShader: ShaderChunk.meshphysical_vert,
  fragmentShader: ShaderChunk.meshphysical_frag
};
var _m$1 = /* @__PURE__ */ new Matrix3();
_m$1.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
var toneMappingMap = {
  [LinearToneMapping]: "LINEAR_TONE_MAPPING",
  [ReinhardToneMapping]: "REINHARD_TONE_MAPPING",
  [CineonToneMapping]: "CINEON_TONE_MAPPING",
  [ACESFilmicToneMapping]: "ACES_FILMIC_TONE_MAPPING",
  [AgXToneMapping]: "AGX_TONE_MAPPING",
  [NeutralToneMapping]: "NEUTRAL_TONE_MAPPING",
  [CustomToneMapping]: "CUSTOM_TONE_MAPPING"
};
var mat4array = new Float32Array(16), mat3array = new Float32Array(9), mat2array = new Float32Array(4);
var toneMappingFunctions = {
  [LinearToneMapping]: "Linear",
  [ReinhardToneMapping]: "Reinhard",
  [CineonToneMapping]: "Cineon",
  [ACESFilmicToneMapping]: "ACESFilmic",
  [AgXToneMapping]: "AgX",
  [NeutralToneMapping]: "Neutral",
  [CustomToneMapping]: "Custom"
};
var shadowMapTypeDefines = {
  [PCFShadowMap]: "SHADOWMAP_TYPE_PCF",
  [VSMShadowMap]: "SHADOWMAP_TYPE_VSM"
};
var envMapModeDefines = {
  [CubeRefractionMapping]: "ENVMAP_MODE_REFRACTION"
};
var envMapBlendingDefines = {
  [MultiplyOperation]: "ENVMAP_BLENDING_MULTIPLY",
  [MixOperation]: "ENVMAP_BLENDING_MIX",
  [AddOperation]: "ENVMAP_BLENDING_ADD"
};
var _m = /* @__PURE__ */ new Matrix3();
_m.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
var DATA = new Uint16Array([
  12469,
  15057,
  12620,
  14925,
  13266,
  14620,
  13807,
  14376,
  14323,
  13990,
  14545,
  13625,
  14713,
  13328,
  14840,
  12882,
  14931,
  12528,
  14996,
  12233,
  15039,
  11829,
  15066,
  11525,
  15080,
  11295,
  15085,
  10976,
  15082,
  10705,
  15073,
  10495,
  13880,
  14564,
  13898,
  14542,
  13977,
  14430,
  14158,
  14124,
  14393,
  13732,
  14556,
  13410,
  14702,
  12996,
  14814,
  12596,
  14891,
  12291,
  14937,
  11834,
  14957,
  11489,
  14958,
  11194,
  14943,
  10803,
  14921,
  10506,
  14893,
  10278,
  14858,
  9960,
  14484,
  14039,
  14487,
  14025,
  14499,
  13941,
  14524,
  13740,
  14574,
  13468,
  14654,
  13106,
  14743,
  12678,
  14818,
  12344,
  14867,
  11893,
  14889,
  11509,
  14893,
  11180,
  14881,
  10751,
  14852,
  10428,
  14812,
  10128,
  14765,
  9754,
  14712,
  9466,
  14764,
  13480,
  14764,
  13475,
  14766,
  13440,
  14766,
  13347,
  14769,
  13070,
  14786,
  12713,
  14816,
  12387,
  14844,
  11957,
  14860,
  11549,
  14868,
  11215,
  14855,
  10751,
  14825,
  10403,
  14782,
  10044,
  14729,
  9651,
  14666,
  9352,
  14599,
  9029,
  14967,
  12835,
  14966,
  12831,
  14963,
  12804,
  14954,
  12723,
  14936,
  12564,
  14917,
  12347,
  14900,
  11958,
  14886,
  11569,
  14878,
  11247,
  14859,
  10765,
  14828,
  10401,
  14784,
  10011,
  14727,
  9600,
  14660,
  9289,
  14586,
  8893,
  14508,
  8533,
  15111,
  12234,
  15110,
  12234,
  15104,
  12216,
  15092,
  12156,
  15067,
  12010,
  15028,
  11776,
  14981,
  11500,
  14942,
  11205,
  14902,
  10752,
  14861,
  10393,
  14812,
  9991,
  14752,
  9570,
  14682,
  9252,
  14603,
  8808,
  14519,
  8445,
  14431,
  8145,
  15209,
  11449,
  15208,
  11451,
  15202,
  11451,
  15190,
  11438,
  15163,
  11384,
  15117,
  11274,
  15055,
  10979,
  14994,
  10648,
  14932,
  10343,
  14871,
  9936,
  14803,
  9532,
  14729,
  9218,
  14645,
  8742,
  14556,
  8381,
  14461,
  8020,
  14365,
  7603,
  15273,
  10603,
  15272,
  10607,
  15267,
  10619,
  15256,
  10631,
  15231,
  10614,
  15182,
  10535,
  15118,
  10389,
  15042,
  10167,
  14963,
  9787,
  14883,
  9447,
  14800,
  9115,
  14710,
  8665,
  14615,
  8318,
  14514,
  7911,
  14411,
  7507,
  14279,
  7198,
  15314,
  9675,
  15313,
  9683,
  15309,
  9712,
  15298,
  9759,
  15277,
  9797,
  15229,
  9773,
  15166,
  9668,
  15084,
  9487,
  14995,
  9274,
  14898,
  8910,
  14800,
  8539,
  14697,
  8234,
  14590,
  7790,
  14479,
  7409,
  14367,
  7067,
  14178,
  6621,
  15337,
  8619,
  15337,
  8631,
  15333,
  8677,
  15325,
  8769,
  15305,
  8871,
  15264,
  8940,
  15202,
  8909,
  15119,
  8775,
  15022,
  8565,
  14916,
  8328,
  14804,
  8009,
  14688,
  7614,
  14569,
  7287,
  14448,
  6888,
  14321,
  6483,
  14088,
  6171,
  15350,
  7402,
  15350,
  7419,
  15347,
  7480,
  15340,
  7613,
  15322,
  7804,
  15287,
  7973,
  15229,
  8057,
  15148,
  8012,
  15046,
  7846,
  14933,
  7611,
  14810,
  7357,
  14682,
  7069,
  14552,
  6656,
  14421,
  6316,
  14251,
  5948,
  14007,
  5528,
  15356,
  5942,
  15356,
  5977,
  15353,
  6119,
  15348,
  6294,
  15332,
  6551,
  15302,
  6824,
  15249,
  7044,
  15171,
  7122,
  15070,
  7050,
  14949,
  6861,
  14818,
  6611,
  14679,
  6349,
  14538,
  6067,
  14398,
  5651,
  14189,
  5311,
  13935,
  4958,
  15359,
  4123,
  15359,
  4153,
  15356,
  4296,
  15353,
  4646,
  15338,
  5160,
  15311,
  5508,
  15263,
  5829,
  15188,
  6042,
  15088,
  6094,
  14966,
  6001,
  14826,
  5796,
  14678,
  5543,
  14527,
  5287,
  14377,
  4985,
  14133,
  4586,
  13869,
  4257,
  15360,
  1563,
  15360,
  1642,
  15358,
  2076,
  15354,
  2636,
  15341,
  3350,
  15317,
  4019,
  15273,
  4429,
  15203,
  4732,
  15105,
  4911,
  14981,
  4932,
  14836,
  4818,
  14679,
  4621,
  14517,
  4386,
  14359,
  4156,
  14083,
  3795,
  13808,
  3437,
  15360,
  122,
  15360,
  137,
  15358,
  285,
  15355,
  636,
  15344,
  1274,
  15322,
  2177,
  15281,
  2765,
  15215,
  3223,
  15120,
  3451,
  14995,
  3569,
  14846,
  3567,
  14681,
  3466,
  14511,
  3305,
  14344,
  3121,
  14037,
  2800,
  13753,
  2467,
  15360,
  0,
  15360,
  1,
  15359,
  21,
  15355,
  89,
  15346,
  253,
  15325,
  479,
  15287,
  796,
  15225,
  1148,
  15133,
  1492,
  15008,
  1749,
  14856,
  1882,
  14685,
  1886,
  14506,
  1783,
  14324,
  1608,
  13996,
  1398,
  13702,
  1183
]);

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/eventtype.ts
var EventType = /* @__PURE__ */ ((EventType2) => (EventType2.BEGIN = "BEGIN", EventType2.BREAK = "BREAK", EventType2.WATCHAIM = "WATCHAIM", EventType2.AIM = "AIM", EventType2.HIT = "HIT", EventType2.STATIONARY = "STATIONARY", EventType2.CHAT = "CHAT", EventType2.ABORT = "ABORT", EventType2.PLACEBALL = "PLACEBALL", EventType2.REJOIN = "REJOIN", EventType2.RERACK = "RERACK", EventType2.STARTAIM = "STARTAIM", EventType2.NOTIFICATION = "NOTIFICATION", EventType2.SCORE = "SCORE", EventType2.CONCEDE = "CONCEDE", EventType2))(EventType || {});

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/utils.ts
function isFirstShot(recorder) {
  return !recorder.entries.some((e2) => e2.event.type === "AIM" /* AIM */);
}
function round(num) {
  return Math.fround(num);
}
function atan2(y, x) {
  return Math.fround(Math.atan2(y, x));
}
function sin(theta) {
  return Math.fround(Math.sin(theta));
}
function cos(theta) {
  return Math.fround(Math.cos(theta));
}
function sqrt(theta) {
  return Math.fround(Math.sqrt(theta));
}
function exp(theta) {
  return Math.fround(Math.exp(theta));
}
function hypot(x, y) {
  return Math.fround(Math.hypot(x, y));
}

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/three-utils.ts
var zero = new Vector3(0, 0, 0), up = new Vector3(0, 0, 1);
function vec(v) {
  return new Vector3(v.x, v.y, v.z);
}
var upCrossVec = new Vector3();
function upCross(v) {
  return upCrossVec.copy(up).cross(v);
}
var normVec = new Vector3();
function norm(v) {
  return normVec.copy(v).normalize();
}
var vc = new Vector3();
function passesThroughZero(v, dv) {
  return vc.copy(v).add(dv).dot(v) <= 0;
}
function roundVec(v) {
  return v.x = round(v.x), v.y = round(v.y), v.z = round(v.z), v;
}

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/constants.ts
var mu = 55e-4, muS = 0.126, rho = 0.045, m = 0.23, R = 0.03275, g = 9.8, ee = 0.85, \u03BCs = 0.2, \u03BCw = 0.175;
var Mz, Mxy, I, e = 0.86;
var sin\u03B8 = 2 / 5, cos\u03B8 = Math.sqrt(21) / 5, offCenterLimit = 0.45, maxPower = 160 * R;
refresh();
function refresh() {
  Mz = mu * m * g * 2 / 3 * rho, Mxy = 7 / (5 * Math.sqrt(2)) * R * mu * m * g, I = 2 / 5 * m * R * R;
}
function setmu(val) {
  mu = val, refresh();
}

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/mathavan.ts
var Mathavan = class {
  constructor(M, R2, ee2, \u03BCs2, \u03BCw2) {
    // work done
    this.P = 0;
    this.WzI = 0;
    this.i = 0;
    this.N = 100;
    this.configure(M, R2, ee2, \u03BCs2, \u03BCw2);
  }
  /**
   * Take the physical constants for the next solve.
   *
   * The constants are module bindings (`constants.ts`) that the sliders, the
   * launch parameters and the worker's `configureSimulation` all mutate after
   * this module is loaded, so an instance that caches them has to be handed
   * them again before it solves -- see the hoisted instance in `physics.ts`.
   * The constructor goes through here too, which keeps the parameter list in
   * one place: a new constant is added here and nowhere else.
   */
  configure(M, R2, ee2, \u03BCs2, \u03BCw2) {
    this.M = M, this.R = R2, this.ee = ee2, this.\u03BCs = \u03BCs2, this.\u03BCw = \u03BCw2;
  }
  updateSlipSpeedsAndAngles() {
    let R2 = this.R, v_xI = this.vx + this.\u03C9y * R2 * sin\u03B8 - this.\u03C9z * R2 * cos\u03B8, v_yI = -this.vy * sin\u03B8 + this.\u03C9x * R2, v_xC = this.vx - this.\u03C9y * R2, v_yC = this.vy + this.\u03C9x * R2;
    this.s = sqrt(v_xI * v_xI + v_yI * v_yI), this.\u03C6 = atan2(v_yI, v_xI), this.\u03C6 < 0 && (this.\u03C6 += 2 * Math.PI), this["s\u02B9"] = sqrt(v_xC * v_xC + v_yC * v_yC), this["\u03C6\u02B9"] = atan2(v_yC, v_xC), this["\u03C6\u02B9"] < 0 && (this["\u03C6\u02B9"] += 2 * Math.PI), this.sin\u03C6 = sin(this.\u03C6), this.cos\u03C6 = cos(this.\u03C6), this["sin\u03C6\u02B9"] = sin(this["\u03C6\u02B9"]), this["cos\u03C6\u02B9"] = cos(this["\u03C6\u02B9"]);
  }
  compressionPhase() {
    let \u0394P = Math.max(this.M * this.vy / this.N, 1e-3);
    for (; this.vy > 0; )
      this.updateSingleStep(\u0394P);
  }
  restitutionPhase(targetWorkRebound) {
    let \u0394P = Math.max(targetWorkRebound / this.N, 1e-3);
    for (this.WzI = 0; this.WzI < targetWorkRebound; )
      this.updateSingleStep(\u0394P);
  }
  updateSingleStep(\u0394P) {
    this.updateSlipSpeedsAndAngles();
    let vyPrev = this.vy;
    if (this.updateVelocity(\u0394P), this.updateAngularVelocity(\u0394P), this.updateWorkDone(\u0394P, vyPrev), this.i++ > 10 * this.N)
      throw new Error("Solution not found");
  }
  updateVelocity(\u0394P) {
    let \u03BCs2 = this.\u03BCs, \u03BCw2 = this.\u03BCw, M = this.M;
    this.vx -= 1 / M * (\u03BCw2 * this.cos\u03C6 + \u03BCs2 * this["cos\u03C6\u02B9"] * (sin\u03B8 + \u03BCw2 * this.sin\u03C6 * cos\u03B8)) * \u0394P, this.vy -= 1 / M * (cos\u03B8 - \u03BCw2 * sin\u03B8 * this.sin\u03C6 + \u03BCs2 * this["sin\u03C6\u02B9"] * (sin\u03B8 + \u03BCw2 * this.sin\u03C6 * cos\u03B8)) * \u0394P;
  }
  updateAngularVelocity(\u0394P) {
    let \u03BCs2 = this.\u03BCs, \u03BCw2 = this.\u03BCw, M = this.M, R2 = this.R;
    this.\u03C9x += -(5 / (2 * M * R2)) * (\u03BCw2 * this.sin\u03C6 + \u03BCs2 * this["sin\u03C6\u02B9"] * (sin\u03B8 + \u03BCw2 * this.sin\u03C6 * cos\u03B8)) * \u0394P, this.\u03C9y += -(5 / (2 * M * R2)) * (\u03BCw2 * this.cos\u03C6 * sin\u03B8 - \u03BCs2 * this["cos\u03C6\u02B9"] * (sin\u03B8 + \u03BCw2 * this.sin\u03C6 * cos\u03B8)) * \u0394P, this.\u03C9z += 5 / (2 * M * R2) * (\u03BCw2 * this.cos\u03C6 * cos\u03B8) * \u0394P;
  }
  updateWorkDone(\u0394P, vyPrev) {
    let \u0394WzI = \u0394P / 2 * (Math.abs(vyPrev) + Math.abs(this.vy)) * cos\u03B8;
    this.WzI += \u0394WzI, this.P += \u0394P;
  }
  solvePaper(v0, \u03B1, \u03C90S, \u03C90T) {
    this.solve(v0 * cos(\u03B1), v0 * sin(\u03B1), -\u03C90T * sin(\u03B1), \u03C90T * cos(\u03B1), \u03C90S);
  }
  solve(vx, vy, \u03C9x, \u03C9y, \u03C9z) {
    this.vx = vx, this.vy = vy, this.\u03C9x = \u03C9x, this.\u03C9y = \u03C9y, this.\u03C9z = \u03C9z, this.WzI = 0, this.P = 0, this.i = 0, this.compressionPhase();
    let targetWorkRebound = this.ee * this.ee * this.WzI;
    this.restitutionPhase(targetWorkRebound);
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/physics.ts
function surfaceVelocity(v, w) {
  return surfaceVelocityFull(v, w).setZ(0);
}
var sv = new Vector3();
function surfaceVelocityFull(v, w) {
  return sv.copy(v).addScaledVector(upCross(w), R);
}
var delta = { v: new Vector3(), w: new Vector3() };
function sliding(v, w) {
  let va = surfaceVelocity(v, w);
  return delta.v.copy(norm(va).multiplyScalar(-muS * g)), delta.w.copy(norm(upCross(va)).multiplyScalar(5 / 2 * muS * g / R)), delta.w.setZ(-(5 / 2) * (Mz / (m * R * R)) * Math.sign(w.z)), delta;
}
function rollingFull(w, v, t) {
  let mag = hypot(w.x, w.y), zmag = Math.abs(w.z), zsign = Math.sign(w.z);
  if (mag < 0.1) {
    delta.v.set(-v.x / t, -v.y / t, 0);
    let spindownFactor = zmag > 24 ? 12 : 1;
    return delta.w.set(
      -w.x / t,
      -w.y / t,
      -(5 / 2) * (Mz / (m * R * R)) * spindownFactor * zsign
    ), delta;
  }
  let kw = 5 / 7 * Mxy / (m * R * R) / mag, dwx = -kw * w.x, dwy = -kw * w.y;
  return delta.w.set(dwx, dwy, -(5 / 2) * (Mz / (m * R * R)) * zsign), delta.v.set(R * (w.y + dwy) - v.x, -R * (w.x + dwx) - v.y, 0), delta;
}
function forceRoll(v, w) {
  let wz = w.z;
  w.copy(upCross(v).multiplyScalar(1 / R)), w.setZ(wz);
}
var vr_v = new Vector3(), wr_v = new Vector3();
function rotateApplyUnrotate(theta, v, w, model) {
  let vr = vr_v.copy(v).applyAxisAngle(up, theta), wr = wr_v.copy(w).applyAxisAngle(up, theta), delta2 = model(vr, wr);
  return delta2.v.applyAxisAngle(up, -theta), delta2.w.applyAxisAngle(up, -theta), delta2;
}
var epsilon = R * 0.1, theta_a = Math.asin(epsilon / R), sin_a = sin(theta_a), cos_a = cos(theta_a);
function s0(v, w) {
  return new Vector3(
    v.x * sin_a - v.z * cos_a + R * w.y,
    -v.y - R * w.z * cos_a + R * w.x * sin_a
  );
}
function c0(v) {
  return v.x * cos_a;
}
function basisHan(v, w) {
  return {
    c: c0(v),
    s: s0(v, w),
    A: 7 / 2 / m,
    B: 1 / m
  };
}
function gripHan(v, w) {
  let { c, s, A, B } = basisHan(v, w), ecB = (1 + e) * (c / B), PX = -s.x / A * sin_a - ecB * cos_a, PY = s.y / A, PZ = s.x / A * cos_a - ecB * sin_a;
  return impulseToDelta(PX, PY, PZ);
}
function slipHan(v, w) {
  let { c, B } = basisHan(v, w), ecB = (1 + e) * (c / B), mu2 = muCushion(v), phi = Math.atan2(v.y, v.x), cos_phi = Math.cos(phi), sin_phi = Math.sin(phi), PX = -mu2 * ecB * cos_phi * cos_a - ecB * cos_a, PY = mu2 * ecB * sin_phi, PZ = mu2 * ecB * cos_phi * cos_a - ecB * sin_a;
  return impulseToDelta(PX, PY, PZ);
}
function bounceHanBlend(v, w) {
  let deltaGrip = gripHan(v, w), deltaSlip = slipHan(v, w), factor = Math.sign(v.y) === Math.sign(w.z) ? Math.cos(Math.atan2(v.y, v.x)) : 1;
  return {
    v: deltaSlip.v.lerp(deltaGrip.v, factor),
    w: deltaSlip.w.lerp(deltaGrip.w, factor)
  };
}
function impulseToDelta(PX, PY, PZ) {
  return {
    v: new Vector3(PX / m, PY / m),
    w: new Vector3(
      -R / I * PY * sin_a,
      R / I * (PX * sin_a - PZ * cos_a),
      R / I * PY * cos_a
    )
  };
}
function muCushion(v) {
  return 0.471 - Math.atan2(Math.abs(v.y), v.x) * 0.241;
}
var c2bcMathavan = new Mathavan(m, R, ee, \u03BCs, \u03BCw), c2bcDelta = { v: new Vector3(), w: new Vector3() };
function cueStrike(angle, power, offset, elevation = 0) {
  let speed = power * (1 - 0.25 * offset.lengthSq()), vel = norm(new Vector3(cos(angle), sin(angle), 0)).multiplyScalar(speed);
  return {
    vel: vel.clone().multiplyScalar(cos(elevation)),
    rvel: cueToSpin(offset, vel, elevation)
  };
}
function cueToSpin(offset, v, elevation = 0) {
  let cosAlpha = Math.max(1e-3, Math.cos(elevation)), sinAlpha = Math.sin(elevation), projection = Math.max(0.5, cosAlpha), spinRate = 5 / 2 * v.length() * (offset.length() * R) / (R * R * projection), dir = v.clone().normalize(), q = dir.clone().multiplyScalar(cosAlpha).addScaledVector(up, -sinAlpha), spinAxis = Math.atan2(-offset.x, offset.y);
  return upCross(dir).applyAxisAngle(q, spinAxis).multiplyScalar(spinRate);
}

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/threecushionconfig.ts
var ThreeCushionConfig = { raceTo: 7 };

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/network/client/session.ts
var _Session = class {
  constructor(playername, clientId, tableId, spectator, botMode = !1, examMode = !1, practiceMode = !1, lod = 1, first = !1, speedrunMode = !1, tournamentId) {
    this.playername = playername;
    this.clientId = clientId;
    this.tableId = tableId;
    this.spectator = spectator;
    this.botMode = botMode;
    this.examMode = examMode;
    this.practiceMode = practiceMode;
    this.lod = lod;
    this.first = first;
    this.speedrunMode = speedrunMode;
    this.tournamentId = tournamentId;
    this.opponentParams = {};
    this.customParams = {};
    this.vsNotificationShown = !1;
    this.playerIndex = 0;
    this.scoreByClientId = {};
    this.currentBreak = 0;
    this.p1type = 0;
  }
  static getInstance() {
    return _Session.instance ??= new _Session("", "", "", !1, !1, !1, !1), _Session.instance;
  }
  static playerIndex() {
    return _Session.getInstance().playerIndex;
  }
  static isSpectator() {
    return _Session.getInstance().spectator;
  }
  static isBotMode() {
    return _Session.getInstance().botMode;
  }
  static getBotUserId() {
    return `bot-${((typeof globalThis.location < "u" ? new URLSearchParams(globalThis.location.search).get("bot") : void 0) ?? "ClawBreak").toLowerCase()}`;
  }
  static isExamMode() {
    return _Session.getInstance().examMode;
  }
  static isPracticeMode() {
    return _Session.instance?.practiceMode ?? !1;
  }
  static isSpeedrunMode() {
    return _Session.getInstance().speedrunMode;
  }
  static getLod() {
    return _Session.getInstance().lod;
  }
  static hasInitParam() {
    return typeof globalThis.location > "u" ? !1 : new URLSearchParams(globalThis.location?.search).has("init");
  }
  static reset() {
    _Session.instance = void 0;
  }
  static init(clientId, playername, tableId, spectator, botMode = !1, examMode = !1, practiceMode = !1, lod = 1, first = !1, speedrunMode = !1, tournamentId) {
    if (_Session.instance = new _Session(
      playername,
      clientId,
      tableId,
      spectator,
      botMode,
      examMode,
      practiceMode,
      lod,
      first,
      speedrunMode,
      tournamentId
    ), _Session.instance.initializeScores(), botMode && typeof globalThis.location < "u") {
      let bot = new URLSearchParams(globalThis.location.search).get("bot");
      _Session.instance.opponentName = bot ?? "ClawBreak", _Session.instance.setOpponentClientId(_Session.getBotUserId()), _Session.instance.opponentParams.emoji = "\u{1F916}";
    }
  }
  initializeScores() {
    this.scoreByClientId = {
      [this.clientId]: 0
    }, this.opponentClientId && (this.scoreByClientId[this.opponentClientId] = 0);
  }
  opponentKey() {
    return this.opponentClientId ?? _Session.fallbackOpponentClientId;
  }
  setOpponentClientId(clientId) {
    let previousOpponentKey = this.opponentKey(), previousScore = this.getScoreByClientId(previousOpponentKey);
    this.opponentClientId = clientId, clientId in this.scoreByClientId || (this.scoreByClientId[clientId] = previousScore), previousOpponentKey !== clientId && previousOpponentKey in this.scoreByClientId && delete this.scoreByClientId[previousOpponentKey];
  }
  /**
   * Populates opponent details and custom attributes from URL query
   * parameters (opponent.userId / opponent.userName / opponent.custom.* and
   * custom.*).
   */
  applyUrlParams(params) {
    let opponentId = params.get("opponent.userId");
    opponentId && opponentId !== this.clientId && this.setOpponentClientId(opponentId);
    let opponentName = params.get("opponent.userName");
    opponentName && (this.opponentName = opponentName);
    for (let [key, value] of params)
      key.startsWith("opponent.custom.") ? this.opponentParams[key.slice(16)] = value : key.startsWith("custom.") && (this.customParams[key.slice(7)] = value);
  }
  myScore() {
    return this.getScoreByClientId(this.clientId);
  }
  opponentScore() {
    return this.getScoreByClientId(this.opponentKey());
  }
  setMyScore(score) {
    this.setScoreByClientId(this.clientId, score);
  }
  setOpponentScore(score) {
    this.setScoreByClientId(this.opponentKey(), score);
  }
  addMyScore(delta2) {
    this.setMyScore(this.myScore() + delta2);
  }
  addOpponentScore(delta2) {
    this.setOpponentScore(this.opponentScore() + delta2);
  }
  getScoreByClientId(clientId) {
    return this.scoreByClientId[clientId] ?? 0;
  }
  setScoreByClientId(clientId, score) {
    this.scoreByClientId[clientId] = score;
  }
  orderedScoresForHud() {
    return this.playerIndex === 0 ? { p1: this.myScore(), p2: this.opponentScore() } : { p1: this.opponentScore(), p2: this.myScore() };
  }
  orderedNamesForHud() {
    if (this.spectator) {
      console.log(
        `[Session] orderedNamesForHud spectator mode: spectatedP1Name=${this.spectatedP1Name}, spectatedP2Name=${this.spectatedP2Name}`
      );
      let names2 = {};
      return this.spectatedP1Name && (names2.p1Name = this.spectatedP1Name), this.spectatedP2Name && (names2.p2Name = this.spectatedP2Name), names2;
    }
    let myName = this.playername || void 0, theirName = this.opponentName || void 0;
    if (this.playerIndex === 0) {
      let names2 = {};
      return myName && (names2.p1Name = myName), theirName && (names2.p2Name = theirName), names2;
    }
    let names = {};
    return theirName && (names.p1Name = theirName), myName && (names.p2Name = myName), names;
  }
  updateScoresFromNetwork(p1, p2, breakScore) {
    this.playerIndex === 1 ? (this.setMyScore(p2), this.setOpponentScore(p1)) : (this.setMyScore(p1), this.setOpponentScore(p2)), this.currentBreak = breakScore;
  }
  /**
   * Retrieves a map of user ID to handicap value from the URL query parameters.
   */
  getHandicaps() {
    if (typeof globalThis.location > "u" || !globalThis.location.search)
      return {};
    let params = new URLSearchParams(globalThis.location.search), handicaps = {};
    for (let [k, v] of params)
      if (k.startsWith("handicap_")) {
        let userId = k.replace("handicap_", "");
        handicaps[userId] = Number.parseInt(v) || 5;
      }
    return handicaps;
  }
  /**
   * Resolves the race target for a specific player by their client ID.
   * - If no player has a handicap specified, returns the default ThreeCushionConfig.raceTo (7).
   * - If at least one player has a handicap specified, any player (or bot) without an explicit handicap defaults to 5.
   */
  getRaceTargetForPlayer(clientId) {
    let handicaps = this.getHandicaps();
    return Object.keys(handicaps).length > 0 ? handicaps[clientId] ?? 5 : ThreeCushionConfig.raceTo;
  }
}, Session = _Session;
Session.fallbackOpponentClientId = "opponent";

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/ball.ts
var State = /* @__PURE__ */ ((State2) => (State2.Stationary = "Stationary", State2.Rolling = "Rolling", State2.Sliding = "Sliding", State2.Falling = "Falling", State2.InPocket = "InPocket", State2))(State || {}), _Ball = class {
  constructor(pos, color, label, appearance) {
    this.vel = zero.clone();
    this.rvel = zero.clone();
    this.futurePos = zero.clone();
    this.state = "Stationary" /* Stationary */;
    this.id = _Ball.id++;
    this.velBefore = new Vector3();
    this.pos = pos.clone(), this.label = label, this.appearance = appearance;
  }
  update(t) {
    this.state == "Falling" /* Falling */ ? (this.updatePosition(t), this.pocket?.updateFall(this, t)) : this.state == "Rolling" /* Rolling */ ? (this.velBefore.copy(this.vel), this.updateVelocity(t), this.pos.addScaledVector(this.velBefore, t / 2), this.pos.addScaledVector(this.vel, t / 2)) : (this.updatePosition(t), this.updateVelocity(t));
  }
  updateMesh(t) {
    this.ballmesh?.updateAll(this, t);
  }
  updatePosition(t) {
    this.pos.addScaledVector(this.vel, t);
  }
  updateVelocity(t) {
    this.inMotion() && (this.isRolling() ? (this.state = "Rolling" /* Rolling */, forceRoll(this.vel, this.rvel), this.addDelta(t, rollingFull(this.rvel, this.vel, t))) : (this.state = "Sliding" /* Sliding */, this.addDelta(t, sliding(this.vel, this.rvel))));
  }
  addDelta(t, delta2) {
    delta2.v.multiplyScalar(t), delta2.w.multiplyScalar(t), this.passesZero(delta2) ? this.setStationary() : (this.vel.add(delta2.v), this.rvel.add(delta2.w));
  }
  passesZero(delta2) {
    let vz = passesThroughZero(this.vel, delta2.v), wz = passesThroughZero(this.rvel, delta2.w);
    return (this.state === "Rolling" /* Rolling */ ? vz || wz : vz && wz) ? Math.abs(this.rvel.z) <= Math.abs(delta2.w.z) : !1;
  }
  setStationary() {
    this.vel.copy(zero), this.rvel.copy(zero), this.state = "Stationary" /* Stationary */;
  }
  isRolling() {
    return this.rvel.lengthSq() !== 0 && surfaceVelocityFull(this.vel, this.rvel).length() < _Ball.transition;
  }
  onTable() {
    return this.state !== "Falling" /* Falling */ && this.state !== "InPocket" /* InPocket */;
  }
  inMotion() {
    return this.state === "Rolling" /* Rolling */ || this.state === "Sliding" /* Sliding */ || this.isFalling();
  }
  isFalling() {
    return this.state === "Falling" /* Falling */;
  }
  futurePosition(t) {
    return this.futurePos.copy(this.pos).addScaledVector(this.vel, t), this.futurePos;
  }
  fround() {
    this.pos.x = Math.fround(this.pos.x), this.pos.y = Math.fround(this.pos.y), this.vel.x = Math.fround(this.vel.x), this.vel.y = Math.fround(this.vel.y), this.rvel.x = Math.fround(this.rvel.x), this.rvel.y = Math.fround(this.rvel.y), this.rvel.z = Math.fround(this.rvel.z);
  }
  serialise() {
    return {
      pos: this.pos.clone(),
      id: this.id
    };
  }
  static fromSerialised(data) {
    return _Ball.updateFromSerialised(new _Ball(vec(data.pos)), data);
  }
  static updateFromSerialised(b, data) {
    let z = data.pos.z ?? (b.onTable() ? 0 : b.pos.z);
    return b.pos.set(data.pos.x, data.pos.y, z), b.vel.copy(data?.vel ?? zero), b.rvel.copy(data?.rvel ?? zero), b;
  }
}, Ball = _Ball;
Ball.id = 0, Ball.transition = 0.05;

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/view/tablegeometry.ts
var _TableGeometry = class {
  static scaleToRadius(R2) {
    _TableGeometry.tableX = R2 * 43, _TableGeometry.tableY = R2 * 21, _TableGeometry.X = _TableGeometry.tableX + R2, _TableGeometry.Y = _TableGeometry.tableY + R2;
  }
  static configureForRule(ruleType, tableSize = 10) {
    let sizeScale = tableSize / 10;
    ruleType === "threecushion" || ruleType === "sagu" || ruleType === "libre" ? (_TableGeometry.tableX = R * (92.36 / 2 - 1) * sizeScale, _TableGeometry.tableY = R * (46.18 / 2 - 1) * sizeScale, _TableGeometry.hasPockets = !1) : (_TableGeometry.tableX = R * 43 * sizeScale, _TableGeometry.tableY = R * 21 * sizeScale, _TableGeometry.hasPockets = !0, setmu(7e-3)), _TableGeometry.X = _TableGeometry.tableX + R, _TableGeometry.Y = _TableGeometry.tableY + R;
  }
}, TableGeometry = _TableGeometry;
TableGeometry.hasPockets = !0, (() => {
  _TableGeometry.scaleToRadius(R);
})();

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/knuckle.ts
var Knuckle = class {
  constructor(pos, radius) {
    this.pos = pos, this.radius = radius;
  }
  static willBounce(knuckle, futurePosition) {
    return futurePosition.distanceTo(knuckle.pos) < R + knuckle.radius;
  }
  bounce(ball) {
    let kb = ball.pos.clone().sub(this.pos).normalize(), velDotCenters = kb.dot(ball.vel);
    return ball.vel.addScaledVector(kb, -2 * e * velDotCenters), ball.rvel.multiplyScalar(0.5), Math.abs(velDotCenters);
  }
  static findBouncing(ball, t) {
    let futurePosition = ball.futurePosition(t);
    return PocketGeometry.knuckles.find(
      (k) => Knuckle.willBounce(k, futurePosition)
    );
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/pocket.ts
var Pocket = class {
  constructor(pos, radius) {
    this.pos = pos, this.radius = radius;
  }
  static willFall(pocket, futurePosition) {
    return futurePosition.distanceTo(pocket.pos) < pocket.radius;
  }
  fall(ball, t) {
    return ball.vel.z = -g * t, ball.state = "Falling" /* Falling */, ball.pocket = this, ball.vel.length();
  }
  updateFall(ball, t) {
    ball.vel.addScaledVector(up, -R * 10 * t * g);
    let z = ball.pos.z;
    if (ball.pos.clone().setZ(0).distanceTo(this.pos) > this.radius - R) {
      let toCentre = this.pos.clone().sub(ball.pos).normalize().setZ(0);
      z > -R / 2 && (ball.vel.addScaledVector(toCentre, R * 7 * t * g), ball.rvel.addScaledVector(upCross(toCentre), 7 * t * g)), ball.vel.dot(toCentre) < 0 && (ball.ballmesh?.trace.forceTrace(ball.pos), ball.vel.x = toCentre.x * ball.vel.length() / 2, ball.vel.y = toCentre.y * ball.vel.length() / 2);
    }
    let restingDepth = this.restingDepth(ball);
    z < restingDepth && ball.rvel.length() !== 0 && (ball.pos.z = restingDepth, ball.vel.z = -R / 10, ball.rvel.copy(zero)), z < restingDepth - R && (ball.pos.z = restingDepth - R, ball.setStationary(), ball.state = "InPocket" /* InPocket */);
  }
  restingDepth(ball) {
    return -3 * R - R * ball.id / 4;
  }
  static findPocket(pocketCenters, ball, t) {
    let futurePosition = ball.futurePosition(t);
    return pocketCenters.find((p) => Pocket.willFall(p, futurePosition));
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/view/pocketgeometry.ts
var _PocketGeometry = class {
  static scaleToRadius(R2) {
    _PocketGeometry.PX = TableGeometry.tableX + R2 * (0.8 / 0.5), _PocketGeometry.PY = TableGeometry.tableY + R2 * (0.8 / 0.5), _PocketGeometry.knuckleInset = R2 * 1.6 / 0.5, _PocketGeometry.knuckleRadius = R2 * 0.31 / 0.5, _PocketGeometry.middleKnuckleInset = R2 * 1.385 / 0.5, _PocketGeometry.middleKnuckleRadius = R2 * 0.2 / 0.5, _PocketGeometry.cornerRadius = R2 * 1.1 / 0.5, _PocketGeometry.middleRadius = R2 * 0.9 / 0.5, _PocketGeometry.pocketLayout(R2), _PocketGeometry.enumerateCenters(), _PocketGeometry.enumerateKnuckles();
  }
  static enumerateKnuckles() {
    _PocketGeometry.knuckles = [
      _PocketGeometry.pockets.pocketNW.knuckleNE,
      _PocketGeometry.pockets.pocketNW.knuckleSW,
      _PocketGeometry.pockets.pocketN.knuckleNW,
      _PocketGeometry.pockets.pocketN.knuckleNE,
      _PocketGeometry.pockets.pocketS.knuckleSW,
      _PocketGeometry.pockets.pocketS.knuckleSE,
      _PocketGeometry.pockets.pocketNE.knuckleNW,
      _PocketGeometry.pockets.pocketNE.knuckleSE,
      _PocketGeometry.pockets.pocketSE.knuckleNE,
      _PocketGeometry.pockets.pocketSE.knuckleSW,
      _PocketGeometry.pockets.pocketSW.knuckleSE,
      _PocketGeometry.pockets.pocketSW.knuckleNW
    ];
  }
  static enumerateCenters() {
    _PocketGeometry.pocketCenters = [
      _PocketGeometry.pockets.pocketNW.pocket,
      _PocketGeometry.pockets.pocketSW.pocket,
      _PocketGeometry.pockets.pocketN.pocket,
      _PocketGeometry.pockets.pocketS.pocket,
      _PocketGeometry.pockets.pocketNE.pocket,
      _PocketGeometry.pockets.pocketSE.pocket
    ];
  }
  static pocketLayout(R2) {
    _PocketGeometry.pockets = {
      pocketNW: {
        pocket: new Pocket(
          new Vector3(-_PocketGeometry.PX, _PocketGeometry.PY, 0),
          _PocketGeometry.cornerRadius
        ),
        knuckleNE: new Knuckle(
          new Vector3(
            -TableGeometry.X + _PocketGeometry.knuckleInset,
            TableGeometry.Y + _PocketGeometry.knuckleRadius,
            0
          ),
          _PocketGeometry.knuckleRadius
        ),
        knuckleSW: new Knuckle(
          new Vector3(
            -TableGeometry.X - _PocketGeometry.knuckleRadius,
            TableGeometry.Y - _PocketGeometry.knuckleInset,
            0
          ),
          _PocketGeometry.knuckleRadius
        )
      },
      pocketN: {
        pocket: new Pocket(
          new Vector3(0, _PocketGeometry.PY + R2 * 0.7 / 0.5, 0),
          _PocketGeometry.middleRadius
        ),
        knuckleNE: new Knuckle(
          new Vector3(
            _PocketGeometry.middleKnuckleInset,
            TableGeometry.Y + _PocketGeometry.middleKnuckleRadius,
            0
          ),
          _PocketGeometry.middleKnuckleRadius
        ),
        knuckleNW: new Knuckle(
          new Vector3(
            -_PocketGeometry.middleKnuckleInset,
            TableGeometry.Y + _PocketGeometry.middleKnuckleRadius,
            0
          ),
          _PocketGeometry.middleKnuckleRadius
        )
      },
      pocketS: {
        pocket: new Pocket(
          new Vector3(0, -_PocketGeometry.PY - R2 * 0.7 / 0.5, 0),
          _PocketGeometry.middleRadius
        ),
        knuckleSE: new Knuckle(
          new Vector3(
            _PocketGeometry.middleKnuckleInset,
            -TableGeometry.Y - _PocketGeometry.middleKnuckleRadius,
            0
          ),
          _PocketGeometry.middleKnuckleRadius
        ),
        knuckleSW: new Knuckle(
          new Vector3(
            -_PocketGeometry.middleKnuckleInset,
            -TableGeometry.Y - _PocketGeometry.middleKnuckleRadius,
            0
          ),
          _PocketGeometry.middleKnuckleRadius
        )
      },
      pocketNE: {
        pocket: new Pocket(
          new Vector3(_PocketGeometry.PX, _PocketGeometry.PY, 0),
          _PocketGeometry.cornerRadius
        ),
        knuckleNW: new Knuckle(
          new Vector3(
            TableGeometry.X - _PocketGeometry.knuckleInset,
            TableGeometry.Y + _PocketGeometry.knuckleRadius,
            0
          ),
          _PocketGeometry.knuckleRadius
        ),
        knuckleSE: new Knuckle(
          new Vector3(
            TableGeometry.X + _PocketGeometry.knuckleRadius,
            TableGeometry.Y - _PocketGeometry.knuckleInset,
            0
          ),
          _PocketGeometry.knuckleRadius
        )
      },
      pocketSE: {
        pocket: new Pocket(
          new Vector3(_PocketGeometry.PX, -_PocketGeometry.PY, 0),
          _PocketGeometry.cornerRadius
        ),
        knuckleNE: new Knuckle(
          new Vector3(
            TableGeometry.X + _PocketGeometry.knuckleRadius,
            -TableGeometry.Y + _PocketGeometry.knuckleInset,
            0
          ),
          _PocketGeometry.knuckleRadius
        ),
        knuckleSW: new Knuckle(
          new Vector3(
            TableGeometry.X - _PocketGeometry.knuckleInset,
            -TableGeometry.Y - _PocketGeometry.knuckleRadius,
            0
          ),
          _PocketGeometry.knuckleRadius
        )
      },
      pocketSW: {
        pocket: new Pocket(
          new Vector3(-_PocketGeometry.PX, -_PocketGeometry.PY, 0),
          _PocketGeometry.cornerRadius
        ),
        knuckleSE: new Knuckle(
          new Vector3(
            -TableGeometry.X + _PocketGeometry.knuckleInset,
            -TableGeometry.Y - _PocketGeometry.knuckleRadius,
            0
          ),
          _PocketGeometry.knuckleRadius
        ),
        knuckleNW: new Knuckle(
          new Vector3(
            -TableGeometry.X - _PocketGeometry.knuckleRadius,
            -TableGeometry.Y + _PocketGeometry.knuckleInset,
            0
          ),
          _PocketGeometry.knuckleRadius
        )
      }
    };
  }
}, PocketGeometry = _PocketGeometry;
(() => {
  _PocketGeometry.scaleToRadius(R);
})();

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/cushion.ts
var Cushion = class {
  /**
   * Modify ball state reflecting in cushion if it impacts in time t.
   * Returns impact speed else undefined.
   *
   * Knuckle impacts are not part of this and handled elsewhere.
   */
  static bounceAny(ball, t, hasPockets = !0, cushionModel = bounceHanBlend) {
    let futurePosition = ball.futurePosition(t);
    if (!hasPockets) {
      let result = Cushion.bounceCornerNoPockets(ball, cushionModel);
      if (result !== void 0)
        return result;
    }
    if (Cushion.willBounceLong(futurePosition, hasPockets)) {
      let dir = futurePosition.y > TableGeometry.tableY ? -Math.PI / 2 : Math.PI / 2, cushion = futurePosition.y > TableGeometry.tableY ? "L" : "l";
      return {
        incidentSpeed: Cushion.bounceIn(dir, ball, cushionModel),
        cushion
      };
    }
    if (Cushion.willBounceShort(futurePosition, hasPockets)) {
      let dir = futurePosition.x > TableGeometry.tableX ? 0 : Math.PI, cushion = futurePosition.x > TableGeometry.tableX ? "S" : "s";
      return {
        incidentSpeed: Cushion.bounceIn(dir, ball, cushionModel),
        cushion
      };
    }
  }
  static bounceCornerNoPockets(ball, cushionModel) {
    let overX = Math.abs(ball.futurePos.x) - TableGeometry.tableX, overY = Math.abs(ball.futurePos.y) - TableGeometry.tableY;
    if (overX <= 0 || overY <= 0)
      return;
    let dir, cushion;
    return overX >= overY ? (dir = ball.futurePos.x > 0 ? 0 : Math.PI, cushion = ball.futurePos.x > 0 ? "S" : "s") : (dir = ball.futurePos.y > 0 ? -Math.PI / 2 : Math.PI / 2, cushion = ball.futurePos.y > 0 ? "L" : "l"), {
      incidentSpeed: Cushion.bounceIn(dir, ball, cushionModel),
      cushion
    };
  }
  static willBounceShort(futurePosition, hasPockets) {
    return hasPockets ? Cushion.willBounceShortSegment(
      PocketGeometry.pockets.pocketNW.knuckleSW.pos.y,
      PocketGeometry.pockets.pocketSW.knuckleNW.pos.y,
      futurePosition
    ) : Cushion.willBounceShortSegment(
      TableGeometry.Y,
      -TableGeometry.Y,
      futurePosition
    );
  }
  static willBounceLong(futurePosition, hasPockets) {
    return hasPockets ? Cushion.willBounceLongSegment(
      PocketGeometry.pockets.pocketNW.knuckleNE.pos.x,
      PocketGeometry.pockets.pocketN.knuckleNW.pos.x,
      futurePosition
    ) || Cushion.willBounceLongSegment(
      PocketGeometry.pockets.pocketN.knuckleNE.pos.x,
      PocketGeometry.pockets.pocketNE.knuckleNW.pos.x,
      futurePosition
    ) : Cushion.willBounceLongSegment(
      -TableGeometry.X,
      TableGeometry.X,
      futurePosition
    );
  }
  /**
   * Long Cushion refers to longest dimention of table (skipping middle pocket),
   * in this model that is oriented along the X axis.
   */
  static willBounceLongSegment(left, right, futurePosition) {
    return futurePosition.x > left && futurePosition.x < right && Math.abs(futurePosition.y) > TableGeometry.tableY;
  }
  static willBounceShortSegment(top, bottom, futurePosition) {
    return futurePosition.y > bottom && futurePosition.y < top && Math.abs(futurePosition.x) > TableGeometry.tableX;
  }
  static bounceIn(rotation, ball, cushionModel) {
    ball.ballmesh?.trace.forceTrace(ball.futurePos);
    let delta2 = rotateApplyUnrotate(
      rotation,
      ball.vel,
      ball.rvel,
      cushionModel
    );
    return ball.vel.add(delta2.v), ball.rvel.add(delta2.w), delta2.v.length();
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/collisionthrow.ts
var ab_v = new Vector3(), abTangent_v = new Vector3(), vPoint_v = new Vector3(), vRelTangentialVec_v = new Vector3(), impulseTangential_v = new Vector3(), impulseNormal_v = new Vector3(), angularImpulse_v = new Vector3(), temp_v = new Vector3(), CollisionThrow = class {
  dynamicFriction(vRel) {
    return 0.01 + 0.108 * exp(-1.088 * vRel);
  }
  updateVelocities(a, b) {
    let contact = Collision.positionsAtContact(a, b);
    a.ballmesh?.trace.forceTrace(contact.a), b.ballmesh?.trace.forceTrace(contact.b);
    let ab = ab_v.subVectors(contact.b, contact.a).normalize(), abTangent = abTangent_v.set(-ab.y, ab.x, 0), e2 = 0.925, vPoint = vPoint_v.copy(a.vel).sub(b.vel).add(temp_v.copy(ab).multiplyScalar(-R).cross(a.rvel)).sub(temp_v.copy(ab).multiplyScalar(R).cross(b.rvel)), vRelNormalMag = ab.dot(vPoint), vRelTangentialVec = vRelTangentialVec_v.copy(vPoint).addScaledVector(ab, -vRelNormalMag), vRelMag = vRelTangentialVec.length(), \u03BC = this.dynamicFriction(vRelMag);
    this.normalImpulse = -(1 + e2) * vRelNormalMag / (2 / m);
    let impulseTangential = impulseTangential_v.set(0, 0, 0);
    if (vRelMag > 1e-8) {
      let maxJt_friction = \u03BC * Math.abs(this.normalImpulse), maxJt_stick = m / 7 * vRelMag, jtMag = Math.min(maxJt_friction, maxJt_stick);
      impulseTangential.copy(vRelTangentialVec).multiplyScalar(-jtMag / vRelMag), this.tangentialImpulse = impulseTangential.dot(abTangent);
    } else
      this.tangentialImpulse = 0;
    let impulseNormal = impulseNormal_v.copy(ab).multiplyScalar(this.normalImpulse);
    a.vel.addScaledVector(impulseNormal, 1 / m).addScaledVector(impulseTangential, 1 / m), a.vel.z = 0, b.vel.addScaledVector(impulseNormal, -1 / m).addScaledVector(impulseTangential, -1 / m), b.vel.z = 0;
    let angularImpulse = angularImpulse_v.copy(ab).multiplyScalar(R).cross(impulseTangential);
    return a.rvel.addScaledVector(angularImpulse, 1 / I), b.rvel.addScaledVector(angularImpulse, 1 / I), vRelNormalMag;
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/physics/collision.ts
var _Collision = class {
  static willCollide(a, b, t) {
    return (a.inMotion() || b.inMotion()) && a.onTable() && b.onTable() && a.futurePosition(t).distanceToSquared(b.futurePosition(t)) < 4 * R * R;
  }
  static collide(a, b) {
    return _Collision.updateVelocities(a, b);
  }
  static positionsAtContact(a, b) {
    this.p.subVectors(a.pos, b.pos), this.v.subVectors(a.vel, b.vel);
    let rSum = 2 * R, aCoeff = this.v.lengthSq();
    if (aCoeff === 0)
      return {
        a: this.contactA.copy(a.pos),
        b: this.contactB.copy(b.pos)
      };
    let bCoeff = 2 * this.p.dot(this.v), cCoeff = this.p.lengthSq() - rSum * rSum, discriminant = bCoeff * bCoeff - 4 * aCoeff * cCoeff, t = discriminant < 0 ? 0 : (-bCoeff - Math.sqrt(discriminant)) / (2 * aCoeff);
    return {
      a: this.contactA.copy(a.pos).addScaledVector(a.vel, t),
      b: this.contactB.copy(b.pos).addScaledVector(b.vel, t)
    };
  }
  static updateVelocities(a, b) {
    let impactSpeed = _Collision.model.updateVelocities(a, b);
    return a.state = "Sliding" /* Sliding */, b.state = "Sliding" /* Sliding */, impactSpeed;
  }
}, Collision = _Collision;
Collision.p = new Vector3(), Collision.v = new Vector3(), Collision.contactA = new Vector3(), Collision.contactB = new Vector3(), Collision.model = new CollisionThrow();

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/gameevent.ts
var GameEvent = class {
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/aimevent.ts
function toVec2(value) {
  return Array.isArray(value) ? new Vector3(value[0] ?? 0, value[1] ?? 0, 0) : new Vector3(value?.x ?? 0, value?.y ?? 0, value?.z ?? 0);
}
var AimEvent = class extends GameEvent {
  constructor() {
    super();
    this.offset = new Vector3(0, 0, 0);
    this.angle = 0;
    this.power = 0;
    this.elevation = 0;
    this.pos = new Vector3(0, 0, 0);
    this.i = 0;
    this.type = "AIM" /* AIM */;
  }
  applyToController(controller) {
    return controller.handleAim(this);
  }
  toJSON() {
    let { pos, offset, elevation, i, ...rest } = this;
    return {
      ...rest,
      pos: [pos.x, pos.y],
      ...offset && (offset.x !== 0 || offset.y !== 0) ? { offset: [offset.x, offset.y] } : {},
      ...elevation === 0 ? {} : { elevation },
      ...i === 0 ? {} : { i }
    };
  }
  static fromJson(json) {
    let event = new AimEvent();
    return event.pos = toVec2(json.pos), event.angle = json.angle ?? 0, json.offset && (event.offset = toVec2(json.offset)), event.power = json.power ?? 0, event.elevation = json.elevation ?? 0, json.i && (event.i = json.i), event;
  }
  copy() {
    return AimEvent.fromJson(this);
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/outcome.ts
var OutcomeType = /* @__PURE__ */ ((OutcomeType2) => (OutcomeType2.Pot = "Pot", OutcomeType2.Cushion = "Cushion", OutcomeType2.Collision = "Collision", OutcomeType2.Hit = "Hit", OutcomeType2.Proximity = "Proximity", OutcomeType2))(OutcomeType || {}), Outcome = class {
  constructor(type, ballA, ballB, incidentSpeed, timestamp, cushion) {
    this.ballA = null;
    this.ballB = null;
    this.type = type, this.ballA = ballA, this.ballB = ballB, this.incidentSpeed = incidentSpeed, this.timestamp = timestamp, this.cushion = cushion;
  }
  static pot(ballA, incidentSpeed, timestamp) {
    return new Outcome("Pot" /* Pot */, ballA, ballA, incidentSpeed, timestamp);
  }
  static cushion(ballA, incidentSpeed, timestamp, cushion) {
    return new Outcome(
      "Cushion" /* Cushion */,
      ballA,
      ballA,
      incidentSpeed,
      timestamp,
      cushion
    );
  }
  static collision(ballA, ballB, incidentSpeed, timestamp) {
    return new Outcome(
      "Collision" /* Collision */,
      ballA,
      ballB,
      incidentSpeed,
      timestamp
    );
  }
  static hit(ballA, incidentSpeed, timestamp) {
    return new Outcome("Hit" /* Hit */, ballA, ballA, incidentSpeed, timestamp);
  }
  static proximity(ballA, ballB, distance = 0, timestamp) {
    return new Outcome("Proximity" /* Proximity */, ballA, ballB, distance, timestamp);
  }
  static isCueBallPotted(cueBall, outcomes) {
    return outcomes.some(
      (o) => o.type == "Pot" /* Pot */ && o.ballA === cueBall
    );
  }
  static isBallPottedNoFoul(cueBall, outcomes) {
    return outcomes.some((o) => o.type == "Pot" /* Pot */ && o.ballA !== null) && !Outcome.isCueBallPotted(cueBall, outcomes);
  }
  static pots(outcomes) {
    return outcomes.filter((o) => o.type == "Pot" /* Pot */).map((o) => o.ballA);
  }
  static potCount(outcomes) {
    return this.pots(outcomes).length;
  }
  static onlyRedsPotted(outcomes) {
    return this.pots(outcomes).every((b) => b.id > 6);
  }
  static firstCollision(outcome) {
    let collisions = outcome.filter((o) => o.type === "Collision" /* Collision */);
    return collisions.length > 0 ? collisions[0] : void 0;
  }
  static isClearTable(table) {
    let onTable = table.balls.filter((ball) => ball.onTable());
    return onTable.length === 1 && onTable[0] === table.cueball;
  }
  /** Carom point: the cue ball contacted both other balls in the same stroke,
   * with no cushion requirement — the free game (straight rail) score. Shares
   * the contact normalisation with isThreeCushionPoint but not its cushion or
   * proximity conditions. */
  static isCaromPoint(cueBall, outcomes) {
    let hits = /* @__PURE__ */ new Set();
    for (let outcome of Outcome.cueBallFirst(cueBall, outcomes))
      outcome.type === "Collision" /* Collision */ && outcome.ballA === cueBall && outcome.ballB !== null && hits.add(outcome.ballB);
    return hits.size >= 2;
  }
  static isThreeCushionPoint(cueBall, outcomes) {
    outcomes = Outcome.cueBallFirst(cueBall, outcomes).filter(
      (outcome) => outcome.ballA === cueBall
    );
    let cannons = /* @__PURE__ */ new Set(), cushions = 0;
    for (let outcome of outcomes)
      if (outcome.type === "Cushion" /* Cushion */ && cushions++, outcome.type === "Collision" /* Collision */ && (cannons.add(outcome.ballB), cannons.size === 2))
        return cushions >= 3;
    return !!(outcomes.find(
      (o) => o.type === "Proximity" /* Proximity */ && o.ballA === cueBall
    ) && new Set(
      outcomes.filter(
        (o) => o.type === "Collision" /* Collision */ && o.ballA === cueBall
      ).map((o) => o.ballB)
    ).size === 1 && cushions >= 3);
  }
  static getProximityScore(cueBall, outcomes) {
    let proximityOutcomes = outcomes.filter(
      (o) => o.type === "Proximity" /* Proximity */ && o.ballA === cueBall
    );
    if (proximityOutcomes.length === 0)
      return 0;
    let minDistance = Math.min(
      ...proximityOutcomes.map((o) => o.incidentSpeed)
    );
    return minDistance <= 2 * R ? 3 : minDistance <= 3 * R ? 2 : minDistance <= 4 * R ? 1 : 0;
  }
  static cueBallFirst(cueBall, outcomes) {
    return outcomes.forEach((o) => {
      o.type === "Collision" /* Collision */ && o.ballB === cueBall && (o.ballB = o.ballA, o.ballA = cueBall);
    }), outcomes;
  }
  serialise() {
    let s = {
      type: this.type,
      timestamp: this.timestamp,
      incidentSpeed: this.incidentSpeed,
      ballA: this.ballA ? { id: this.ballA.id } : null,
      ballB: this.ballB ? { id: this.ballB.id } : null
    };
    return this.cushion && (s.cushion = this.cushion), s;
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/proximity.ts
function updateCushionCount(outcome, cueball, indicator) {
  let cushionCount = outcome.filter(
    (o) => o.type === "Cushion" /* Cushion */ && o.ballA === cueball
  ).length;
  cushionCount !== indicator.cushionCount && (indicator.cushionCount = cushionCount, indicator.setCushionCount(cushionCount)), cushionCount >= 3 && (indicator.threeCushionsMet = !0);
}
function updateProximityOutcome(outcome, cueball, indicator, time) {
  if (indicator.hitTarget)
    return;
  let lastOutcome = outcome[outcome.length - 1];
  if (((o) => o?.type === "Collision" /* Collision */ && (o.ballA === cueball && o.ballB === indicator.target || o.ballB === cueball && o.ballA === indicator.target))(lastOutcome)) {
    indicator.hitTarget = !0;
    let distance2 = 1.99 * R;
    outcome.push(
      Outcome.proximity(
        cueball,
        indicator.target,
        distance2,
        lastOutcome.timestamp + 1
      )
    ), indicator.setProximity(distance2);
    return;
  }
  let distance = cueball.pos.distanceTo(indicator.target.pos);
  distance >= 4 * R || (lastOutcome?.type !== "Proximity" /* Proximity */ ? (outcome.push(Outcome.proximity(cueball, indicator.target, distance, time)), indicator.setProximity(distance)) : distance < lastOutcome.incidentSpeed && (refineProximity(
    outcome,
    cueball,
    indicator.target,
    distance,
    lastOutcome,
    time
  ), indicator.setProximity(distance)));
}
function refineProximity(outcome, cueball, target, distance, lastOutcome, time) {
  lastOutcome.incidentSpeed > 3 * R && distance <= 3 * R ? outcome.push(Outcome.proximity(cueball, target, distance, time)) : outcome[outcome.length - 1] = Outcome.proximity(
    cueball,
    target,
    distance,
    lastOutcome.timestamp
  );
}
function trackActiveIndicator(outcome, cueball, indicator, time) {
  if (indicator.target.inMotion() && indicator.showAt(indicator.target.pos), !indicator.hitTarget && outcome.some(
    (o) => o.type === "Collision" /* Collision */ && (o.ballA === cueball && o.ballB === indicator.target || o.ballB === cueball && o.ballA === indicator.target)
  ) && (indicator.hitTarget = !0, indicator.threeCushionsMet)) {
    let distance = 1.99 * R;
    outcome.push(
      Outcome.proximity(cueball, indicator.target, distance, time)
    ), indicator.setProximity(distance);
  }
  indicator.threeCushionsMet || updateCushionCount(outcome, cueball, indicator), indicator.threeCushionsMet && !indicator.hitTarget && updateProximityOutcome(outcome, cueball, indicator, time);
}
function checkProximity(outcome, cueball, balls, indicator, time) {
  if (indicator.group.visible && indicator.target) {
    trackActiveIndicator(outcome, cueball, indicator, time);
    return;
  }
  let moving = balls.filter((b) => b.inMotion());
  if (moving.length !== 2 || !moving.includes(cueball))
    return;
  let target = balls.find((b) => !b.inMotion() && b !== cueball);
  target && (indicator.target = target, indicator.showAt(target.pos));
}

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/shotstart.ts
var ShotStartUtils = class {
  /**
   * Capture the current table state + cue aim as the shot's initial conditions.
   * `Table.hit()` calls this with no `meta` (reads `cue.aim`); a headless caller
   * supplies `meta` when it has no `Cue`. Aim fields fall back to `cue.aim` when
   * not supplied in `meta`.
   */
  static capture(table, meta) {
    let aim = table.cue?.aim;
    return {
      balls: table.shortSerialise(),
      cueBallId: meta?.cueBallId ?? table.balls.indexOf(table.cueball),
      angle: meta?.angle ?? aim?.angle ?? 0,
      power: meta?.power ?? aim?.power ?? 0,
      offsetX: meta?.offsetX ?? aim?.offset.x ?? 0,
      offsetY: meta?.offsetY ?? aim?.offset.y ?? 0,
      elevation: meta?.elevation ?? aim?.elevation ?? 0,
      rulename: meta?.rulename,
      cushionModelName: meta?.cushionModelName,
      tableSize: meta?.tableSize,
      dt: meta?.dt,
      baseUrl: meta?.baseUrl
    };
  }
  /**
   * Build an `index.html` URL that re-opens this shot from its captured initial
   * conditions. Returns `""` when `conditions` is undefined (no snapshot).
   * Rulename/cushionModel/tableSize fall back to the current page URL when not
   * stored on the snapshot (so the browser needs no extra wiring). A headless
   * caller's `baseUrl` is preferred over `globalThis.location` (which, in a
   * worker, points at `worker.js`).
   */
  static buildRecreateUrl(conditions) {
    if (!conditions)
      return "";
    let c = conditions, pageBase = (globalThis.location?.href ?? "index.html").split("?")[0], base = c.baseUrl ?? pageBase ?? "index.html", pageParams = new URLSearchParams(globalThis.location?.search ?? ""), rulename = c.rulename ?? pageParams.get("ruletype") ?? "nineball", cushionModelName = c.cushionModelName ?? pageParams.get("cushionModel") ?? "mathavan", tableSize = c.tableSize ?? Number(pageParams.get("tableSize") ?? 10), params = new URLSearchParams();
    return params.set("ruletype", rulename), params.set("practice", ""), params.set("init", JSON.stringify(c.balls)), params.set(
      "initShot",
      JSON.stringify({
        cueBallId: c.cueBallId,
        angle: c.angle,
        power: c.power,
        offset: { x: c.offsetX, y: c.offsetY },
        elevation: c.elevation
      })
    ), params.set("cushionModel", cushionModelName), tableSize !== 10 && params.set("tableSize", String(tableSize)), `${base}?${params.toString()}`;
  }
  /**
   * Print the shot's initial conditions, a recreation link, and the table's
   * current (post-failure) state to the console so a developer can cut-and-paste
   * the link to reproduce the exact shot that overflowed the collision resolver.
   */
  static reportDepthExceeded(table, conditions) {
    let url = ShotStartUtils.buildRecreateUrl(conditions);
    console.error(
      `Depth exceeded resolving collisions.
Initial conditions at shot start (JSON):
` + JSON.stringify(conditions ?? null, null, 2) + (url ? `
Recreation link (paste in a browser to reproduce):
` + url : `
(No shot-start snapshot \u2014 call ShotStartUtils.capture() before the shot.)`) + `
Current state (shortSerialise): ` + JSON.stringify(table.shortSerialise())
    );
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/model/table.ts
var Table = class {
  constructor(balls) {
    this.proximityEnabled = !1;
    this.outcome = [];
    this.time = 0;
    this.cushionModel = bounceHanBlend;
    this.cueball = balls[0], this.initialiseBalls(balls);
  }
  initialiseBalls(balls) {
    this.balls = balls, this.pairs = [];
    for (let a = 0; a < balls.length; a++)
      for (let b = 0; b < balls.length; b++)
        a < b && this.pairs.push({ a: balls[a], b: balls[b] });
  }
  updateBallMesh(t) {
    this.balls.forEach((a) => {
      a.updateMesh(t);
    });
  }
  advance(t) {
    this.time += t * 1e3;
    let depth = 0;
    for (; !this.prepareAdvanceAll(t); )
      if (depth++ > 100)
        throw ShotStartUtils.reportDepthExceeded(this, this.shotStartConditions), new Error("Depth exceeded resolving collisions");
    this.balls.forEach((a) => {
      a.update(t), a.fround();
    }), this.proximityEnabled && this.proximityIndicator && checkProximity(
      this.outcome,
      this.cueball,
      this.balls,
      this.proximityIndicator,
      this.time
    );
  }
  /**
   * Returns true if all balls can advance by t without collision
   *
   */
  prepareAdvanceAll(t) {
    return this.pairs.every((pair) => this.prepareAdvancePair(pair.a, pair.b, t)) && this.balls.every((ball) => this.prepareAdvanceToCushions(ball, t));
  }
  /**
   * Returns true if a pair of balls can advance by t without any collision.
   * If there is a collision, adjust velocity appropriately.
   *
   */
  prepareAdvancePair(a, b, t) {
    if (Collision.willCollide(a, b, t)) {
      let incidentSpeed = Collision.collide(a, b);
      return this.outcome.push(Outcome.collision(a, b, incidentSpeed, this.time)), !1;
    }
    return !0;
  }
  /**
   * Returns true if ball can advance by t without hitting cushion, knuckle or pocket.
   * If there is a collision, adjust velocity appropriately.
   *
   */
  prepareAdvanceToCushions(a, t) {
    if (!a.onTable())
      return !0;
    let futurePosition = a.futurePosition(t);
    if (Math.abs(futurePosition.y) < TableGeometry.tableY && Math.abs(futurePosition.x) < TableGeometry.tableX)
      return !0;
    let result = Cushion.bounceAny(
      a,
      t,
      TableGeometry.hasPockets,
      this.cushionModel
    );
    if (result && result.incidentSpeed)
      return this.outcome.push(
        Outcome.cushion(a, result.incidentSpeed, this.time, result.cushion)
      ), !1;
    if (TableGeometry.hasPockets) {
      let k = Knuckle.findBouncing(a, t);
      if (k) {
        let knuckleIncidentSpeed = k.bounce(a);
        return this.outcome.push(Outcome.cushion(a, knuckleIncidentSpeed, this.time)), !1;
      }
      let p = Pocket.findPocket(PocketGeometry.pocketCenters, a, t);
      if (p) {
        let pocketIncidentSpeed = p.fall(a, t);
        return this.outcome.push(Outcome.pot(a, pocketIncidentSpeed, this.time)), !1;
      }
    }
    return !0;
  }
  allStationary() {
    return this.balls.every((b) => !b.inMotion());
  }
  inPockets() {
    return this.balls.reduce((acc, b) => b.onTable() ? acc : acc + 1, 0);
  }
  hit() {
    this.shotStartConditions = ShotStartUtils.capture(this), this.time = 0, this.cue?.hit(this.cueball), this.balls.forEach((b) => {
      b.ballmesh?.trace.reset();
    });
  }
  serialise() {
    return {
      balls: this.balls.map((b) => b.serialise()),
      aim: this.cue?.aim.copy()
    };
  }
  serialiseHit() {
    let aim = this.cue.aim.copy();
    return aim.pos.copy(this.cueball.pos), {
      balls: [this.cueball.serialise()],
      aim
    };
  }
  static fromSerialised(data) {
    let table = new Table(data.balls.map((b) => Ball.fromSerialised(b)));
    return table.updateFromSerialised(data), table;
  }
  updateFromSerialised(data) {
    data.balls && data.balls.forEach((b) => Ball.updateFromSerialised(this.balls[b.id], b)), data.aim && this.cue && (this.cue.aim = AimEvent.fromJson(data.aim));
  }
  shortSerialise() {
    return this.balls.map((b) => [b.pos.x, b.pos.y]).reduce((acc, val) => acc.concat(val), []);
  }
  updateFromShortSerialised(data) {
    this.balls.forEach((b, i) => {
      b.pos.x = data[i * 2], b.pos.y = data[i * 2 + 1], b.pos.z = 0, b.vel.copy(zero), b.rvel.copy(zero), b.state = "Stationary" /* Stationary */;
    });
  }
  addToScene(scene) {
    this.balls.forEach((b) => {
      b.ballmesh?.addToScene(scene);
    }), this.cue && scene.add(this.cue.root), this.proximityIndicator && scene.add(this.proximityIndicator.group);
  }
  showTraces(bool) {
    this.balls.forEach((b) => {
      b.ballmesh && (b.ballmesh.trace.line.visible = bool, b.ballmesh.trace.reset());
    });
  }
  freezeTraces(scene) {
    this.balls.forEach((b) => b.ballmesh?.freezeTrace(scene));
  }
  showSpin(bool) {
    this.balls.forEach((b) => {
      b.ballmesh && (b.ballmesh.spinAxisArrow.visible = bool);
    });
  }
  halt() {
    this.balls.forEach((b) => {
      b.vel.copy(zero), b.rvel.copy(zero), b.state = "Stationary" /* Stationary */;
    });
  }
  overlapsAny(pos, excluding = this.cueball) {
    return this.balls.filter((b) => b !== excluding).some((b) => b.pos.distanceTo(pos) < 2 * R);
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/view/tableconfig.ts
var TableConfig = class {
  /**
   * Apply table geometry for a rule and the given tableSize, then re-derive
   * pocket geometry from the updated table dimensions.
   */
  static apply(ruleType, tableSize = 10) {
    TableGeometry.configureForRule(ruleType, tableSize), PocketGeometry.scaleToRadius(R);
  }
  /**
   * Read the `tableSize` URL query parameter, defaulting to 10.
   */
  static tableSizeFromUrl() {
    let urlParams = new URLSearchParams(globalThis.location?.search ?? "");
    return parseFloat(urlParams.get("tableSize") || "10");
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/snookerconfig.ts
var SnookerConfig = { reds: 15 };

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/rack.ts
var _Rack = class {
  static get spot() {
    return new Vector3(-TableGeometry.X / 2, 0, 0);
  }
  static jitter(pos) {
    return roundVec(
      pos.clone().add(
        new Vector3(
          _Rack.noise * (Math.random() - 0.5),
          _Rack.noise * (Math.random() - 0.5),
          0
        )
      )
    );
  }
  static unlabeledAppearance() {
    return Session.getLod() > 1 ? "texturedDots" : void 0;
  }
  static cueBall(pos, label) {
    return new Ball(
      _Rack.jitter(pos),
      16777215,
      label,
      _Rack.unlabeledAppearance()
    );
  }
  static swapBallPositions(b1, b2) {
    let temp = b1.pos.clone();
    b1.pos.copy(b2.pos), b2.pos.copy(temp);
  }
  static diamond() {
    let pos = new Vector3(TableGeometry.tableX / 2, 0, 0), diamond = [], newball = (pos2, color, label) => new Ball(_Rack.jitter(pos2), color, label);
    return diamond.push(_Rack.cueBall(_Rack.spot), newball(pos, _Rack.BALL_COLORS[1], 1)), pos.add(_Rack.diagonal), diamond.push(newball(pos, _Rack.BALL_COLORS[2], 2)), pos.sub(_Rack.across), diamond.push(newball(pos, _Rack.BALL_COLORS[3], 3)), pos.add(_Rack.diagonal), diamond.push(newball(pos, _Rack.BALL_COLORS[4], 4)), pos.sub(_Rack.across), diamond.push(newball(pos, _Rack.BALL_COLORS[5], 5)), pos.addScaledVector(_Rack.across, 2), diamond.push(newball(pos, _Rack.BALL_COLORS[6], 6)), pos.add(_Rack.diagonal).sub(_Rack.across), diamond.push(newball(pos, _Rack.BALL_COLORS[7], 7)), pos.sub(_Rack.across), diamond.push(newball(pos, _Rack.BALL_COLORS[8], 8)), pos.add(_Rack.diagonal), diamond.push(newball(pos, _Rack.BALL_COLORS[9], 9)), _Rack.swapBallPositions(diamond[4], diamond[9]), diamond;
  }
  static triangle() {
    let tp = _Rack.trianglePositions(), triangle = [];
    return triangle.push(_Rack.cueBall(_Rack.spot)), tp.forEach((p, i) => {
      let label = i + 1;
      triangle.push(new Ball(_Rack.jitter(p), _Rack.BALL_COLORS[label], label));
    }), _Rack.swapBallPositions(triangle[4], triangle[9]), triangle;
  }
  static trianglePositions() {
    let triangle = [], pos = new Vector3(TableGeometry.X / 2, 0, 0);
    return triangle.push(vec(pos)), pos.add(this.diagonal), triangle.push(vec(pos)), pos.sub(this.across), triangle.push(vec(pos)), pos.add(this.diagonal), triangle.push(vec(pos)), pos.sub(this.across), triangle.push(vec(pos)), pos.addScaledVector(this.across, 2), triangle.push(vec(pos)), pos.add(this.diagonal), triangle.push(vec(pos)), pos.sub(this.across), triangle.push(vec(pos)), pos.sub(this.across), triangle.push(vec(pos)), pos.sub(this.across), triangle.push(vec(pos)), pos.add(this.diagonal).sub(this.across), triangle.push(vec(pos)), pos.add(this.across), triangle.push(vec(pos)), pos.add(this.across), triangle.push(vec(pos)), pos.add(this.across), triangle.push(vec(pos)), pos.add(this.across), triangle.push(vec(pos)), triangle;
  }
  static three() {
    let dx = TableGeometry.X / 2, dy = TableGeometry.Y / 4;
    return [
      _Rack.cueBall(_Rack.jitter(new Vector3(-dx, -dy, 0))),
      // Ball 0: White
      new Ball(
        _Rack.jitter(new Vector3(-dx, 0, 0)),
        16766720,
        void 0,
        _Rack.unlabeledAppearance()
      ),
      // Ball 1: Yellow
      new Ball(
        _Rack.jitter(new Vector3(dx, 0, 0)),
        16711680,
        void 0,
        _Rack.unlabeledAppearance()
      )
      // Ball 2: Red
    ];
  }
  static fourBall() {
    let dx = TableGeometry.X / 2, dy = TableGeometry.Y / 4, yellowX = dx * 1.5;
    return [
      _Rack.cueBall(_Rack.jitter(new Vector3(-dx, -dy, 0))),
      // Ball 0: White (P1 Cue - offset on head string)
      new Ball(
        _Rack.jitter(new Vector3(yellowX, 0, 0)),
        16766720,
        // Ball 1: Yellow (P2 Cue - between foot spot and far cushion)
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(new Vector3(-dx, 0, 0)),
        16711680,
        // Ball 2: Red A (Head spot, beside white)
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(new Vector3(dx, 0, 0)),
        16711680,
        // Ball 3: Red B (Foot spot)
        void 0,
        _Rack.unlabeledAppearance()
      )
    ];
  }
  static get sixth() {
    return TableGeometry.Y * 2 / 6;
  }
  static get baulk() {
    return -1.5 * TableGeometry.X * 2 / 5;
  }
  static snooker() {
    let balls = [], dy = TableGeometry.Y / 4;
    balls.push(_Rack.cueBall(_Rack.jitter(new Vector3(_Rack.baulk, -dy * 0.5, 0))));
    let colours = _Rack.snookerColourPositions();
    balls.push(
      new Ball(
        _Rack.jitter(colours[0]),
        16766720,
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(colours[1]),
        32768,
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(colours[2]),
        6956288,
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(colours[3]),
        23729,
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(colours[4]),
        16744627,
        void 0,
        _Rack.unlabeledAppearance()
      ),
      new Ball(
        _Rack.jitter(colours[5]),
        65536,
        void 0,
        _Rack.unlabeledAppearance()
      )
    );
    let redsToPlay = Math.min(SnookerConfig.reds, 15), triangle = _Rack.trianglePositions().slice(0, redsToPlay), pocketPos = PocketGeometry.pockets.pocketS.pocket.pos;
    return triangle.forEach((p, i) => {
      let ball = new Ball(
        _Rack.jitter(p.add(_Rack.down)),
        15597568,
        void 0,
        _Rack.unlabeledAppearance()
      );
      i >= redsToPlay && (ball.pos.copy(pocketPos), ball.pos.setZ(-8.5 * R), ball.state = "InPocket" /* InPocket */), balls.push(ball);
    }), balls;
  }
  static snookerColourPositions() {
    let dx = TableGeometry.X / 2, black = TableGeometry.X - TableGeometry.X * 2 / 11;
    return [
      new Vector3(_Rack.baulk, -_Rack.sixth, 0),
      new Vector3(_Rack.baulk, _Rack.sixth, 0),
      new Vector3(_Rack.baulk, 0, 0),
      new Vector3(0, 0, 0),
      new Vector3(dx, 0, 0),
      new Vector3(black, 0, 0)
    ];
  }
  static revealRedsToPlay() {
    return Math.min(SnookerConfig.reds, 15);
  }
  static eightBall() {
    let triangle = this.triangle();
    return _Rack.swapBallPositions(triangle[4], triangle[9]), _Rack.swapBallPositions(triangle[4], triangle[8]), _Rack.swapBallPositions(triangle[3], triangle[11]), _Rack.swapBallPositions(triangle[6], triangle[14]), _Rack.swapBallPositions(triangle[4], triangle[9]), triangle;
  }
  static fromInitParam(balls) {
    let params = new URLSearchParams(globalThis.location?.search);
    if (!params.has("practice") || !params.has("init"))
      return balls;
    let data = JSON.parse(params.get("init"));
    return balls.forEach((b, i) => {
      b.pos.x = data[i * 2], b.pos.y = data[i * 2 + 1], b.pos.z = 0;
    }), balls;
  }
  /** Helper so the reveal rule can rack only part of the standard 15-ball
   * triangle. The original eight-ball config reuses the same 15 labels, so
   * reveal should sit in the rack in the same order but uses only RedsToPlay
   * of them.
   */
  static restrictTriangle(triangle, count) {
    return triangle.slice(0, count + 1);
  }
}, Rack = _Rack;
Rack.noise = Math.fround(R * 0.023 + 15e-4 * Math.random()), Rack.gap = 2 * R + 2 * _Rack.noise, Rack.up = new Vector3(0, 0, -1), Rack.across = new Vector3(0, _Rack.gap, 0), Rack.down = new Vector3(_Rack.gap, 0, 0), Rack.diagonal = _Rack.across.clone().applyAxisAngle(_Rack.up, Math.PI * 1 / 3), Rack.BALL_COLORS = [
  "#FFFFFF",
  // 0: Cue Ball
  "#ffd900",
  // 1: Yellow
  "#0000FF",
  // 2: Blue
  "#FF0000",
  // 3: Red
  "#800080",
  // 4: Purple
  "#ff3300",
  // 5: Orange
  "#008000",
  // 6: Green
  "#600000",
  // 7: Maroon
  "#000000",
  // 8: Black
  "#FFFF00",
  // 9: Yellow (Striped)
  "#0000FF",
  // 10: Blue (Striped)
  "#FF0000",
  // 11: Red (Striped)
  "#800080",
  // 12: Purple (Striped)
  "#FF8000",
  // 13: Orange (Striped)
  "#008000",
  // 14: Green (Striped)
  "#600000"
  // 15: Maroon (Striped)
];

// ops/castle-billiards/headless-signals.ts
var Aim = class {
  constructor() {
    this.name = "Aim";
  }
}, WatchAim = class {
  constructor() {
    this.name = "WatchAim";
  }
}, PlaceBall = class {
  constructor() {
    this.name = "PlaceBall";
  }
}, MatchResultHelper = class {
  static presentGameEnd(_container, _rule, winner, reason) {
    return { name: "End", winner, reason: reason ?? null };
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/placeballevent.ts
var PlaceBallEvent = class extends GameEvent {
  constructor(pos, respot, useStartPos) {
    super();
    this.pos = pos, this.respot = respot, this.useStartPos = useStartPos, this.type = "PLACEBALL" /* PLACEBALL */;
  }
  static fromJson(json) {
    let respot = json.respot ? { id: json.respot.id, pos: vec(json.respot.pos) } : void 0;
    return new PlaceBallEvent(vec(json.pos), respot, json.useStartPos ?? !1);
  }
  applyToController(controller) {
    return controller.handlePlaceBall(this);
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/watchevent.ts
var WatchEvent = class extends GameEvent {
  constructor(json) {
    super();
    this.type = "WATCHAIM" /* WATCHAIM */, this.json = json;
  }
  applyToController(controller) {
    return controller.handleWatch(this);
  }
  static fromJson(json) {
    return new WatchEvent(json);
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/startaimevent.ts
var StartAimEvent = class extends GameEvent {
  constructor() {
    super(), this.type = "STARTAIM" /* STARTAIM */;
  }
  applyToController(controller) {
    return controller.handleStartAim(this);
  }
  static fromJson() {
    return new StartAimEvent();
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/scoreevent.ts
var ScoreEvent = class extends GameEvent {
  constructor(p1, p2, b, active = 0, p1type) {
    super();
    this.p1 = p1;
    this.p2 = p2;
    this.b = b;
    this.active = active;
    this.p1type = p1type;
    this.type = "SCORE" /* SCORE */;
  }
  applyToController(controller) {
    return controller.handleScore(this);
  }
  static fromJson(json) {
    return new ScoreEvent(
      json.p1,
      json.p2,
      json.b,
      json.active ?? 0,
      json.p1type
    );
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/respot.ts
var Respot = class {
  static snookerD(table) {
    let preferred = new Vector3(Rack.baulk, -Rack.sixth / 2.6, 0);
    if (!table.overlapsAny(preferred, table.cueball))
      return preferred;
    let step = R / 4, pos = new Vector3(Rack.baulk, -Rack.sixth, 0);
    for (; pos.y <= Rack.sixth; ) {
      if (!table.overlapsAny(pos, table.cueball))
        return pos;
      pos.y += step;
    }
    return pos;
  }
  static nineBall(table) {
    let nineBall = table.balls.find((b) => b.id === 9);
    if (!nineBall)
      return;
    let footSpot = new Vector3(TableGeometry.tableX / 2, 0, 0);
    Respot.respotBehind(footSpot, nineBall, table);
  }
  static respot(ball, table) {
    let positions = Rack.snookerColourPositions();
    return positions.push(positions[ball.id - 1]), positions.reverse(), positions.some((p) => table.overlapsAny(p, ball) ? !1 : (ball.pos.copy(p), ball.state = "Stationary" /* Stationary */, !0)) || Respot.respotBehind(positions[0], ball, table), ball;
  }
  static respotBehind(targetpos, ball, table) {
    let pos = targetpos.clone();
    for (; pos.x < TableGeometry.tableX && table.overlapsAny(pos, ball); )
      pos.x += R / 8;
    for (; pos.x > -TableGeometry.tableX && table.overlapsAny(pos, ball); )
      pos.x -= R / 8;
    ball.pos.copy(pos), ball.state = "Stationary" /* Stationary */;
  }
  static closest(cueball, balls) {
    return Respot.byDistance(cueball, balls, (a, b) => a < b);
  }
  static furthest(cueball, balls) {
    return Respot.byDistance(cueball, balls, (a, b) => a > b);
  }
  static byDistance(cueball, balls, prefer) {
    let onTable = balls.filter((ball) => ball.onTable()).filter((ball) => ball !== cueball);
    if (onTable.length === 0)
      return;
    let distanceToCueBall = (b) => cueball.pos.distanceTo(b.pos);
    return onTable.reduce(
      (a, b) => prefer(distanceToCueBall(a), distanceToCueBall(b)) ? a : b,
      onTable[0]
    );
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/events/rerackevent.ts
var RerackEvent = class extends GameEvent {
  constructor() {
    super();
    this.type = "RERACK" /* RERACK */;
  }
  applyToController(controller) {
    return RerackEvent.applyBallinfoToTable(controller.container.table, this.ballinfo), controller;
  }
  static fromJson(json) {
    let event = new RerackEvent();
    return event.ballinfo = json.ballinfo ?? json, event;
  }
  static applyBallinfoToTable(table, ballinfo) {
    table.updateFromSerialised(ballinfo), ballinfo?.balls && ballinfo.balls.forEach((bData) => {
      let ball = table.balls[bData.id];
      ball && (ball.pos.copy(bData.pos), ball.setStationary());
    });
  }
};

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/utils/table-scaler.ts
var modelExtentX = 16e3, modelExtentY = 9200;
function scaleTableModel(scene, stretchX, stretchY) {
  let group = scene.children[0];
  if (!group)
    return;
  let gsx = group.scale.x, gsy = group.scale.y;
  scene.traverse((child) => {
    let mesh = child;
    if (!mesh.isMesh || !mesh.geometry)
      return;
    let geometry = mesh.geometry;
    if (!geometry.attributes.position)
      return;
    geometry = geometry.clone(), geometry.index && (geometry = geometry.toNonIndexed()), mesh.geometry = geometry;
    let position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      let x = position.getX(i), y = position.getY(i);
      x > modelExtentX * 0.6 ? position.setX(i, x + 2 * stretchX) : x > modelExtentX * 0.4 && position.setX(i, x + stretchX), y > modelExtentY * 0.75 ? position.setY(i, y + 2 * stretchY) : y > modelExtentY * 0.25 && position.setY(i, y + stretchY);
    }
    position.needsUpdate = !0, geometry.computeBoundingBox(), geometry.computeBoundingSphere();
  }), group.position.x -= stretchX * gsx, group.position.y -= stretchY * gsy;
}

// D:/CodexScratch/WorkAdventure/output/billiards-review/fda4e90e251ce59ad878dbb996af372f4028a325/source/src/controller/rules/eightball.ts
var flipType = (t) => t === 1 ? 2 : t === 2 ? 1 : 0, EightBall = class {
  constructor(container) {
    this.currentBreak = 0;
    this.previousBreak = 0;
    this.rulename = "eightball";
    this.asset = "models/p8.min.gltf";
    this.container = container;
  }
  startTurn() {
    this.previousBreak = this.currentBreak, this.currentBreak = 0;
  }
  tableGeometry() {
    TableConfig.apply(this.rulename, TableConfig.tableSizeFromUrl());
  }
  scaleTableModel(scene) {
    TableConfig.tableSizeFromUrl() === 6 && scaleTableModel(scene, -2800, -1350);
  }
  table() {
    let table = new Table(this.rack());
    return this.cueball = table.cueball, table;
  }
  rack() {
    return Rack.fromInitParam(Rack.eightBall());
  }
  secondToPlay() {
  }
  otherPlayersCueBall() {
    return this.cueball;
  }
  isPartOfBreak(outcome) {
    return Outcome.isBallPottedNoFoul(this.container.table.cueball, outcome);
  }
  allowsPlaceBall() {
    return !0;
  }
  placeBall(target) {
    if (target) {
      let max = new Vector3(TableGeometry.tableX, TableGeometry.tableY), min = new Vector3(-TableGeometry.tableX, -TableGeometry.tableY);
      if (isFirstShot(this.container.recorder)) {
        let baulkline2 = -R * 11 / 0.5 * (TableConfig.tableSizeFromUrl() / 10);
        max.setX(baulkline2), min.setX(baulkline2);
      }
      return target.clone().clamp(min, max);
    }
    let baulkline = -R * 11 / 0.5 * (TableConfig.tableSizeFromUrl() / 10);
    return new Vector3(baulkline, 0, 0);
  }
  nextCandidateBall(p1type) {
    let type = p1type ?? Session.getInstance().p1type, table = this.container.table, balls = table.balls.filter((b) => b !== this.cueball && b.onTable());
    if (type === 0)
      return balls.find((b) => b.label !== 8);
    let myGroup = balls.filter((b) => this.isMyType(b, type));
    return myGroup.length > 0 ? Respot.closest(table.cueball, myGroup) : table.balls.find((b) => b.label === 8 && b.onTable());
  }
  isMyType(ball, type = Session.getInstance().p1type) {
    return type === 1 ? (ball.label || 0) >= 1 && (ball.label || 0) <= 7 : type === 2 ? (ball.label || 0) >= 9 && (ball.label || 0) <= 15 : !1;
  }
  isFoul(outcome) {
    return this.foulReason(outcome) !== null;
  }
  getAmountScored(outcome) {
    return Outcome.potCount(outcome);
  }
  respot(_outcome) {
    return [];
  }
  wrongBallHitReason(hitBall, outcome, type) {
    let session = Session.getInstance(), effectiveType = type ?? session.p1type;
    if (effectiveType === 0)
      return hitBall.label === 8 ? "Hitting the 8-ball first is a foul" : null;
    let cueball = this.container.table.cueball, pottedThisShot = new Set(Outcome.pots(outcome));
    return this.container.table.balls.filter(
      (b) => b !== cueball && (b.onTable() || pottedThisShot.has(b)) && this.isMyType(b, effectiveType)
    ).length > 0 ? this.isMyType(hitBall, effectiveType) ? null : "Wrong group hit first" : hitBall.label === 8 ? null : "Must hit 8-ball first";
  }
  foulReason(outcome, type) {
    let cueball = this.container.table.cueball;
    if (Outcome.isCueBallPotted(cueball, outcome))
      return "Cue ball potted";
    let firstCollision = Outcome.firstCollision(
      Outcome.cueBallFirst(cueball, outcome)
    );
    if (!firstCollision)
      return "No ball hit";
    let wrongBall = this.wrongBallHitReason(
      firstCollision.ballB,
      outcome,
      type
    );
    if (wrongBall)
      return wrongBall;
    if (Outcome.potCount(outcome) === 0) {
      let firstCollisionIndex = outcome.indexOf(firstCollision);
      if (!outcome.slice(firstCollisionIndex + 1).some((o) => o.type === "Cushion" /* Cushion */))
        return "No cushion after contact";
    }
    return null;
  }
  update(outcome) {
    let reason = this.foulReason(outcome);
    return reason ? this.handleFoul(outcome, reason) : Outcome.pots(outcome).length > 0 ? this.handlePot(outcome) : this.handleMiss();
  }
  handleFoul(outcome, reason) {
    this.container.notify({
      type: "Foul",
      // Source strings: this banner is broadcast to the opponent too.
      title: "FOUL",
      subtext: reason,
      extra: "Ball in hand"
    }), this.startTurn();
    let eightBallPotted = Outcome.pots(outcome).some((b) => b.label === 8), cueball = this.container.table.cueball;
    if (eightBallPotted) {
      let session = Session.getInstance(), hasGroupBalls = this.container.table.balls.some(
        (b) => b !== cueball && b.label !== 8 && b.onTable()
      );
      return session.p1type !== 0 && hasGroupBalls ? this.respotEightBallFoul() : this.handleGameEnd(!1, "8-ball pocketed on foul");
    }
    let startPos = cueball.onTable() ? cueball.pos.clone() : this.placeBall();
    roundVec(startPos);
    let placeBallEvent = new PlaceBallEvent(startPos, void 0, !0);
    return this.container.sendEvent(placeBallEvent), this.container.isSinglePlayer ? new PlaceBall(this.container, startPos) : new WatchAim(this.container);
  }
  handlePot(outcome) {
    let session = Session.getInstance(), table = this.container.table, pots = Outcome.pots(outcome), endOfGame = this.isEndOfGame(outcome);
    if (!endOfGame && pots.some((b) => b.label === 8))
      return this.respotEightBallFoul();
    let myGroupBefore = session.p1type;
    if (session.p1type === 0) {
      let solids = pots.filter((b) => b.label >= 1 && b.label <= 7), stripes = pots.filter((b) => b.label >= 9 && b.label <= 15);
      solids.length > 0 && stripes.length === 0 ? session.p1type = 1 : stripes.length > 0 && solids.length === 0 && (session.p1type = 2);
    }
    this.currentBreak += pots.length, session.addMyScore(pots.length), this.container.sound.playSuccess(table.inPockets());
    let p1typeForEvent = session.playerIndex === 0 ? session.p1type : flipType(session.p1type), scoreEvent = new ScoreEvent(
      session.playerIndex === 0 ? session.myScore() : session.opponentScore(),
      session.playerIndex === 1 ? session.myScore() : session.opponentScore(),
      this.currentBreak,
      session.playerIndex + 1,
      p1typeForEvent
    );
    return this.container.sendEvent(scoreEvent), endOfGame ? this.handleGameEnd(!0) : myGroupBefore !== 0 && !pots.some((b) => this.isMyType(b, myGroupBefore)) ? this.handleMiss() : (this.container.sendEvent(new WatchEvent({})), new Aim(this.container));
  }
  respotEightBallFoul() {
    let table = this.container.table, eightBall = table.balls.find((b) => b.label === 8), footSpot = new Vector3(TableGeometry.tableX / 2, 0, 0);
    return Respot.respotBehind(footSpot, eightBall, table), eightBall.fround(), this.container.sendEvent(
      RerackEvent.fromJson({ balls: [eightBall.serialise()] })
    ), this.handleFoul([], "8-ball pocketed early");
  }
  handleMiss() {
    return this.container.sendEvent(new StartAimEvent()), this.container.isSinglePlayer ? (this.container.sendEvent(new WatchEvent({})), this.startTurn(), new Aim(this.container)) : new WatchAim(this.container);
  }
  isEndOfGame(outcome, type) {
    let eightBall = this.container.table.balls.find((b) => b.label === 8);
    if (!Outcome.pots(outcome).includes(eightBall) || this.foulReason(outcome, type) || Session.getInstance().p1type === 0)
      return !1;
    let table = this.container.table, cueball = table.cueball, pottedThisShot = new Set(Outcome.pots(outcome));
    return table.balls.filter(
      (b) => b !== cueball && b !== eightBall && b.onTable() && this.isMyType(b, type) && !pottedThisShot.has(b)
    ).length === 0;
  }
  handleGameEnd(isWinner, endSubtext) {
    return MatchResultHelper.presentGameEnd(
      this.container,
      this.rulename,
      isWinner,
      endSubtext
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Ball,
  EightBall,
  EventType,
  Outcome,
  OutcomeType,
  PocketGeometry,
  R,
  Rack,
  Session,
  State,
  Table,
  TableConfig,
  TableGeometry,
  Vector3,
  cueStrike,
  maxPower,
  offCenterLimit
});
/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
