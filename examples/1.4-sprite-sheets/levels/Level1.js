import { ige } from "../../../engine/instance.js";
import IgeSceneGraph from "../../../engine/core/IgeSceneGraph.js";
import IgeEntity from "../../../engine/core/IgeEntity.js";
import IgeAnimationComponent from "../../../engine/components/IgeAnimationComponent.js";
export class Level1 extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "Level1";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = ige.$('baseScene');
        new IgeEntity()
            .id('sprite1')
            .depth(1)
            // Assign the sprite sheet texture to the entity
            .texture(ige.textures.get("sci-fi-tiles1"))
            // Assign cell 1 as the entity's texture cell
            .cell(1)
            // Apply the dimensions from the cell to the entity
            // so that the entity's width and height now match that
            // of the cell being used
            .dimensionsFromCell()
            .translateTo(0, -100, 0)
            .mount(baseScene);
        new IgeEntity()
            .id('sprite2')
            .depth(1)
            // Assign the sprite sheet texture to the entity.
            // Notice we are using the gameTexture[1] instead of the
            // gameTexture[0] as in the entity above. This allows us
            // to use the cell ids that were defined via the
            // IgeSpriteSheet definition on line 20 using cellById()
            // instead of specifying the cell index via cell()
            .texture(ige.textures.get("sci-fi-tiles2"))
            // Assign cell by id "panel" as the entity's texture cell
            // this is possible using the cellById() method which reads
            // the assigned cell ids from the texture definition and
            // then maps it to the cell index that it corresponds to
            .cellById('panel')
            // Apply the dimensions from the cell to the entity
            // so that the entity's width and height now match that
            // of the cell being used
            .dimensionsFromCell()
            .translateTo(100, -100, 0)
            .mount(baseScene);
        // Create one more entity and animate between the table and
        // panel cells using cell ids in the animation, this tests
        // that cell-id based frames will animate correctly
        new IgeEntity()
            .id('sprite3')
            .addComponent("animation", IgeAnimationComponent)
            .depth(1)
            // Assign the sprite sheet texture to the entity.
            // Notice we are using the gameTexture[1] instead of the
            // gameTexture[0] as in the entity above. This allows us
            // to use the cell ids that were defined via the
            // IgeSpriteSheet definition on line 20 using cellById()
            // instead of specifying the cell index via cell()
            .texture(ige.textures.get("sci-fi-tiles2"))
            // Assign cell by id "panel" as the entity's texture cell
            // this is possible using the cellById() method which reads
            // the assigned cell ids from the texture definition and
            // then maps it to the cell index that it corresponds to
            .cellById('panel')
            // Apply the dimensions from the cell to the entity
            // so that the entity's width and height now match that
            // of the cell being used
            .dimensionsFromCell()
            .translateTo(100, 0, 0)
            .components.animation.define('test', ['panel', 'table', null], 1, -1, true)
            .components.animation.select('test')
            .mount(baseScene);
        // Create a new separate texture from the cell of one of the sprite sheets!
        const sciFiTiles3 = ige.textures.get("sci-fi-tiles2").textureFromCell('panel');
        const shrubbery = ige.textures.get("shrubbery");
        // Create another entity using the new texture
        new IgeEntity()
            .id('sprite4')
            .texture(sciFiTiles3)
            .dimensionsFromTexture()
            .translateTo(-100, 0, 0)
            .mount(baseScene);
        let xAdj = 0;
        for (let i = 1; i < shrubbery.cellCount(); i++) {
            if (i > 1) {
                xAdj += shrubbery._cells[i][2] / 2;
            }
            new IgeEntity()
                .texture(shrubbery)
                .cell(i)
                .dimensionsFromCell()
                .translateTo(0 + xAdj, 180, 0)
                .mount(baseScene);
            xAdj += (shrubbery._cells[i][2] / 2) + 5;
        }
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Since all our objects in addGraph() were mounted to the
        // 'scene1' entity, destroying it will remove everything we
        // added to it.
        ige.$("scene1").destroy();
    }
}
