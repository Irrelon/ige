declare namespace modelTurret {
    export namespace metadata {
        const formatVersion: number;
        const generatedBy: string;
        const vertices: number;
        const faces: number;
        const normals: number;
        const colors: number;
        const uvs: number[];
        const materials: number;
        const morphTargets: number;
        const bones: number;
    }
    export const scale: number;
    const materials_1: {
        DbgColor: number;
        DbgIndex: number;
        DbgName: string;
        blending: string;
        colorAmbient: number[];
        colorDiffuse: number[];
        colorSpecular: number[];
        depthTest: boolean;
        depthWrite: boolean;
        mapDiffuse: string;
        mapDiffuseWrap: string[];
        shading: string;
        specularCoef: number;
        transparency: number;
        transparent: boolean;
        vertexColors: boolean;
    }[];
    export { materials_1 as materials };
    const vertices_1: number[];
    export { vertices_1 as vertices };
    const morphTargets_1: never[];
    export { morphTargets_1 as morphTargets };
    const normals_1: number[];
    export { normals_1 as normals };
    const colors_1: never[];
    export { colors_1 as colors };
    const uvs_1: number[][];
    export { uvs_1 as uvs };
    const faces_1: number[];
    export { faces_1 as faces };
    const bones_1: never[];
    export { bones_1 as bones };
    export const skinIndices: never[];
    export const skinWeights: never[];
    export const animation: {};
}
