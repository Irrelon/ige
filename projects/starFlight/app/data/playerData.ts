export interface PlayerDataInventory {
	type: string;
	meta: Record<string, any>;
}

export interface PlayerDataModule {
	_id: string;
	moduleId: string;
	abilityId?: string | number;
}

export interface PlayerData {
	inventory: PlayerDataInventory[];
	modules: PlayerDataModule[];
}

export const playerData: PlayerData = {
	"inventory": [{
		"type": "ore",
		"meta": {
			"type": "Platinum"
		}
	}],
	"modules": [
		{
			"_id": "1",
			"moduleId": "521a36aa3559382638c4254a",
			"abilityId": 1
		},
		{
			"_id": "2",
			"moduleId": "521a36aa3559382638c4254b"
		},
		{
			"_id": "3",
			"moduleId": "521a36aa3559382638c4254c"
		},
		{
			"_id": "4",
			"moduleId": "521a36aa3559382638c4254d"
		},
		{
			"_id": "5",
			"moduleId": "521a36aa3559382638c4254e"
		},
		{
			"_id": "6",
			"moduleId": "521a36aa3559382638c4254f"
		},
		{
			"_id": "7",
			"moduleId": "521a36aa3559382638c4254g",
			"abilityId": 2
		},
		{
			"_id": "8",
			"moduleId": "521a36aa3559382638c4254h"
		}
	]
}
