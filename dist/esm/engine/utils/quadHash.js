export const hashToExtents = (hash) => {
    let extents = [-1, -1, 1, 1];
    for (let i = 0; i < hash.length; i++) {
        const quadrant = hash[i];
        const [x1, y1, x2, y2] = extents;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        switch (quadrant) {
            case "A":
                extents = [x1, y1, midX, midY];
                break;
            case "B":
                extents = [midX, y1, x2, midY];
                break;
            case "C":
                extents = [x1, midY, midX, y2];
                break;
            case "D":
                extents = [midX, midY, x2, y2];
                break;
            default:
                throw new Error("Invalid quadrant identifier");
        }
    }
    return extents;
};
export const extentsToHash = ([x1, y1, x2, y2], level = 1) => {
    let hash = "";
    const currentQuad = [-1, -1, 1, 1];
    for (let letter = 0; letter < level; letter++) {
        const currentQuadMidX = (currentQuad[0] + currentQuad[2]) / 2;
        const currentQuadMidY = (currentQuad[1] + currentQuad[3]) / 2;
        if (x1 < currentQuadMidX) {
            if (y1 < currentQuadMidY) {
                currentQuad[2] = currentQuadMidX;
                currentQuad[3] = currentQuadMidY;
                hash += "A";
            }
            else {
                currentQuad[2] = currentQuadMidX;
                currentQuad[1] = currentQuadMidY;
                hash += "C";
            }
        }
        else {
            if (y1 < currentQuadMidY) {
                currentQuad[0] = currentQuadMidX;
                currentQuad[3] = currentQuadMidY;
                hash += "B";
            }
            else {
                currentQuad[0] = currentQuadMidX;
                currentQuad[1] = currentQuadMidY;
                hash += "D";
            }
        }
    }
    return hash;
};
