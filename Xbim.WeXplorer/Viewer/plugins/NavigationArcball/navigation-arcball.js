"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mat4_1 = require("../../matrix/mat4");
var vec3_1 = require("../../matrix/vec3");
var clamp = function (value, min, max) { return Math.max(Math.min(0.9999 * max, value), 1.0001 * min); };
var degToRad = function (deg) { return deg * (Math.PI / 180.0); };
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
        this._pitch = 0;
        this._yaw = 0;
        this._rotating = false;
        this._rotationSpeed = Math.PI / 20;
        this._interactionTimeout = 4000;
        this._lastFrameTime = Date.now();
        this._lastInteraction = 0;
        this._dirty = true;
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
        this._pitch = clamp(value, this._minPitch, this._maxPitch);
        this._dirty = true;
    };
    ;
    NavigationArcball.prototype._setYaw = function (value) {
        this._yaw = value;
        this._dirty = true;
    };
    ;
    Object.defineProperty(NavigationArcball.prototype, "origin", {
        set: function (value) {
            this._origin = value;
            this._viewer._origin = value;
            this._dirty = true;
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
        this._viewer._distance = this._distance;
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
        if (!this._dirty)
            return;
        var origin = this._origin;
        var yaw = this._yaw;
        var pitch = -this._pitch + (Math.PI / 2);
        var distance = this._distance;
        var eye = vec3_1.vec3.create();
        eye[0] = origin[0] + distance * Math.cos(yaw) * Math.sin(pitch);
        eye[1] = origin[1] + distance * Math.sin(yaw) * Math.sin(pitch);
        eye[2] = origin[2] + distance * Math.cos(pitch);
        mat4_1.mat4.lookAt(this._viewer.mvMatrix, eye, origin, [0, 0, 1]);
        this._dirty = false;
    };
    NavigationArcball.prototype.navigate = function (type, deltaX, deltaY) {
        var viewer = this._viewer;
        if (!viewer._handles || !viewer._handles[0])
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