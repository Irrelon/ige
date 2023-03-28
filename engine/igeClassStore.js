export const igeClassStore = {};
export const registerClass = (cls) => {
    //console.log(`Registering class ${cls.name}`);
    igeClassStore[cls.name] = cls;
};
