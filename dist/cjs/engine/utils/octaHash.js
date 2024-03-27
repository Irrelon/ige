"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = exports.decode = void 0;
const decode = (hash) => {
    let extents = [-1, -1, -1, 1, 1, 1];
    for (let i = 0; i < hash.length; i++) {
        const quadrant = hash[i];
        const [x1, y1, z1, x2, y2, z2] = extents;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const midZ = (z1 + z2) / 2;
        switch (quadrant) {
            case "A":
                extents = [x1, y1, z1, midX, midY, midZ];
                break;
            case "B":
                extents = [midX, y1, z1, x2, midY, midZ];
                break;
            case "C":
                extents = [x1, midY, z1, midX, y2, midZ];
                break;
            case "D":
                extents = [midX, midY, z1, x2, y2, midZ];
                break;
            case "E":
                extents = [x1, y1, midZ, midX, midY, z2];
                break;
            case "F":
                extents = [midX, y1, midZ, x2, midY, z2];
                break;
            case "G":
                extents = [x1, midY, midZ, midX, y2, z2];
                break;
            case "H":
                extents = [midX, midY, midZ, x2, y2, z2];
                break;
            default:
                throw new Error("Invalid quadrant identifier");
        }
    }
    return extents;
};
exports.decode = decode;
const encode = ([x1, y1, z1], level = 1) => {
    let hash = "";
    const currentVolume = [-1, -1, -1, 1, 1, 1];
    for (let letter = 0; letter < level; letter++) {
        const currentQuadMidX = (currentVolume[0] + currentVolume[3]) / 2;
        const currentQuadMidY = (currentVolume[1] + currentVolume[4]) / 2;
        const currentQuadMidZ = (currentVolume[2] + currentVolume[5]) / 2;
        // 0 = x1
        // 1 = y1
        // 2 = z1
        // 3 = x2
        // 4 = y2
        // 5 = z2
        if (x1 < currentQuadMidX) { // AECG
            if (y1 < currentQuadMidY) { // AE
                if (z1 < currentQuadMidZ) { // A
                    //currentVolume[0] = -1;
                    //currentVolume[1] = -1;
                    //currentVolume[2] = -1;
                    currentVolume[3] = currentQuadMidX;
                    currentVolume[4] = currentQuadMidY;
                    currentVolume[5] = currentQuadMidZ;
                    // X2, Y2, Z2
                    hash += "A";
                }
                else { // E
                    //currentVolume[0] = -1;
                    //currentVolume[1] = -1;
                    //currentVolume[5] = 1;
                    currentVolume[3] = currentQuadMidX;
                    currentVolume[4] = currentQuadMidY;
                    currentVolume[2] = currentQuadMidZ;
                    // X2, Y2, Z1
                    hash += "E";
                }
            }
            else { // CG
                if (z1 < currentQuadMidZ) {
                    //currentVolume[0] = -1;
                    //currentVolume[2] = -1;
                    //currentVolume[4] = 1;
                    currentVolume[3] = currentQuadMidX;
                    currentVolume[1] = currentQuadMidY;
                    currentVolume[5] = currentQuadMidZ;
                    // X2, Y1, Z2
                    hash += "C";
                }
                else {
                    //currentVolume[0] = -1;
                    //currentVolume[4] = 1;
                    //currentVolume[5] = 1;
                    currentVolume[3] = currentQuadMidX;
                    currentVolume[4] = currentQuadMidY;
                    currentVolume[2] = currentQuadMidZ;
                    // X2, Y2, Z1
                    hash += "G";
                }
            }
        }
        else { // BFDH
            if (y1 < currentQuadMidY) {
                if (z1 < currentQuadMidZ) {
                    //currentVolume[1] = -1;
                    //currentVolume[2] = -1;
                    //currentVolume[3] = 1;
                    currentVolume[0] = currentQuadMidX;
                    currentVolume[4] = currentQuadMidY;
                    currentVolume[5] = currentQuadMidZ;
                    // X1, Y2, Z2
                    hash += "B";
                }
                else {
                    //currentVolume[1] = -1;
                    //currentVolume[3] = 1;
                    currentVolume[0] = currentQuadMidX;
                    currentVolume[4] = currentQuadMidY;
                    currentVolume[2] = currentQuadMidZ;
                    //currentVolume[5] = 1;
                    // X1, Y2, Z1
                    hash += "F";
                }
            }
            else {
                if (z1 < currentQuadMidZ) {
                    //currentVolume[2] = -1;
                    //currentVolume[3] = 1;
                    //currentVolume[4] = 1;
                    currentVolume[0] = currentQuadMidX;
                    currentVolume[1] = currentQuadMidY;
                    currentVolume[5] = currentQuadMidZ;
                    hash += "D";
                }
                else {
                    currentVolume[0] = currentQuadMidX;
                    currentVolume[1] = currentQuadMidY;
                    currentVolume[2] = currentQuadMidZ;
                    //currentVolume[3] = 1;
                    //currentVolume[4] = 1;
                    //currentVolume[5] = 1;
                    // X1, Y1, Z1
                    hash += "H";
                }
            }
        }
    }
    return hash;
};
exports.encode = encode;
