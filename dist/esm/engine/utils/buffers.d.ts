/// <reference types="@webgpu/types" />
export declare function packArraysByFormat<ArrayType>(format: number[], ...dataArgs: ArrayType[][]): ArrayType[];
export declare function vertexBufferLayoutByFormat(format: number[]): GPUVertexBufferLayout;
export declare function createTextureFromImage(device: any, image: any): Promise<any[]>;
export declare const bufferRangeData: (bytesPerItem: number, ...numberOfItems: number[]) => {
    byteLength: number;
    length: number;
    ranges: number[][];
};
export declare const getMultipleOf: (targetMultiple: number, currentVal: number) => number;
