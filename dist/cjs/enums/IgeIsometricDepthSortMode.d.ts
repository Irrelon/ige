export declare enum IgeIsometricDepthSortMode {
    "bounds3d" = 0,// Slowest but most accurate
    "cuboid" = 1,// Medium speed but best for 3d bounds that are as close to a cube as possible
    "cube" = 2,// Fastest but only accurate when 3d bounds are cubes
    "none" = 3
}
