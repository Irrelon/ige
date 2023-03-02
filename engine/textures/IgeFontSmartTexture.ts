import { IgeSmartTexture } from "../../types/IgeSmartTexture";
import IgeEntity from "../core/IgeEntity";

/**
 * Provides native canvas font rendering supporting multi-line
 * text and alignment options.
 */
const measureTextWidth = (text: string, entity: IgeEntity) => {
    if (!entity._nativeFont) {
        return -1;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let lineArr;
    let lineIndex;
    let measuredWidth;
    let maxWidth = 0;

    // Handle multi-line text
    if (text.indexOf("\n") > -1) {
        // Split each line into an array item
        lineArr = text.split("\n");
    } else {
        // Store the text as a single line
        lineArr = [text];
    }

    ctx.font = entity._nativeFont;
    ctx.textBaseline = "middle";

    if (entity._nativeStroke) {
        ctx.lineWidth = entity._nativeStroke;

        if (entity._nativeStrokeColor) {
            ctx.strokeStyle = entity._nativeStrokeColor;
        } else {
            ctx.strokeStyle = entity._colorOverlay;
        }
    }

    for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
        // Measure text
        measuredWidth = ctx.measureText(lineArr[lineIndex]).width;

        if (measuredWidth > maxWidth) {
            maxWidth = measuredWidth;
        }
    }

    return maxWidth;
};

const IgeFontSmartTexture: IgeSmartTexture = {
    render: (ige, ctx, entity) => {
        if (!entity._nativeFont || !entity._renderText) {
            return;
        }

        const text = entity._renderText;

        let lineArr;
        let textSize;
        let renderStartY;
        let renderY;
        let lineHeight;

        ctx.font = entity._nativeFont;

        if (entity._colorOverlay) {
            ctx.fillStyle = entity._colorOverlay;
        }

        if (entity._textAlignX === 0) {
            ctx.textAlign = "left";
            ctx.translate(-entity._bounds2d.x2, 0);
        }

        if (entity._textAlignX === 1) {
            ctx.textAlign = "center";
        }

        if (entity._textAlignX === 2) {
            ctx.textAlign = "right";
            ctx.translate(entity._bounds2d.x2, 0);
        }

        if (entity._nativeStroke) {
            ctx.lineWidth = entity._nativeStroke;

            if (entity._nativeStrokeColor) {
                ctx.strokeStyle = entity._nativeStrokeColor;
            } else {
                ctx.strokeStyle = entity._colorOverlay;
            }
        }

        if (text.indexOf("\n") > -1) {
            // Split each line into an array item
            lineArr = text.split("\n");
        } else {
            // Store the text as a single line
            lineArr = [text];
        }

        if (entity._textAlignY === 0) {
            ctx.textBaseline = "top";
            renderStartY = -(entity._bounds2d.y / 2);
        }

        if (entity._textAlignY === 1) {
            ctx.textBaseline = "middle";
            renderStartY = -(entity._textLineSpacing / 2) * (lineArr.length - 1);
        }

        if (entity._textAlignY === 2) {
            ctx.textBaseline = "bottom";
            renderStartY = entity._bounds2d.y / 2 - entity._textLineSpacing * (lineArr.length - 1);
        }

        if (entity._textAlignY === 3) {
            ctx.textBaseline = "middle";
            lineHeight = Math.floor(entity._bounds2d.y / lineArr.length);
            renderStartY = -((lineHeight + entity._textLineSpacing) / 2) * (lineArr.length - 1);
        }

        for (let lineArrIndex = 0; lineArrIndex < lineArr.length; lineArrIndex++) {
            const lineArrItem = lineArr[lineArrIndex];

            if (entity._textAlignY === 3) {
                renderY = renderStartY + lineHeight * lineArrIndex + entity._textLineSpacing * lineArrIndex;
            } else {
                renderY = renderStartY + entity._textLineSpacing * lineArrIndex;
            }

            // Measure text
            textSize = ctx.measureText(lineArrItem);

            // Check if we should stroke the text too
            if (entity._nativeStroke) {
                ctx.strokeText(lineArrItem, 0, renderY);
            }

            // Draw text
            ctx.fillText(lineArrItem, 0, renderY);
        }
    }
};

export default IgeFontSmartTexture;
