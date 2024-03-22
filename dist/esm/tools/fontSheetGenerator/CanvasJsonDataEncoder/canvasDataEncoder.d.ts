declare namespace canvasDataEncoder {
    export { encode };
    export { decode };
}
declare function encode(canvas: any, x: any, y: any, maxX: any, data: any): number;
declare function decode(canvas: any, x: any, y: any, maxX: any): any;
