const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const { ipcRenderer } = require("electron");
const isValidSQLiteName = (name) => {
    // Регулярное выражение для проверки имени таблицы или столбца SQLite
    const regex = /^[\p{L}_][\p{L}\p{N}_]*$/u;
    return regex.test(name);
}



function mysqlConnect(event) {
    event.preventDefault();
    // Получаем данные из формы
    const host = $('#mysql_host').value;
    const port = $('#mysql_port').value;
    const username = $('#mysql_username').value;
    const password = $('#mysql_password').value;
    const database = $('#mysql_database').value;
    
    // Создаем строку подключения
    const connectionString = `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    
    // Отправляем данные на main process через ipcRenderer
    ipcRenderer.send('mysql-connect', connectionString);
    modalHide("mysqlModal");
}
const decodeUtf8FromBase64 = (base64String) => {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const utf8Decoder = new TextDecoder('utf-8');
    return utf8Decoder.decode(bytes);
}

const hideWindow = () => {
    ipcRenderer.send("hide-window");
}

const closeWindow = () => {
    ipcRenderer.send("close-window");
}

const maxWindow = () => {
    ipcRenderer.send("toggle-maximize");
}

function splitCamelCase(str) {
    const s = str.replace(/([A-ZА-Я])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase()).toLowerCase();
    return s[0].toUpperCase() + s.slice(1);
}

const removeDatabase = (data) => {
    ipcRenderer.send("remove-database",String(data));
}

let hideTableVar = false;

const hideTable = () => {
    hideTableVar = !hideTableVar;
    $('#all-table').style.cssText = hideTableVar===true?"display:none;":"display:flex;";
} 

const exportCSV = (table) => {
    const result = JSON.stringify({
        type: "csv",
        table: table
    });
    ipcRenderer.send("export-table", result)
}

const exportExcel = (table) => {
    const result = JSON.stringify({
        type: "excel",
        table: table
    });
    ipcRenderer.send("export-table", result)
}

const exportWord = (table) => {
    const result = JSON.stringify({
        type: "word",
        table: table
    });
    ipcRenderer.send("export-table", result)
}

const tableUpdateHandler = (db) => {
    ipcRenderer.send('table-update');
}

const tableHandler = (event) => {
    ipcRenderer.send("select-table", String(event));
};
const dropTableHandler = (event) => {
    ipcRenderer.send("delete-table", String(event));
    modalHide("dropDatabaseModal");
};
const deleteDataHandler = (table, pk, data) => {
    const result = JSON.stringify({
        table: table,
        pk: pk,
        where: data
    })
    ipcRenderer.send("delete-data", result);
};
const databaseHandler = (event) => {
    ipcRenderer.send("change-database", String(event));
};

const modalHide = (event) => {
    const truck_modal = $('#' + event);
    const modal = bootstrap.Modal.getInstance(truck_modal);
    modal.hide();
};
const deleteColumn = (event) => {
    $("#" + event).innerHTML = "";
};
const createTableProcess = () => {
    const formData = []; // Массив для хранения значений формы в формате [{key: value}]

    $$("tr.columnDisplay").forEach((col) => {
        const formObject = {};
        col.querySelectorAll('input, textarea, select').forEach(input => {
            const name = input.name;
            let value = input.value;
            if (input.type === 'radio' && input.checked) {
                value = 'primary'; // Устанавливаем значение 'Primary key'
            }
            formObject[name] = value;
            // Создаем объект {key: value} и добавляем его в массив formData
        })
        formData.push(formObject);
    });
    const tableName = $("input#create-table-name").value;
    if (tableName === "" || isValidSQLiteName(tableName) === false) return "";
    formData.forEach(item => {
        if (item.table_name === "" || isValidSQLiteName(item.table_name) === false) throw new Error("Table name is empty in" + JSON.stringify(item));
    });
    const result = JSON.stringify({
        name: tableName,
        data: formData
    });
    ipcRenderer.send("create-table", result);
}
const columnRender = () => {
    const uuid = new Date().getTime();
    return (`
            <tr class="columnDisplay" id="column_${uuid}">
                <th scope="row"><input name="table_name" type="text" class="form-control" placeholder="Enter name"></th>
                    <td>
                        <select name="table_type" class="form-select">
                            <optgroup label="Integer">
                                <option value="INT">INT</option>
                                <option value="INTEGER">INTEGER</option>
                                <option value="TINYINT">TINYINT</option>
                                <option value="SMALLINT">SMALLINT</option>
                                <option value="MEDIUMINT">MEDIUMINT</option>
                                <option value="BIGINT">BIGINT</option>
                                <option value="UNSIGNED BIG INT">UNSIGNED BIG INT</option>
                                <option value="INT2">INT2</option>
                                <option value="INT8">INT8</option>
                            </optgroup>
                            <optgroup label="Text">
                                <option value="CHARACTER">CHARACTER</option>
                                <option value="VARCHAR">VARCHAR</option>
                                <option value="VARYING CHARACTER">VARYING CHARACTER</option>
                                <option value="NCHAR">NCHAR</option>
                                <option value="NATIVE CHARACTER">NATIVE CHARACTER</option>
                                <option value="NVARCHAR">NVARCHAR</option>
                                <option value="TEXT">TEXT</option>
                                <option value="CLOB">CLOB</option>
                            </optgroup>
                            <optgroup label="Blob">
                                <option value="BLOB">BLOB</option>
                            </optgroup>
                            <optgroup label="REAL">
                                <option value="REAL">REAL</option>
                                <option value="DOUBLE">DOUBLE</option>
                                <option value="DOUBLE PRECISION">DOUBLE PRECISION</option>
                                <option value="FLOAT">FLOAT</option>
                            </optgroup>
                            <optgroup label="Numeric">
                                <option value="NUMERIC">NUMERIC</option>
                                <option value="DECIMAL">DECIMAL</option>
                                <option value="BOOLEAN">BOOLEAN</option>
                                <option value="DATE">DATE</option>
                                <option value="DATETIME">DATETIME</option>
                            </optgroup>
                        </select>
                    </td>
                    <td><input name="table_length" type="number" class="form-control" placeholder="Length"></td>
                    <td>
                        <select name="table_default" class="form-select">
                            <option value=" "> </option>
                            <option value="NULL">NULL</option>
                            <option value="NULL">NOT NULL</option>
                            <option value="NULL">UNIQUE</option>
                            <option value="NULL">NOT NULL UNIQUE</option>
                        </select>
                    </td>
                    <td class="" style="text-align: center;vertical-align: middle;">
                            <div class="form-check">
                                <input name="primary-key" class="form-check-input" id="radio_${uuid}" type="radio">
                                <label class="form-check-label" for="radio_${uuid}">
                                    Select
                                </label>
                            </div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-danger" onclick="deleteColumn('column_${uuid}')">Delete</button>
                    </td>
            </tr>`);
};
const addColumn = () => {
    $('tbody#columnEdit').insertAdjacentHTML("beforeend", `${columnRender()}`);
};
const createTable = () => {
    $("div#selected-table").innerHTML = `
        <h1>Create table</h1>
        <div class="mt-5 row align-items-center">
            <div class="col-4">Future table name</div>
            <div class="col-8"><input id="create-table-name" type="text" class="form-control" placeholder="Enter new table name" value=""></div>
        </div>
        <h2 class="mt-5">Column edit</h2>
        <form id="tableCreate">
            <table class="table mt-3">
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Length</th>
                        <th scope="col">Default</th>
                        <th scope="col">Primary key</th>
                        <th scope="col">Action</th>
                    </tr>
                </thead>
                <tbody id="columnEdit">
                    ${columnRender()}
                </tbody>
            </table>
        </form>
        <div class="w-100 d-flex justify-content-center">
            <button onclick="addColumn()" type="button" class="btn text-secondary">+ Add column</button>
        </div>
        <div class="mt-3">
            <button onclick="createTableProcess()" type="button" class="btn btn-lg btn-primary">Create table</button>
        </div>
    `;
}
let keysUpdate = [];
let tableUpdate = ""
const findValueByKey = (obj, key) => {
    for (var objKey in obj) {
        if (objKey === key) {
            return obj[objKey];
        }
    }
    return "";
}
const updateDataHandler = (data, keyTable, valueTable) => {
    const result = JSON.parse(decodeUtf8FromBase64(data));
    console.log(result);
    const updateData = keysUpdate.map(header => {
        const text = header['type'];
        let type = "text";
        const intStrings = ['INT', 'INTEGER', 'TINYINT', "SMALLINT", "MEDIUMINT", "BIGINT", "UNSIGNED BIG INT", "INT2", "INT8", "REAL", "DOUBLE", "DOUBLE PRECISION", "FLOAT", "NUMERIC", "DECIMAL"];
        const textStrings = ["CHARACTER", "VARCHAR", "VARYING CHARACTER", "NCHAR", "NATIVE CHARACTER", "NVARCHAR", "TEXT", "CLOB"];
        const blobStrings = ["BLOB"];
        const booleanStrings = ["BOOLEAN"];
        const dateStrings = ["DATE"];
        const dateTimeStrings = ["DATETIME"];
        const intStringsConsist = intStrings.some(searchStr => text.includes(searchStr));
        const textStringsConsist = textStrings.some(searchStr => text.includes(searchStr));
        const blobStringsConsist = blobStrings.some(searchStr => text.includes(searchStr));
        const booleanStringsConsist = booleanStrings.some(searchStr => text.includes(searchStr));
        const dateStringsConsist = dateStrings.some(searchStr => text.includes(searchStr));
        const dateTimeStringsConsist = dateTimeStrings.some(searchStr => text.includes(searchStr));
        if (intStringsConsist) type = "number";
        if (textStringsConsist) type = "text";
        if (blobStringsConsist) type = "text";
        if (booleanStringsConsist) type = "text";
        if (dateStringsConsist) type = "date";
        if (dateTimeStringsConsist) type = "datetime-local";

        if (header['type'])
            return (`
                <div class="row">
                    <label for="input_${header['name']}" class="col-sm-6 col-form-label">${header['name']}</label>
                    <div class="col-sm-6">
                        <input type="${type}" id="input_${header['name']}" name="${header['name']}" class="form-control bg-body-tertiary border border-dark-subtle" placeholder="Enter value" value="${findValueByKey(result,header['name'])}" required>
                    </div>
                </div>
            `)
    }).join('');
    $("div#updateData").innerHTML = `
        <div class="modal-header">
            <h1 class="modal-title fs-5 text-truncate" id="updateDataModalLabel">Update data to "${splitCamelCase(tableUpdate)}"</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <form id="updateSend">
            <div class="modal-body" id="insertData">
                <div class="d-flex flex-column gap-4">
                    ${updateData}
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn text-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" class="btn btn-primary">Update</button>
            </div>
        </form>
    `;
    const form = $("form#updateSend");
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formElements = form.elements;
        // Создаем объект для хранения пар "name: value"
        let formData = {};

        // Проходимся по всем элементам формы
        for (let i = 0; i < formElements.length; i++) {
            let element = formElements[i];

            // Проверяем, что это элемент с атрибутом "name" и "value"
            if (element.name && element.value) {
                // Добавляем значение в объект formData с ключом равным имени элемента
                formData[element.name] = element.value;
            }
        }
        ipcRenderer.send("update-table", JSON.stringify({
            name: tableUpdate,
            data: formData,
            key: keyTable,
            value: valueTable
        }));
        modalHide("updateDataModal");
    });
}

function generateHTMLTable(name, keys, data, time, pkKeyExists) {
    keysUpdate = keys;
    tableUpdate = name;
    // Insert Data
    const insertData = keys.map(header => {
        const text = header['type'];
        let type = "text";
        const intStrings = ['INT', 'INTEGER', 'TINYINT', "SMALLINT", "MEDIUMINT", "BIGINT", "UNSIGNED BIG INT", "INT2", "INT8", "REAL", "DOUBLE", "DOUBLE PRECISION", "FLOAT", "NUMERIC", "DECIMAL"];
        const textStrings = ["CHARACTER", "VARCHAR", "VARYING CHARACTER", "NCHAR", "NATIVE CHARACTER", "NVARCHAR", "TEXT", "CLOB"];
        const blobStrings = ["BLOB"];
        const booleanStrings = ["BOOLEAN"];
        const dateStrings = ["DATE"];
        const dateTimeStrings = ["DATETIME"];
        const intStringsConsist = intStrings.some(searchStr => text.includes(searchStr));
        const textStringsConsist = textStrings.some(searchStr => text.includes(searchStr));
        const blobStringsConsist = blobStrings.some(searchStr => text.includes(searchStr));
        const booleanStringsConsist = booleanStrings.some(searchStr => text.includes(searchStr));
        const dateStringsConsist = dateStrings.some(searchStr => text.includes(searchStr));
        const dateTimeStringsConsist = dateTimeStrings.some(searchStr => text.includes(searchStr));
        if (intStringsConsist) type = "number";
        if (textStringsConsist) type = "text";
        if (blobStringsConsist) type = "text";
        if (booleanStringsConsist) type = "text";
        if (dateStringsConsist) type = "date";
        if (dateTimeStringsConsist) type = "datetime-local";

        if (header['type'])
            return (`
                <div class="row">
                    <label for="input_${header['name']}" class="col-sm-6 col-form-label">${header['name']}</label>
                    <div class="col-sm-6">
                        <input type="${type}" id="input_${header['name']}" name="${header['name']}" class="form-control bg-body-tertiary border border-dark-subtle" placeholder="Enter value" required>
                    </div>
                </div>
            `)
    }).join('');
    $("div#insertData").innerHTML = `
        <div class="modal-header">
            <h1 class="modal-title fs-5 text-truncate" id="insertDataModalLabel">Insert data to "${splitCamelCase(name)}"</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <form id="insertSend">
            <div class="modal-body" id="insertData">
                <div class="d-flex flex-column gap-4">
                    ${insertData}
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn text-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" class="btn btn-primary">Insert</button>
            </div>
        </form>
    `;
    const form = $("form#insertSend");
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formElements = form.elements;
        // Создаем объект для хранения пар "name: value"
        let formData = {};

        // Проходимся по всем элементам формы
        for (let i = 0; i < formElements.length; i++) {
            let element = formElements[i];

            // Проверяем, что это элемент с атрибутом "name" и "value"
            if (element.name && element.value) {
                // Добавляем значение в объект formData с ключом равным имени элемента
                formData[element.name] = element.value;
            }
        }
        ipcRenderer.send("insert-table", JSON.stringify({
            name: name,
            data: formData
        }));
        modalHide("insertDataModal");
    });
    const dropDatabase = `
        <div class="modal-header">
            <h1 class="modal-title fs-5 text-truncate" id="dropDatabaseModalLabel">Drop database "${splitCamelCase(name)}"</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" id="dropDatabase">
            <p class="text-truncate">Do you confirm to drop database "${splitCamelCase(name)}"</p>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn text-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-danger" onclick="dropTableHandler('${name}')">Drop</button>
        </div>
    `;
    $("div#dropDatabase").innerHTML = dropDatabase;
    const tableRows = data.map(item => {
        var jsonString = JSON.stringify(item);

        // Convert string to UTF-8 encoded byte array
        var utf8Bytes = new TextEncoder().encode(jsonString);

        // Convert UTF-8 byte array to Base64
        var itemRes = btoa(String.fromCharCode.apply(null, utf8Bytes));
        return `<tr>${keys.map((header,index) => `<td style="text-align: center;vertical-align: middle;" class="text-truncate" title="${item[header['name']]}">${item[header['name']]}</td>`).join('')}
                            ${pkKeyExists && pkKeyExists.exist === true ? `<td style="text-align: center;vertical-align: middle;" class="text-truncate" title="Action">
                                <div class="dropdown" style="position:static;">
                                    <button class="btn text-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        ...
                                    </button>
                                    <ul class="dropdown-menu" style="left:auto !important;top:auto !important;">
                                        <li><button data="" class="dropdown-item update" onclick="updateDataHandler('${itemRes}','${pkKeyExists.key}','${item[pkKeyExists['key']]}')" data-bs-toggle="modal" data-bs-target="#updateDataModal">Update</button></li>
                                        <li><button class="dropdown-item" onclick="deleteDataHandler('${name}','${pkKeyExists.key}', '${item[pkKeyExists['key']]}')">Delete</button></li>
                                    </ul>
                                </div>    
                            </td>`:``}
                        </tr>`;
    });

    const tableHTML = `
        <h1 class="fs-2 text-truncate mb-4">Table: <span>${splitCamelCase(name)}</span></h1>
        <p class="mb-4 fw-light">Обновления за: <b>${time}</b></p>
        <div class="mb-3 d-flex flex-wrap gap-2">
            <button class="btn bg-body-tertiary rounded-4" onclick="tableHandler('${name}')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.39462 7.70537C7.12924 6.96718 8.00279 6.38183 8.96495 5.98308C9.927 5.58435 10.9586 5.38013 12 5.38222C14.1028 5.38222 16.1195 6.21757 17.6064 7.70446C19.0933 9.19136 19.9286 11.208 19.9286 13.3107C19.9286 15.4146 19.0936 17.4323 17.607 18.9209C16.1204 20.4095 14.1038 21.2472 12 21.25C9.89625 21.2472 7.87961 20.4095 6.39303 18.9209C4.90645 17.4323 4.07141 15.4146 4.07141 13.3107" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"/>
                    <path d="M7.11928 2.75L6.17085 6.60772C6.08702 6.94965 6.14202 7.31085 6.32371 7.61238C6.5055 7.9139 6.79909 8.13125 7.14066 8.21689L11.009 9.16532" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button class="btn bg-body-tertiary rounded-4" data-bs-toggle="modal" data-bs-target="#dropDatabaseModal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.47058 6.01471V18.5294C5.47058 19.251 5.75721 19.943 6.26742 20.4532C6.77763 20.9634 7.46962 21.25 8.19117 21.25H15.8088C16.5304 21.25 17.2224 20.9634 17.7326 20.4532C18.2428 19.943 18.5294 19.251 18.5294 18.5294V6.01471" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3.29413 6.01471H20.7059" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8.73529 6.01471V4.38235C8.73529 3.94943 8.90727 3.53423 9.2134 3.2281C9.51952 2.92198 9.93472 2.75 10.3676 2.75H13.6323C14.0653 2.75 14.4805 2.92198 14.7866 3.2281C15.0927 3.53423 15.2647 3.94943 15.2647 4.38235V6.01471" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9.82352 16.9915V11.5535" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14.1765 16.9915V11.5535" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button type="button" class="btn bg-body-tertiary rounded-4" data-bs-toggle="modal" data-bs-target="#insertDataModal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4.5V19.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19.5 12H4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="dropdown">
                <button type="button" class="btn bg-body-tertiary rounded-4" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15.2375V3.21252" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"/>
                        <path d="M7.375 10.9941L11.3409 14.96C11.5163 15.1337 11.7532 15.2312 12 15.2312C12.2468 15.2312 12.4837 15.1337 12.6591 14.96L16.625 10.9941" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2.75 13.85V18.475C2.75 19.0883 2.99364 19.6765 3.42732 20.1102C3.86099 20.5438 4.44919 20.7875 5.0625 20.7875H18.9374C19.5508 20.7875 20.139 20.5438 20.5727 20.1102C21.0063 19.6765 21.25 19.0883 21.25 18.475V13.85" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>                
                </button>
                <ul class="dropdown-menu">
                    <li><button type="button" class="dropdown-item" onclick="exportCSV('${name}')">CSV</button></li>
                    <li><button type="button" class="dropdown-item" onclick="exportExcel('${name}')">Microsoft Excel</button></li>
                    <li><button type="button" class="dropdown-item" onclick="exportWord('${name}')">Microsoft Word</button></li>
                </ul>
            </div>
        </div>
        <table class="table table-hover w-100 text-truncate" style="table-layout:fixed;">
            <thead>
                <tr>${keys.map(header => `<th style="text-align: center;vertical-align: middle;" class="text-truncate" title="${header['name']}">${header['name']}</th>`).join('')}
                    ${pkKeyExists && pkKeyExists.exist === true ? `<th style="text-align: center;vertical-align: middle;" class="text-truncate text-warning" title="Action">Action</th>`:``}
                </tr>
            </thead>
            <tbody>
                ${tableRows.join('')}
            </tbody>
        </table>
    `;
    return tableHTML;
};
$("button#add-database").addEventListener("click", () => {
    ipcRenderer.send("add-database");
});
$("button#create-database").addEventListener("click", () => {
    ipcRenderer.send("create-database");
});
ipcRenderer.on("clean-table", (event, arg) => {
    $('#selected-table').innerHTML = "";
});
ipcRenderer.on("clean-table-list", (event, arg) => {
    $('#all-table').innerHTML = "";
})
// ipcRenderer.send("show-all-tables");
ipcRenderer.on("preloader-tables",(event,table)=>{
    $('#all-table').innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-secondary" role="status" style="width: 2rem; height: 2rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
})
ipcRenderer.on("all-table", (event, table) => {
    hideTableVar = true;
    hideTable();
    setTimeout(() => {
        $('#all-table').innerHTML = "";
        const tableExist = JSON.parse(table);
        const tableRender = tableExist.map((tab, index) => `
            <button id="table_${index}" onclick="tableHandler('${tab.name}')" class="text-start w-100 btn bg-body-tertiary p-2 rounded-3 d-flex gap-2" title="${tab.name}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.4351 4.89827C20.407 4.86008 20.3733 4.82636 20.3351 4.79826H20.2751C17.8617 3.00665 14.9358 2.03931 11.9301 2.03931C8.9244 2.03931 5.99849 3.00665 3.58511 4.79826C3.54249 4.8208 3.50766 4.85565 3.48512 4.89827C3.3654 5.02501 3.30068 5.19398 3.30511 5.36827V17.2583C3.31564 17.8461 3.47752 18.4213 3.77512 18.9283C4.07041 19.4388 4.49454 19.863 5.00511 20.1583C7.13186 21.3824 9.55166 22.0046 12.0051 21.9583H12.2851C14.6402 21.9612 16.9544 21.3438 18.9951 20.1683C19.5085 19.8732 19.9359 19.4492 20.2351 18.9383C20.5276 18.4224 20.6858 17.8412 20.6951 17.2483V5.37827C20.6861 5.28492 20.6585 5.19433 20.6138 5.11188C20.5692 5.02942 20.5084 4.95678 20.4351 4.89827ZM19.1051 11.5983C17.0017 13.0692 14.4969 13.8582 11.9301 13.8582C9.36334 13.8582 6.85858 13.0692 4.75511 11.5983V6.89827C6.87732 8.26569 9.3733 8.93688 11.8951 8.81827H12.4851C14.8401 8.82971 17.1486 8.16319 19.1351 6.89827L19.1051 11.5983Z" fill="currentColor"/>
                </svg>
                <div class="w-100 text-truncate">
                    ${tab.name}
                </div>
            </button>
        `).join("");
        $("#all-table").innerHTML = `${tableRender} <button onclick="createTable()" class="mt-3 btn btn-outline-secondary w-100">+ Create table</button>`;
    }, [250])
});
ipcRenderer.on("preloader-database",(event,table)=>{
    $('#all-database').innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-secondary" role="status" style="width: 2rem; height: 2rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
});
ipcRenderer.on("all-database", (event, table) => {
    setTimeout(() => {
        $('#all-database').innerHTML = "";
        const tableExist = JSON.parse(table);
        tableExist.map((tab, index) => {
            $("div#all-database").insertAdjacentHTML("beforeend", `
                <div class="w-100 d-flex gap-2">
                    <button id="table_${index}" onclick="databaseHandler('${tab}')" class="text-start btn bg-body-tertiary p-2 rounded-3 d-flex gap-2 w-100 text-truncate" title="${tab}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.4351 4.89827C20.407 4.86008 20.3733 4.82636 20.3351 4.79826H20.2751C17.8617 3.00665 14.9358 2.03931 11.9301 2.03931C8.9244 2.03931 5.99849 3.00665 3.58511 4.79826C3.54249 4.8208 3.50766 4.85565 3.48512 4.89827C3.3654 5.02501 3.30068 5.19398 3.30511 5.36827V17.2583C3.31564 17.8461 3.47752 18.4213 3.77512 18.9283C4.07041 19.4388 4.49454 19.863 5.00511 20.1583C7.13186 21.3824 9.55166 22.0046 12.0051 21.9583H12.2851C14.6402 21.9612 16.9544 21.3438 18.9951 20.1683C19.5085 19.8732 19.9359 19.4492 20.2351 18.9383C20.5276 18.4224 20.6858 17.8412 20.6951 17.2483V5.37827C20.6861 5.28492 20.6585 5.19433 20.6138 5.11188C20.5692 5.02942 20.5084 4.95678 20.4351 4.89827ZM19.1051 11.5983C17.0017 13.0692 14.4969 13.8582 11.9301 13.8582C9.36334 13.8582 6.85858 13.0692 4.75511 11.5983V6.89827C6.87732 8.26569 9.3733 8.93688 11.8951 8.81827H12.4851C14.8401 8.82971 17.1486 8.16319 19.1351 6.89827L19.1051 11.5983Z" fill="currentColor"/>
                        </svg>
                        <div class="w-100 text-truncate">
                            ${tab.substring(tab.lastIndexOf('/') + 1)}
                        </div>
                    </button>
                    <button type="button" class="btn text-body-tertiary p-0" onclick="removeDatabase('${tab}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.47058 6.01471V18.5294C5.47058 19.251 5.75721 19.943 6.26742 20.4532C6.77763 20.9634 7.46962 21.25 8.19117 21.25H15.8088C16.5304 21.25 17.2224 20.9634 17.7326 20.4532C18.2428 19.943 18.5294 19.251 18.5294 18.5294V6.01471" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3.29413 6.01471H20.7059" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8.73529 6.01471V4.38235C8.73529 3.94943 8.90727 3.53423 9.2134 3.2281C9.51952 2.92198 9.93472 2.75 10.3676 2.75H13.6323C14.0653 2.75 14.4805 2.92198 14.7866 3.2281C15.0927 3.53423 15.2647 3.94943 15.2647 4.38235V6.01471" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9.82352 16.9915V11.5535" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M14.1765 16.9915V11.5535" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `);
        });
    }, [250]);
});
ipcRenderer.on("preloader-selected-table",(event,arg)=>{
    $('#selected-table').innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="min-height:600px;height:100%;">
            <div class="spinner-border text-secondary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
});
ipcRenderer.on("selected-table", (event, arg) => {
    setTimeout(() => {
        $('#selected-table').innerHTML = "";
        const data = JSON.parse(arg);
        const container = $('#selected-table');
        const table = generateHTMLTable(data.name, data.keys, data.table, data.time, data.primary_key_exist);
        container.innerHTML = table;
    }, [250]);
});

// Theme Changer

function getSystemTheme() {
    // Проверка поддержки matchMedia и prefers-color-scheme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    } else {
        return 'light';
    }
}

// Установка темы
function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
}

// Инициализация темы при загрузке страницы
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        // Если тема сохранена в localStorage, используем ее
        setTheme(savedTheme);
    } else {
        // Иначе используем системную тему или light по умолчанию
        const systemTheme = getSystemTheme();
        setTheme(systemTheme);
    }
}

// Обработчик для кнопки смены темы
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

ipcRenderer.on('send-error',(event,data)=>{
    $("#errorData").innerHTML = `
        <div class="modal-header">
            <h1 class="modal-title fs-5" id="closeAppLabel">Error</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            ${String(data)}
        </div>
    `;
    var myModal = new bootstrap.Modal(document.getElementById('errorDataModal'));
    myModal.show();
})

initializeTheme();