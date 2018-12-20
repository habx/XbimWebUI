"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mat4_1 = require("../../matrix/mat4");
var vec3_1 = require("../../matrix/vec3");
var clamp = function (value, min, max) { return Math.max(Math.min(0.9999 * max, value), 1.0001 * min); };
var degToRad = function (deg) { return deg * (Math.PI / 180.0); };
var lerp = function (a, b, r) { return a + ((b - a) * r); };
var interpolateAngle = function (a, b, t) {
    var PI_2 = Math.PI * 2;
    var fromAngle = (a + PI_2) % PI_2;
    var toAngle = (b + PI_2) % PI_2;
    var diff = Math.abs(fromAngle - toAngle);
    if (diff < Math.PI) {
        return lerp(fromAngle, toAngle, t);
    }
    else {
        if (fromAngle > toAngle) {
            fromAngle = fromAngle - PI_2;
            return lerp(fromAngle, toAngle, t);
        }
        else if (toAngle > fromAngle) {
            toAngle = toAngle - PI_2;
            return lerp(fromAngle, toAngle, t);
        }
    }
};
var mergeBboxes = function (bboxes) {
    var bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    bboxes.forEach(function (b) {
        if (!b) {
            return;
        }
        var bboxTop = [
            bbox[0] + bbox[3],
            bbox[1] + bbox[4],
            bbox[2] + bbox[5],
        ];
        if (isNaN(bboxTop[0])) {
            bboxTop[0] = -Infinity;
        }
        if (isNaN(bboxTop[1])) {
            bboxTop[1] = -Infinity;
        }
        if (isNaN(bboxTop[2])) {
            bboxTop[2] = -Infinity;
        }
        var bTop = [
            b[0] + b[3],
            b[1] + b[4],
            b[2] + b[5],
        ];
        var top = [
            Math.max(bboxTop[0], bTop[0]),
            Math.max(bboxTop[1], bTop[1]),
            Math.max(bboxTop[2], bTop[2]),
        ];
        bbox[0] = Math.min(bbox[0], b[0]);
        bbox[1] = Math.min(bbox[1], b[1]);
        bbox[2] = Math.min(bbox[2], b[2]);
        bbox[3] = top[0] - bbox[0];
        bbox[4] = top[1] - bbox[1];
        bbox[5] = top[2] - bbox[2];
    });
    return bbox;
};
var NavigationArcball = /** @class */ (function () {
    function NavigationArcball() {
        /**
         * Use this boolean switch to activate and deactivate the plugin. This will supposingly be bound to
         * some user interaction (like a button in the toolbar).
         * @member {boolean} NavigationXYPlane#isActive
         * */
        this._isActive = false;
        /**
         * Min distance from the target
         * @member {number} NavigationArcball#maxDistance
         * */
        this._minDistance = 10;
        /**
         * Max distance from the target
         * @member {number} NavigationArcball#maxDistance
         * */
        this._maxDistance = 150;
        /**
         * Min pitch for the camera (in rad)
         * @member {number} NavigationArcball#minPitch
         * */
        this._minPitch = 0;
        /**
         * Max pitch for the camera (in rad)
         * @member {number} NavigationArcball#maxDistance
         * */
        this._maxPitch = Math.PI / 2;
        this._targetPitch = 0;
        this._pitch = 0;
        this._targetYaw = 0;
        this._yaw = 0;
        this._rotating = false;
        this._rotationSpeed = Math.PI / 20;
        this._interactionTimeout = 4000;
        this._lastFrameTime = Date.now();
        this._lastInteraction = 0;
        this._dirty = true;
        this._interpolationStarted = 0;
        this._interpolating = false;
        this._interpolationTime = 1000;
    }
    // called by the viewer when plugin is added
    NavigationArcball.prototype.init = function (viewer) {
        // patch the internal implementation (keep binding to the original object)
        this._originalNavigate = viewer['navigate'].bind(viewer);
        viewer['navigate'] = this.navigate.bind(this);
        // keep the reference for the navigation
        this._viewer = viewer;
    };
    Object.defineProperty(NavigationArcball.prototype, "isActive", {
        get: function () { return this._isActive; },
        set: function (value) {
            this._isActive = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "minDistance", {
        get: function () { return this._minDistance; },
        set: function (value) {
            this._minDistance = value;
            this._setDistance(this._distance);
            this._dirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "maxDistance", {
        get: function () { return this._maxDistance; },
        set: function (value) {
            this._maxDistance = value;
            this._setDistance(this._distance);
            this._dirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "minPitch", {
        get: function () { return this._minPitch; },
        set: function (value) {
            this._minPitch = value;
            this._setPitch(this._pitch);
            this._dirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "maxPitch", {
        get: function () { return this._maxPitch; },
        set: function (value) {
            this._maxPitch = value;
            this._setPitch(this._pitch);
            this._dirty = true;
        },
        enumerable: true,
        configurable: true
    });
    NavigationArcball.prototype._setPitch = function (value) {
        this._pitch = clamp(value % (Math.PI * 2), this._minPitch, this._maxPitch);
        this._setTargetPitch(value);
        this._dirty = true;
    };
    ;
    NavigationArcball.prototype._setTargetPitch = function (value) {
        this._targetPitch = clamp(value % (Math.PI * 2), this._minPitch, this._maxPitch);
        if (this._targetPitch - this._pitch > Math.PI) {
            this._targetPitch = -(Math.PI * 2) - this._targetPitch;
        }
        this._dirty = true;
    };
    ;
    NavigationArcball.prototype._setYaw = function (value) {
        this._yaw = value % (Math.PI * 2);
        this._setTargetYaw(value);
        this._dirty = true;
    };
    ;
    NavigationArcball.prototype._setTargetYaw = function (value) {
        this._targetYaw = value % (Math.PI * 2);
        if (this._targetYaw - this._yaw > Math.PI) {
            this._targetYaw = -(Math.PI * 2) - this._targetYaw;
        }
        this._dirty = true;
    };
    ;
    Object.defineProperty(NavigationArcball.prototype, "origin", {
        set: function (value) {
            this._origin = value;
            this._targetOrigin = value;
            this._viewer._origin = value;
            this._dirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "targetOrigin", {
        set: function (value) {
            this._targetOrigin = value;
            this._dirty = true;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "distance", {
        get: function () {
            var viewer = this._viewer;
            var meter = 1;
            viewer._handles.forEach(function (handle) {
                meter = handle.model.meter;
            }, viewer);
            return this._distance / meter;
        },
        set: function (value) {
            var viewer = this._viewer;
            var meter = 1;
            viewer._handles.forEach(function (handle) {
                meter = handle.model.meter;
            }, viewer);
            this._setDistance(meter * value);
        },
        enumerable: true,
        configurable: true
    });
    NavigationArcball.prototype._setDistance = function (value) {
        var viewer = this._viewer;
        var meter = 1;
        viewer._handles.forEach(function (handle) {
            meter = handle.model.meter;
        }, viewer);
        this._distance = clamp(value, this._minDistance * meter, this._maxDistance * meter);
        this._setTargetDistance(value);
        this._viewer._distance = this._distance;
        this._dirty = true;
    };
    NavigationArcball.prototype._setTargetDistance = function (value) {
        var viewer = this._viewer;
        var meter = 1;
        viewer._handles.forEach(function (handle) {
            meter = handle.model.meter;
        }, viewer);
        this._targetDistance = clamp(value, this._minDistance * meter, this._maxDistance * meter);
        this._dirty = true;
    };
    Object.defineProperty(NavigationArcball.prototype, "rotating", {
        get: function () {
            return this._rotating;
        },
        set: function (value) {
            this._rotating = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "rotationSpeed", {
        get: function () {
            return this._rotationSpeed;
        },
        set: function (value) {
            this._rotationSpeed = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NavigationArcball.prototype, "interactionTimeout", {
        get: function () {
            return this._interactionTimeout;
        },
        set: function (value) {
            this._interactionTimeout = value;
        },
        enumerable: true,
        configurable: true
    });
    NavigationArcball.prototype._setInterpolating = function () {
        this._lastInteraction = Date.now();
        this._interpolating = true;
        this._interpolationStarted = Date.now();
    };
    Object.defineProperty(NavigationArcball.prototype, "interpolationTime", {
        get: function () {
            return this._interpolationTime / 1000;
        },
        set: function (value) {
            this._interpolationTime = value * 1000;
        },
        enumerable: true,
        configurable: true
    });
    NavigationArcball.prototype._animateCamera = function () {
        if (!this._interpolating) {
            return;
        }
    };
    NavigationArcball.prototype._updateCamera = function () {
        var dT = Date.now() - this._lastFrameTime;
        this._lastFrameTime += dT;
        var timeSinceLastInteraction = this._lastFrameTime - this._lastInteraction;
        // In case either property was updated on the viewer setCameraTarget or zoomTo
        // Called before the check on _isDirty in order to set _isDirty if the properties changed
        if (this._viewer._distance !== this._distance) {
            this._setDistance(this._viewer._distance);
        }
        if (this._viewer._origin !== this._origin) {
            this.origin = this._viewer._origin;
        }
        if (this._rotating && timeSinceLastInteraction > 4000) {
            this._setYaw(this._yaw += (dT / 1000) * this._rotationSpeed);
        }
        if (!this._dirty && !this._interpolating)
            return;
        var t = Math.min((this._lastFrameTime - this._interpolationStarted) / this._interpolationTime, 1.0);
        var origin = !this._interpolating
            ? this._origin
            : vec3_1.vec3.lerp(vec3_1.vec3.create(), vec3_1.vec3.clone(this._origin), vec3_1.vec3.clone(this._targetOrigin), t);
        var yaw = !this._interpolating
            ? this._yaw
            : interpolateAngle(this._yaw, this._targetYaw, t);
        var pitch = !this._interpolating
            ? this._pitch
            : interpolateAngle(this._pitch, this._targetPitch, t);
        pitch = -pitch + (Math.PI / 2);
        var distance = !this._interpolating
            ? this._distance
            : this._distance + (this._targetDistance - this._distance) * t;
        var interpolating = t < 1.0;
        if (!interpolating && this._interpolating) {
            this._setDistance(this._targetDistance);
            this._setYaw(this._targetYaw);
            this._setPitch(this._targetPitch);
            this.origin = this._targetOrigin;
            this._interpolating = false;
        }
        var eye = vec3_1.vec3.create();
        eye[0] = origin[0] + distance * Math.cos(yaw) * Math.sin(pitch);
        eye[1] = origin[1] + distance * Math.sin(yaw) * Math.sin(pitch);
        eye[2] = origin[2] + distance * Math.cos(pitch);
        mat4_1.mat4.lookAt(this._viewer.mvMatrix, eye, origin, [0, 0, 1]);
        this._dirty = false;
    };
    NavigationArcball.prototype.navigate = function (type, deltaX, deltaY) {
        var viewer = this._viewer;
        if (!viewer._handles || !viewer._handles[0] || this._interpolating)
            return;
        this._lastInteraction = Date.now();
        switch (type) {
            case 'free-orbit':
            case 'fixed-orbit':
            case 'orbit':
                this._setYaw(this._yaw - degToRad(deltaX / 4));
                this._setPitch(this._pitch + degToRad(deltaY / 4));
                break;
            case 'pan':
                break;
            case 'zoom':
                this._setDistance(this._distance - (deltaY * this._distance / 20));
                break;
            default:
                break;
        }
    };
    NavigationArcball.prototype.zoomTo = function (ids, _a) {
        var _this = this;
        var _b = _a.interpolate, interpolate = _b === void 0 ? false : _b, _c = _a.autoYaw, autoYaw = _c === void 0 ? true : _c, _d = _a.yaw, yaw = _d === void 0 ? this._yaw : _d, _e = _a.pitch, pitch = _e === void 0 ? this._pitch : _e;
        if (!ids) {
            return;
        }
        var bboxes = ids.map(function (id) { return (_this._viewer.forHandleOrAll(function (handle) {
            var map = handle.getProductMap(id);
            if (map) {
                return map.bBox;
            }
        })); }, undefined);
        var bbox = mergeBboxes(bboxes);
        var newOrigin = [
            bbox[0] + bbox[3] * 0.5,
            bbox[1] + bbox[4] * 0.5,
            bbox[2] + bbox[5] * 0.5,
        ];
        var distance = vec3_1.vec3.distance(vec3_1.vec3.fromValues(0, 0, 0), vec3_1.vec3.fromValues(bbox[3], bbox[4], bbox[5]));
        if (autoYaw) {
            var dir = vec3_1.vec3.sub(vec3_1.vec3.create(), newOrigin, this._origin);
            var angle = Math.atan2(dir[1], dir[0]);
            yaw = angle;
        }
        if (interpolate) {
            this._setTargetYaw(yaw);
            this._setTargetPitch(pitch);
            this._setTargetDistance(distance);
            this.targetOrigin = newOrigin;
            this._setInterpolating();
        }
        else {
            this._setYaw(yaw);
            this._setPitch(pitch);
            this._setDistance(distance);
            this.origin = newOrigin;
        }
    };
    NavigationArcball.prototype.onBeforeDraw = function () {
        if (this._isActive) {
            // Update camera matrix before drawing
            this._updateCamera();
        }
    };
    NavigationArcball.prototype.onAfterDraw = function () {
    };
    NavigationArcball.prototype.onBeforeDrawId = function () {
    };
    NavigationArcball.prototype.onAfterDrawId = function () {
    };
    NavigationArcball.prototype.onBeforeGetId = function (id) {
        return false;
    };
    NavigationArcball.prototype.onBeforePick = function (id) {
        return false;
    };
    return NavigationArcball;
}());
exports.NavigationArcball = NavigationArcball;
//# sourceMappingURL=navigation-arcball.js.map