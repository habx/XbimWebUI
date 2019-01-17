const xBimViewer = require('./Build/xbim-viewer.module.js')
const xNavigationHome = require('./Build/xbim-navigation-home.module.js')
const xNavigationCube = require('./Build/xbim-navigation-cube.module.js')
const xPulseHighlight = require('./Build/xbim-pulse-highlight.module.js')

module.exports = {
  xViewer: xBimViewer.xViewer,
  xState: xBimViewer.xState,
  xProductType: xBimViewer.xProductType,
  xPulseHighlight: xPulseHighlight,
  xNavigationCube: xNavigationCube,
  xNavigationHome: xNavigationHome,
  xRayPicking: xRayPicking,
}
