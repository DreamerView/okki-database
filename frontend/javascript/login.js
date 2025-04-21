window.addEventListener("load",()=>{
    const {ipcRenderer} = require('electron');
    const $ = selector => document.querySelector(selector);
    $("form#mysql_form").addEventListener("submit",(event)=>{
        event.preventDefault();
        const host = $("input#mysql_host").value,
            user = $("input#mysql_user").value,
            password = $("input#mysql_password").value,
            database = $("input#mysql_database").value,
            login = JSON.stringify({"host":host,"user":user,"password":password,"database":database});
        ipcRenderer.send("mysql-login",login);
    });
    ipcRenderer.on("mysql-login-error",(event,arg)=>{
        $("p#mysql-login-error").innerHTML = arg;
        var myModal = new bootstrap.Modal(document.getElementById('exampleModal'))
        myModal.show()
    })
})