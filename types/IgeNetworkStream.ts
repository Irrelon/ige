// In the form of:
// classId
// entityId
// parentId
// transformData
// createData
export type IgeStreamCreateMessageData = [string, string, string, any, any];

// serverTime
// entityId
export type IgeStreamDestroyMessageData = [number, string];

export type IgeStreamUpdateMessageData = [number, ...any];