/**
 * You can use this type when you want to describe an object that
 * might contain x, y or z number components. A receiving function
 * will likely default the values to zero if the object passed is
 * missing one or more of the components. This is a useful type when
 * describing something that *might* have 1d, 2d or 3d co-ordinates,
 * or none at all.
 */
export interface IgePointLike {
    x?: number;
    y?: number;
    z?: number;
}
