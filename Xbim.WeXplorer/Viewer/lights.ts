export class AmbientLight {
    color: Float32Array;
    diffuse: number;
}

export class DirectionalLight {
    color: Float32Array;
    diffuse: number;
    specular: number;

    pitch: number;
    yaw: number;
    updateShadow: boolean;
}
