export const igeClassStore = {};
export const registerClass = (cls) => {
    console.log("Registering class");
    igeClassStore[cls.name] = cls;
};
