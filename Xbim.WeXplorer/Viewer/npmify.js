

// Workaround for glMatrix elements being added to "this" and not visible by xViewer in the context of a module
var glMatrix = module.exports.glMatrix
var quat = module.exports.quat

var vec2 = module.exports.vec2
var vec3 = module.exports.vec3
var vec4 = module.exports.vec4

var mat2 = module.exports.mat2
var mat2d = module.exports.mat2d
var mat3 = module.exports.mat3
var mat4 = module.exports.mat4

module.exports = {
  xViewer: xViewer,
  xState: xState,
  xProductType: xProductType,
}
