import { registerClass } from "@/engine/igeClassStore";
import { Flag } from "./base/Flag";

export class FlagBuilding extends Flag {
	classId = "FlagBuilding";
}

registerClass(FlagBuilding);
