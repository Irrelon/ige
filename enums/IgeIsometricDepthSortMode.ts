export enum IgeIsometricDepthSortMode {
	"bounds3d", // Slowest but most accurate
	"cuboid", // Medium speed but best for 3d bounds that are as close to a cube as possible
	"cube", // Fastest but only accurate when 3d bounds are cubes
	"none" // No depth sorting applied
}
