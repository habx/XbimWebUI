"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var binary_reader_1 = require("./binary-reader");
var triangulated_shape_1 = require("./triangulated-shape");
var state_1 = require("./state");
var product_type_1 = require("./product-type");
var mat4_1 = require("./matrix/mat4");
var vec3_1 = require("./matrix/vec3");
var tick = function () { return new Promise(function (cb) { return setTimeout(cb, 0); }); };
var ModelGeometry = /** @class */ (function () {
    function ModelGeometry() {
        this.meter = 1000;
        //this will be used to change appearance of the objects
        //map objects have a format: 
        //map = {
        //	productID: int,
        //	type: int,
        //	bBox: Float32Array(6),
        //	spans: [Int32Array([int, int]),Int32Array([int, int]), ...] //spanning indexes defining shapes of product and it's state
        //};
        this.productMaps = {};
        this.productIdLookup = [];
        this.getNormal = function (normal1, normal2) {
            var lon = normal1 / 252.0 * 2.0 * Math.PI;
            var lat = normal2 / 252.0 * Math.PI;
            var x = Math.sin(lon) * Math.sin(lat);
            var z = Math.cos(lon) * Math.sin(lat);
            var y = Math.cos(lat);
            return vec3_1.vec3.normalize(vec3_1.vec3.create(), vec3_1.vec3.fromValues(x, y, z));
        };
    }
    ModelGeometry.prototype.parse = function (binReader) {
        return __awaiter(this, void 0, void 0, function () {
            var br, magicNumber, version, numShapes, numVertices, numTriangles, numMatrices, numProducts, numStyles, numRegions, square, iVertex, iIndexForward, iIndexBackward, iTransform, iMatrix, stateEnum, typeEnum, i, region, styleMap, iStyle, styleId, R, G, B, A, defaultStyle, i, productLabel, prodType, bBox, map, iShape, repetition, shapeList, iProduct, prodLabel, instanceTypeId, instanceLabel, styleId, transformation, styleItem, matrix, i, j, shapeGeom;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.time('parse');
                        br = binReader;
                        magicNumber = br.readInt32();
                        if (magicNumber != 94132117)
                            throw 'Magic number mismatch.';
                        version = br.readByte();
                        numShapes = br.readInt32();
                        numVertices = br.readInt32();
                        numTriangles = br.readInt32();
                        numMatrices = br.readInt32();
                        ;
                        numProducts = br.readInt32();
                        ;
                        numStyles = br.readInt32();
                        ;
                        this.meter = br.readFloat32();
                        ;
                        numRegions = br.readInt16();
                        square = function (arity, count) {
                            if (typeof (arity) == 'undefined' || typeof (count) == 'undefined') {
                                throw 'Wrong arguments';
                            }
                            if (count == 0)
                                return 0;
                            var byteLength = count * arity;
                            var imgSide = Math.ceil(Math.sqrt(byteLength / 4));
                            //clamp to parity
                            while ((imgSide * 4) % arity != 0) {
                                imgSide++;
                            }
                            var result = imgSide * imgSide * 4 / arity;
                            return result;
                        };
                        //create target buffers of correct size (avoid reallocation of memory)
                        this.vertices = new Float32Array(numTriangles * 3 * 3);
                        this.normals = new Uint8Array(numTriangles * 6);
                        this.indices = new Float32Array(numTriangles * 3);
                        this.styleIndices = new Uint16Array(numTriangles * 3);
                        this.styles = new Uint8Array(square(1, (numStyles + 1) * 4)); //+1 is for a default style
                        this.products = new Float32Array(numTriangles * 3);
                        this.states = new Uint8Array(numTriangles * 3 * 2); //place for state and restyling
                        this.transformations = new Float32Array(numTriangles * 3);
                        this.matrices = new Float32Array(square(4, numMatrices * 16));
                        this.productMaps = {};
                        this.regions = new Array(numRegions);
                        iVertex = 0;
                        iIndexForward = 0;
                        iIndexBackward = numTriangles * 3;
                        iTransform = 0;
                        iMatrix = 0;
                        stateEnum = state_1.State;
                        typeEnum = product_type_1.ProductType;
                        for (i = 0; i < numRegions; i++) {
                            region = new Region();
                            region.population = br.readInt32();
                            region.centre = br.readFloat32Array(3);
                            region.bbox = br.readFloat32Array(6);
                            this.regions[i] = region;
                        }
                        styleMap = [];
                        styleMap['getStyle'] = function (id) {
                            for (var i = 0; i < this.length; i++) {
                                var item = this[i];
                                if (item.id == id)
                                    return item;
                            }
                            return null;
                        };
                        iStyle = 0;
                        for (iStyle; iStyle < numStyles; iStyle++) {
                            styleId = br.readInt32();
                            R = br.readFloat32() * 255;
                            G = br.readFloat32() * 255;
                            B = br.readFloat32() * 255;
                            A = br.readFloat32() * 255;
                            this.styles.set([R, G, B, A], iStyle * 4);
                            styleMap.push({ id: styleId, index: iStyle, transparent: A < 254 });
                        }
                        this.styles.set([255, 255, 255, 255], iStyle * 4);
                        defaultStyle = { id: -1, index: iStyle, transparent: A < 254 };
                        styleMap.push(defaultStyle);
                        for (i = 0; i < numProducts; i++) {
                            productLabel = br.readInt32();
                            prodType = br.readInt16();
                            bBox = br.readFloat32Array(6);
                            map = {
                                productID: productLabel,
                                renderId: i + 1,
                                type: prodType,
                                bBox: bBox,
                                spans: []
                            };
                            this.productIdLookup[i + 1] = productLabel;
                            this.productMaps[productLabel] = map;
                        }
                        iShape = 0;
                        _a.label = 1;
                    case 1:
                        if (!(iShape < numShapes)) return [3 /*break*/, 5];
                        if (!(iShape % 250 === 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, tick()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        repetition = br.readInt32();
                        shapeList = [];
                        for (iProduct = 0; iProduct < repetition; iProduct++) {
                            prodLabel = br.readInt32();
                            instanceTypeId = br.readInt16();
                            instanceLabel = br.readInt32();
                            styleId = br.readInt32();
                            transformation = null;
                            if (repetition > 1) {
                                transformation = version === 1 ? br.readFloat32Array(16) : br.readFloat64Array(16);
                                this.matrices.set(transformation, iMatrix);
                                iMatrix += 16;
                            }
                            styleItem = styleMap['getStyle'](styleId);
                            if (styleItem === null)
                                styleItem = defaultStyle;
                            matrix = mat4_1.mat4.create();
                            if (transformation) {
                                for (i = 0; i < 4; i++) {
                                    for (j = 0; j < 4; j++) {
                                        matrix[(i * 4) + j] = transformation[(i * 4) + j];
                                    }
                                }
                            }
                            shapeList.push({
                                pLabel: prodLabel,
                                iLabel: instanceLabel,
                                style: styleItem.index,
                                transparent: styleItem.transparent,
                                transformation: matrix
                            });
                        }
                        shapeGeom = new triangulated_shape_1.TriangulatedShape();
                        shapeGeom.parse(br);
                        //copy shape data into inner array and set to null so it can be garbage collected
                        shapeList.forEach(function (shape) {
                            var iIndex = 0;
                            //set iIndex according to transparency either from beginning or at the end
                            if (shape.transparent) {
                                iIndex = iIndexBackward - shapeGeom.indices.length;
                            }
                            else {
                                iIndex = iIndexForward;
                            }
                            var begin = iIndex;
                            var map = _this.productMaps[shape.pLabel];
                            if (typeof (map) === "undefined") {
                                //throw "Product hasn't been defined before.";
                                map = {
                                    productID: 0,
                                    type: typeEnum.IFCOPENINGELEMENT,
                                    bBox: new Float32Array(6),
                                    renderId: 0,
                                    spans: []
                                };
                                _this.productMaps[shape.pLabel] = map;
                            }
                            _this.normals.set(shapeGeom.normals, iIndex * 2);
                            //switch spaces and openings off by default 
                            var state = map.type == typeEnum.IFCSPACE || map.type == typeEnum.IFCOPENINGELEMENT
                                ? stateEnum.HIDDEN
                                : 0xFF; //0xFF is for the default state
                            //fix indices to right absolute position. It is relative to the shape.
                            for (var i = 0; i < shapeGeom.indices.length; i++) {
                                _this.indices[iIndex] = shapeGeom.indices[i] + iVertex / 3;
                                _this.products[iIndex] = map.renderId;
                                _this.styleIndices[iIndex] = shape.style;
                                _this.states[2 * iIndex] = state; //set state
                                _this.states[2 * iIndex + 1] = 0xFF; //default style
                                var vertex = vec3_1.vec3.create();
                                vertex[0] = shapeGeom.vertices[3 * shapeGeom.indices[i]];
                                vertex[1] = shapeGeom.vertices[3 * shapeGeom.indices[i] + 1];
                                vertex[2] = shapeGeom.vertices[3 * shapeGeom.indices[i] + 2];
                                var transformedVertex = vec3_1.vec3.transformMat4(vec3_1.vec3.create(), vertex, shape.transformation);
                                if (map.type === typeEnum.IFCSLAB) {
                                    transformedVertex[2] += _this.meter * 0.02;
                                }
                                else if (map.type === typeEnum.IFCWALL || map.type === typeEnum.IFCWALLSTANDARDCASE || map.type === typeEnum.IFCWALLELEMENTEDCASE) {
                                    var offsetRatio = _this.meter * 0.004;
                                    var normal = _this.getNormal(_this.normals[2 * iIndex], _this.normals[(2 * iIndex) + 1]);
                                    transformedVertex[0] += normal[0] * offsetRatio;
                                    transformedVertex[1] += normal[1] * offsetRatio;
                                    transformedVertex[2] += normal[2] * offsetRatio;
                                }
                                _this.vertices[3 * iIndex] = transformedVertex[0];
                                _this.vertices[3 * iIndex + 1] = transformedVertex[1];
                                _this.vertices[3 * iIndex + 2] = transformedVertex[2];
                                iIndex++;
                            }
                            var end = iIndex;
                            map.spans.push(new Int32Array([begin, end]));
                            if (shape.transparent)
                                iIndexBackward -= shapeGeom.indices.length;
                            else
                                iIndexForward += shapeGeom.indices.length;
                        }, this);
                        //keep track of amount so that we can fix indices to right position
                        //this must be the last step to have correct iVertex number above
                        iVertex += shapeGeom.vertices.length;
                        shapeGeom = null;
                        _a.label = 4;
                    case 4:
                        iShape++;
                        return [3 /*break*/, 1];
                    case 5:
                        //binary reader should be at the end by now
                        if (!br.isEOF()) {
                            //throw 'Binary reader is not at the end of the file.';
                        }
                        this.transparentIndex = iIndexForward;
                        console.timeEnd('parse');
                        return [2 /*return*/];
                }
            });
        });
    };
    //Source has to be either URL of wexBIM file or Blob representing wexBIM file
    ModelGeometry.prototype.load = function (source) {
        //binary reading
        var br = new binary_reader_1.BinaryReader();
        var self = this;
        br.onloaded = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, self.parse(br)];
                        case 1:
                            _a.sent();
                            if (self.onloaded) {
                                self.onloaded(this);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        br.onerror = function (msg) {
            if (self.onerror)
                self.onerror(msg);
        };
        br.load(source);
    };
    return ModelGeometry;
}());
exports.ModelGeometry = ModelGeometry;
var ProductMap = /** @class */ (function () {
    function ProductMap() {
    }
    return ProductMap;
}());
exports.ProductMap = ProductMap;
var Region = /** @class */ (function () {
    function Region(region) {
        this.population = -1;
        this.centre = null;
        this.bbox = null;
        if (region) {
            this.population = region.population;
            this.centre = new Float32Array(region.centre);
            this.bbox = new Float32Array(region.bbox);
        }
    }
    /**
     * Returns clone of this region
     */
    Region.prototype.clone = function () {
        var clone = new Region();
        clone.population = this.population;
        clone.centre = new Float32Array(this.centre);
        clone.bbox = new Float32Array(this.bbox);
        return clone;
    };
    /**
     * Returns new region which is a merge of this region and the argument
     * @param region region to be merged
     */
    Region.prototype.merge = function (region) {
        //if this is a new empty region, return clone of the argument
        if (this.population === -1 && this.centre === null && this.bbox === null)
            return new Region(region);
        var out = new Region();
        out.population = this.population + region.population;
        var x = Math.min(this.bbox[0], region.bbox[0]);
        var y = Math.min(this.bbox[1], region.bbox[1]);
        var z = Math.min(this.bbox[2], region.bbox[2]);
        var x2 = Math.min(this.bbox[0] + this.bbox[3], region.bbox[0] + region.bbox[3]);
        var y2 = Math.min(this.bbox[1] + this.bbox[4], region.bbox[1] + region.bbox[4]);
        var z2 = Math.min(this.bbox[2] + this.bbox[5], region.bbox[2] + region.bbox[5]);
        var sx = x2 - x;
        var sy = y2 - y;
        var sz = z2 - z;
        var cx = (x + x2) / 2.0;
        var cy = (y + y2) / 2.0;
        var cz = (z + z2) / 2.0;
        out.bbox = new Float32Array([x, y, z, sx, sy, sz]);
        out.centre = new Float32Array([cx, cy, cz]);
        return out;
    };
    return Region;
}());
exports.Region = Region;
//# sourceMappingURL=model-geometry.js.map