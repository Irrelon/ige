export interface JumpGateDefinition {
	_id: string;
	name: string;
	classId: string;
	visible: boolean;
	position: number[];
	public: {
		texture: string;
	};
	destination: {
		_id: string;
		name: string;
	};
}
