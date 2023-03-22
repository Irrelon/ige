import { ige } from "@/engine/instance";
import { IgePoly2d } from "@/engine/core/IgePoly2d";
import { isServer } from "@/engine/clientServer";
import { Ore } from "./Ore";
import { degreesToRadians } from "@/engine/utils";
import { IgeAudioController } from "@/engine/audio";
import { GameEntity, GameEntityPublicGameData } from "./GameEntity";
import { IgeBox2dBodyType } from "@/enums/IgeBox2dBodyType";
import { IgeBox2dFixtureShapeType } from "@/enums/IgeBox2dFixtureShapeType";
import { IgeBox2dFixtureDef } from "@/types/IgeBox2dFixtureDef";
import oreTypes from "../data/oreTypes.json";
const oreTypesTyped = oreTypes as string[];

require("./GameEntity");
require("./Ore");

export class Asteroid extends GameEntity {
	classId = "Asteroid";
	_oreCount: number = 0;
	_ore: Record<string, number> = {};
	_oreTypeCount: number = 0;
	_triangles: IgePoly2d[] = [];

	constructor (publicGameData: GameEntityPublicGameData = {
		state: {},
		module: {},
		ability: {},
		acceptsActionObj: {},
	}) {
		super(publicGameData);

		this.category("asteroid");

		publicGameData.size = publicGameData.size || Math.floor((Math.random() * 40) + 20);
		publicGameData.type = publicGameData.type || Math.round(Math.random() * 7) + 1;
		publicGameData.rotation = Math.round(Math.random() * 360);

		this._publicGameData = publicGameData;

		this._ore = {};

		/* CEXCLUDE */
		if (isServer) {
			// Set the types and quantities of ore in this asteroid
			this._oreCount = 0;
			this._oreTypeCount = Math.round(Math.random() * 3) + 1;

			for (let i = 0; i < this._oreTypeCount; i++) {
				const amount = Math.round(Math.random() * 1000) + 100;
				const tmpOreType = oreTypesTyped[Math.round(Math.random() * (oreTypesTyped.length - 1))];

				this._ore[tmpOreType] = amount;
				this._oreCount += amount;
			}
		}
		/* CEXCLUDE */

		this.layer(1)
			.width(publicGameData.size)
			.height(publicGameData.size);

		if (ige.box2d) {
			const fixDefs: IgeBox2dFixtureDef[] = [];

			// Define the polygon for collision
			const collisionPoly = new IgePoly2d()
				.addPoint(0, -this._bounds2d.y2 * 0.7)
				.addPoint(this._bounds2d.x2 * 0.5, -this._bounds2d.y2 * 0.4)
				.addPoint(this._bounds2d.x2 * 0.6, 0)
				.addPoint(this._bounds2d.x2 * 0.2, this._bounds2d.y2 * 0.5)
				.addPoint(-this._bounds2d.x2 * 0.2, this._bounds2d.y2 * 0.4)
				.addPoint(-this._bounds2d.x2 * 0.5, this._bounds2d.y2 * 0.3)
				.addPoint(-this._bounds2d.x2 * 0.75, this._bounds2d.y2 * 0.25)
				.addPoint(-this._bounds2d.x2 * 0.85, this._bounds2d.y2 * 0.10)
				.addPoint(-this._bounds2d.x2 * 0.65, -this._bounds2d.y2 * 0.15)
				.addPoint(-this._bounds2d.x2 * 0.65, -this._bounds2d.y2 * 0.35)
				.addPoint(-this._bounds2d.x2 * 0.25, -this._bounds2d.y2 * 0.75);

			// Scale the polygon by the box2d scale ratio
			collisionPoly.divide(ige.box2d._scaleRatio);

			// Now convert this polygon into an array of triangles
			this._triangles = collisionPoly.triangulate();

			// Create an array of box2d fixture definitions
			// based on the triangles
			for (let i = 0; i < this._triangles.length; i++) {
				fixDefs.push({
					density: 0.5,
					friction: 0.8,
					restitution: 0.8,
					filter: {
						categoryBits: 0x0002,
						maskBits: 0xffff & ~0x0008
					},
					shape: {
						type: IgeBox2dFixtureShapeType.circle
					}
					/*shape: {
						type: IgeBox2dFixtureShapeType.polygon,
						data: this.triangles[i]
					}*/
				});
			}

			// Create box2d body for this object
			this.box2dBody({
				type: IgeBox2dBodyType.dynamic,
				linearDamping: 0.7,
				angularDamping: 0.2,
				allowSleep: true,
				bullet: false,
				gravitic: true,
				fixedRotation: false,
				fixtures: fixDefs
			});
		}

		this.rotateTo(0, 0, degreesToRadians(publicGameData.rotation));

		if (!isServer) {
			this.texture(ige.textures.get("asteroid" + publicGameData.type));
		}
	}

	streamCreateData () {
		return this._publicGameData;
	}

	ore () {
		return this._ore;
	}

	handleAcceptedAction (actionId: string, tickDelta: number) {

	}

	removeRandomOreType () {
		// TODO check that the ore we picked has any in "stock" on this asteroid
		const oreType = oreTypesTyped[Math.round(Math.random() * (Object.keys(this._ore).length - 1))];

		// Reduce the ore in the asteroid
		this._ore[oreType]--;
		this._oreCount--;

		return oreType;
	}

	applyDamage (val: number) {
		const previousWholeHealth = Math.floor(this._health);

		// Call parent class function
		super.applyDamage(val);

		// Get new health whole number
		const newWholeHealth = Math.floor(this._health);

		// Check if we should spawn any new ore instances
		if (previousWholeHealth - newWholeHealth > 0) {
			// Spawn ore to cover the amount of damage... one ore per damage unit
			this.spawnMinedOre(previousWholeHealth - newWholeHealth);
		}

		return this;
	}

	spawnMinedOre (oreType: number) {
		if (isServer) {
			const ore = new Ore({
				type: oreType
			});

			ore.mount(ige.game.scene.frontScene);

			ore.translateTo(this._translate.x, this._translate.y, 0);
			ore.updateTransform();

			ore.streamMode(1);
		}
	}

	_mouseUp () {
		(ige.audio as IgeAudioController).play("select");
		ige.game.playerEntity.selectTarget(this);

		// Cancel further event propagation
		return true;
	}
}