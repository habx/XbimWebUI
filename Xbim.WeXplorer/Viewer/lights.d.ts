export declare class AmbientLight {
    color: Float32Array;
    diffuse: number;
}
export declare class DirectionalLight {
    color: Float32Array;
    diffuse: number;
    specular: number;
    pitch: number;
    yaw: number;
    updateShadow: boolean;
}
