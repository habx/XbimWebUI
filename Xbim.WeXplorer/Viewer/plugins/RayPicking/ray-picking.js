"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mat4_1 = require("../../matrix/mat4");
var vec3_1 = require("../../matrix/vec3");
var getBboxTriangles = function (bbox) {
    var points = [
        [
            bbox[0],
            bbox[1],
            bbox[2],
        ],
        [
            bbox[0] + bbox[3],
            bbox[1],
            bbox[2],
        ],
        [
            bbox[0] + bbox[3],
            bbox[1] + bbox[4],
            bbox[2],
        ],
        [
            bbox[0],
            bbox[1] + bbox[4],
            bbox[2],
        ],
        [
            bbox[0],
            bbox[1],
            bbox[2] + bbox[5],
        ],
        [
            bbox[0] + bbox[3],
            bbox[1],
            bbox[2] + bbox[5],
        ],
        [
            bbox[0] + bbox[3],
            bbox[1] + bbox[4],
            bbox[2] + bbox[5],
        ],
        [
            bbox[0],
            bbox[1] + bbox[4],
            bbox[2] + bbox[5],
        ],
    ];
    var triangles = [
        // Left
        [points[0], points[1], points[2]],
        [points[0], points[2], points[3]],
        // Back
        [points[0], points[7], points[4]],
        [points[0], points[3], points[7]],
        // Right
        [points[4], points[6], points[5]],
        [points[4], points[7], points[6]],
        // Front
        [points[5], points[2], points[1]],
        [points[5], points[6], points[2]],
        // Top
        [points[2], points[6], points[7]],
        [points[2], points[7], points[3]],
        // Bottom
        [points[1], points[4], points[5]],
        [points[1], points[0], points[4]],
    ];
    return triangles;
};
var RayPicking = /** @class */ (function () {
    /**
    * This is constructor of the Pulse Highlight plugin for {@link xViewer xBIM Viewer}.
    * @name RayPicking
    * @constructor
    * @classdesc This is a plugin for Viewer which does picking by casting a ray to see which elements are
    * under the mouse. Best performance when a only subset of elements are pickable
    *
    *     var rayPicking = new RayPicking();
    *     viewer.addPlugin(rayPicking);
    *
    */
    function RayPicking() {
        this._initialized = false;
        this.accurate = true;
    }
    RayPicking.prototype.init = function (viewer) {
        var self = this;
        this.viewer = viewer;
        var gl = this.viewer.gl;
        this._initialized = true;
        this._frameNb = 0;
        this._hitFrameNb = null;
        this._hitProduct = null;
        this._hitHandle = null;
        this._originalGetID = viewer['getID'].bind(viewer);
        viewer['getID'] = this.getID.bind(this);
    };
    RayPicking.prototype.getID = function (x, y, modelId) {
        var _this = this;
        if (modelId === void 0) { modelId = false; }
        // Do picking only if it wasn't already done this frame
        if (this._hitFrameNb !== this._frameNb) {
            this._hitFrameNb = this._frameNb;
            this._hitProduct = null;
            this._hitHandle = null;
            var viewer = this.viewer;
            var pickableProducts_1 = viewer._pickableProducts;
            var picked = [];
            var ray_1 = this._screenToWorldRay(x, y);
            if (!ray_1) {
                return null;
            }
            var distance_1 = Infinity;
            viewer._handles.forEach(function (handle) {
                if (!handle.stopped && handle.pickable) {
                    if (!pickableProducts_1 || !pickableProducts_1.length) {
                        // TODO (but probably not worth it, iterating on thousands of products, performance would probably be awful?)
                    }
                    else {
                        pickableProducts_1.forEach(function (productId) {
                            var product = handle.getProductMap(productId);
                            var bbox = product.bBox;
                            var triangles = getBboxTriangles(bbox);
                            var hit = false;
                            // first see if the rays intersect with the bbox of the element (only 12 triangle)
                            triangles.forEach(function (triangle) {
                                var triangleHit = _this._rayHitsTriangle(ray_1, triangle);
                                if (triangleHit !== false) {
                                    hit = true;
                                    if (!_this.accurate && triangleHit < distance_1) {
                                        distance_1 = triangleHit;
                                        _this._hitProduct = product;
                                        _this._hitHandle = handle;
                                    }
                                }
                            });
                            // if bbox was hit there is a chance the geometry of the element will intersect with the
                            // ray. Let's try each triangle of the geometry
                            if (_this.accurate && hit) {
                                var spans = product.spans;
                                hit = false;
                                spans.forEach(function (_a) {
                                    var begin = _a[0], end = _a[1];
                                    for (var i = begin; i < end; i += 3) {
                                        var triangle = [
                                            [
                                                handle.model.vertices[3 * i],
                                                handle.model.vertices[3 * i + 1],
                                                handle.model.vertices[3 * i + 2],
                                            ],
                                            [
                                                handle.model.vertices[3 * i + 3],
                                                handle.model.vertices[3 * i + 4],
                                                handle.model.vertices[3 * i + 5],
                                            ],
                                            [
                                                handle.model.vertices[3 * i + 6],
                                                handle.model.vertices[3 * i + 7],
                                                handle.model.vertices[3 * i + 8],
                                            ],
                                        ];
                                        var triangleHit = _this._rayHitsTriangle(ray_1, triangle);
                                        // If we found a hit, see its distance to the camera. We keep the shortest distance
                                        // in order to find the first hit object
                                        if (triangleHit !== false) {
                                            hit = true;
                                            if (triangleHit < distance_1) {
                                                distance_1 = triangleHit;
                                                _this._hitProduct = product;
                                                _this._hitHandle = handle;
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
        if (!modelId && this._hitProduct) {
            return this._hitProduct.renderId;
        }
        else if (modelId) {
            return (this._hitHandle && this._hitHandle.id) || undefined;
        }
        return null;
    };
    RayPicking.prototype._rayHitsTriangle = function (ray, triangle) {
        var EPSILON = 0.00001;
        var v0 = triangle[0];
        var v1 = triangle[1];
        var v2 = triangle[2];
        var edge1 = vec3_1.vec3.sub(vec3_1.vec3.create(), v1, v0);
        var edge2 = vec3_1.vec3.sub(vec3_1.vec3.create(), v2, v0);
        var pvec = vec3_1.vec3.cross(vec3_1.vec3.create(), ray.direction, edge2);
        var dot = vec3_1.vec3.dot(edge1, pvec);
        if (dot > -EPSILON && dot < EPSILON)
            return false;
        var invDot = 1.0 / dot;
        var tvec = vec3_1.vec3.sub(vec3_1.vec3.create(), ray.origin, v0);
        var u = vec3_1.vec3.dot(tvec, pvec) * invDot;
        if (u < 0.0 || u > 1.0)
            return false;
        var qvec = vec3_1.vec3.cross(vec3_1.vec3.create(), tvec, edge1);
        var v = vec3_1.vec3.dot(ray.direction, qvec) * invDot;
        if (v < 0.0 || u + v > 1.0)
            return false;
        var t = vec3_1.vec3.dot(edge2, qvec) * invDot;
        if (t > 0) {
            return t;
        }
        return false;
    };
    RayPicking.prototype._screenToWorldRay = function (x, y) {
        var viewer = this.viewer;
        var width = viewer._width;
        var height = viewer._height;
        var unprojectedPosition = this._unproject((2 * x / width) - 1, (2 * y / height) - 1, viewer.mvMatrix, viewer._pMatrix, [-1.0, -1.0, 2.0, 2.0]);
        if (!unprojectedPosition) {
            return null;
        }
        var rayOriginPosition = viewer.getCameraPosition();
        var rayDirection = vec3_1.vec3.normalize(vec3_1.vec3.create(), vec3_1.vec3.sub(vec3_1.vec3.create(), unprojectedPosition, rayOriginPosition));
        return {
            origin: rayOriginPosition,
            direction: rayDirection,
        };
    };
    RayPicking.prototype._unproject = function (x, y, view, proj, viewport) {
        var inverse = mat4_1.mat4.invert(mat4_1.mat4.create(), mat4_1.mat4.mul(mat4_1.mat4.create(), proj, view));
        if (!inverse) {
            return null;
        }
        var tmp = [x, y, 1.0, 1.0];
        tmp[0] = (tmp[0] - viewport[0]) / viewport[2];
        tmp[1] = (tmp[1] - viewport[1]) / viewport[3];
        tmp[0] = (tmp[0] * 2) - 1;
        tmp[1] = (tmp[1] * 2) - 1;
        tmp[2] = (tmp[2] * 2) - 1;
        tmp[3] = (tmp[3] * 2) - 1;
        var obj = this._vec4TransformMat4([], tmp, inverse);
        obj[0] = obj[0] / obj[3];
        obj[1] = obj[1] / obj[3];
        obj[2] = obj[2] / obj[3];
        obj[3] = obj[3] / obj[3];
        return vec3_1.vec3.copy(vec3_1.vec3.create(), obj);
    };
    RayPicking.prototype._vec4TransformMat4 = function (out, a, m) {
        var x = a[0], y = a[1], z = a[2], w = a[3];
        out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
        return out;
    };
    RayPicking.prototype.onBeforeDraw = function () {
        this._frameNb++;
    };
    RayPicking.prototype.onBeforePick = function (id) { return false; };
    RayPicking.prototype.onAfterDraw = function () { };
    RayPicking.prototype.onBeforeDrawId = function () { };
    RayPicking.prototype.onAfterDrawId = function () { };
    RayPicking.prototype.onBeforeGetId = function (id) { return false; };
    return RayPicking;
}());
exports.RayPicking = RayPicking;
//# sourceMappingURL=ray-picking.js.map