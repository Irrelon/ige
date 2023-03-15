// In the form of:
// classId
// entityId
// parentId
// transformData
// layerData
// depthData
// createData
export type IgeStreamCreateMessageData = [string, string, string, any, any, any | undefined];

// serverTime
// entityId
export type IgeStreamDestroyMessageData = [number, string];

export type IgeStreamUpdateMessageData = [number, ...any];
