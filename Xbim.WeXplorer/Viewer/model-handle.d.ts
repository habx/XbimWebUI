import { ModelGeometry, ProductMap, Region } from "./model-geometry";
import { State } from "./state";
import { ModelPointers } from "./viewer";
export declare class ModelHandle {
    private _gl;
    model: ModelGeometry;
    id: number;
    stopped: boolean;
    pickable: boolean;
    private _numberOfIndices;
    private _vertexTextureSize;
    private _matrixTextureSize;
    private _styleTextureSize;
    private _styleTexture;
    private _vertexBuffer;
    private _normalBuffer;
    private _productBuffer;
    private _styleBuffer;
    private _stateBuffer;
    private _feedCompleted;
    region: Region;
    constructor(gl: any, model: ModelGeometry);
    /**
     * Static counter to keep unique ID of the model handles
     */
    private static _instancesNum;
    setActive(pointers: ModelPointers): void;
    draw(mode?: 'solid' | 'transparent'): void;
    drawProduct(id: number): void;
    getProductId(renderId: number): number;
    getProductMap(id: number): ProductMap;
    getProductMaps(ids: number[]): ProductMap[];
    unload(): void;
    feedGPU(): void;
    private bufferData;
    static bufferTexture(gl: WebGLRenderingContext, pointer: WebGLTexture, data: any, numberOfComponents?: number): number;
    getState(id: number): State;
    getStyle(id: number): number;
    setState(state: State, args: number | number[]): void;
    resetStates(): void;
    resetStyles(): void;
    getProductsOfType(typeId: number): number[];
    getModelState(): Array<Array<number>>;
    restoreModelState(state: Array<Array<number>>): void;
}
