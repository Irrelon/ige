import { IgeUiEntity } from "@/engine/core/IgeUiEntity";

export const Scene = () => {
	return <IgeUiEntity left={10} bottom={10} width={200} height={50}>
		<IgeEntity texture="fairy" />
	</IgeUiEntity>;
}
