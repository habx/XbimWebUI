rem Generate JS file containing all shaders as a TypeScript strings. Shaders are authored in *.c files which makes it easier for development and it has partially right syntax highlighting
Utilities\spacker.exe Viewer\shaders shaders.ts -typescript -min -variable:Shaders
Utilities\spacker.exe Viewer\plugins\NavigationCube navigation-cube-shaders.ts -typescript -min -variable:CubeShaders
Utilities\spacker.exe Viewer\plugins\PulseHighlight pulse-highlight-shaders.ts -typescript -min -variable:PulseShaders

xcopy /y Viewer\browser\xbim-browser.css Build
