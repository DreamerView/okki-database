const filesToLoad = [
    {path:"./style/bootstrap.css", type:"link"},
    {path:"./javascript/popper.js", type:"script"},
    {path:"./javascript/bootstrap.js", type:"script"},
    {path:"./javascript/interface.js", type:"script"}
];
const loadResource = (filePath, type) => new Promise((resolve, reject) => {
    const element = document.createElement(type);
    if (type === 'script') {
        element.src = filePath;
        element.onload = resolve;
        element.onerror = reject;
        element.defer = true;
        document.body.appendChild(element);
    } else if (type === 'link') {
        element.href = filePath;
        element.rel = 'stylesheet';
        element.onload = resolve;
        element.onerror = reject;
        document.head.appendChild(element);
    }
});


const loadResourcesSequentially = async (resources) => {
    for (const { path, type } of resources) {
        try { await loadResource(path, type); }
        catch (error) { console.error(`Ошибка загрузки ${path}:`, error); }
    }
    console.log('Все ресурсы загружены.');
};
document.addEventListener("DOMContentLoaded", ()=> {
    loadResourcesSequentially(filesToLoad)
        .then(() => {document.body.style.cssText = "opacity: 1; overflow-y:hidden;"})
        .catch((error) => console.log('Произошла ошибка при загрузке ресурсов:', error))
});