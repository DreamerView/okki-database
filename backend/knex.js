const path = require("path");
const fs = require("fs");
const {URL} = require("url");
const { ipcMain, dialog, app } = require("electron");
const knexLib = require("knex");
const exportExcel = require("./exportExcel");
const exportCSV = require("./exportCSV");
const exportWord = require("./exportWord");

let selectedDatabase = "", allDatabase = [];

function leaveOneSpace(str) {
    return str.replace(/\s+/g, ' ');
}

function initializeKnex(dbByChoice) {
    const urlResult = dbByChoice===undefined?selectedDatabase:dbByChoice;
    const url = new URL(urlResult);
    let render={};
    if (url.protocol === 'sqlite:') {
        render = {
            client: 'sqlite3',
            connection: {
                filename: decodeURIComponent(url.pathname)
            },
            useNullAsDefault: true 
        };
    } else if (url.protocol === 'mysql:') {
        render = {
          client: 'mysql2',
          connection: {
            host: url.hostname,
            user: url.username,
            port: url.port,
            password: url.password,
            database: url.pathname.slice(1)  // Удаляем начальный '/'
          }
        };
    }
    return knexLib(render);
}

const showAllTable = () => {
    return new Promise(async (resolve, reject) => {
        const knex = initializeKnex();
        const database = selectedDatabase;
        try {
            let tableExist = [];
            if (database.startsWith('sqlite:')) {
                const rows = await knex.raw("SELECT name FROM sqlite_master WHERE type='table'");
                tableExist = JSON.stringify(rows);
                console.log(rows);
            } else if(database.startsWith('mysql:')) {
                const rows = await knex.raw("SHOW TABLES");
                const tables = rows[0].map(row => ({ name: Object.values(row)[0] }));
                tableExist = JSON.stringify(tables);
            }
            resolve({ table: tableExist, db: JSON.stringify(allDatabase) });
        } catch (err) {
            reject(err);
        } finally {
            knex.destroy();
        }
    });
}

const checkPrimaryKey = (table) => {
    return new Promise(async (resolve, reject) => {
        const knex = initializeKnex();
        try {
            let primaryKey;
            if(selectedDatabase.startsWith('sqlite:')) {
                const rows = await knex.raw(`PRAGMA table_info('${table}')`);
                primaryKey = rows.find(result => result.pk === 1);
            } else if(selectedDatabase.startsWith("mysql:")) {
                const rows = await knex.raw(`
                    SELECT COLUMN_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_NAME = '${table}' AND CONSTRAINT_NAME = 'PRIMARY'
                `);
                primaryKey = rows[0][0]===undefined?undefined:{name:rows[0][0]["COLUMN_NAME"]};
            }
            resolve(primaryKey ? { exist: true, key: primaryKey.name } : { exist: false, key: "" });
        } catch (err) {
            reject(err);
        } finally {
            knex.destroy();
        }
    });
};

const selectTable = (table) => {
    return new Promise(async (resolve, reject) => {
        const knex = initializeKnex();
        try {
            let data;
            let keys;
            if(selectedDatabase.startsWith("sqlite:")) {
                data = await knex.select('*').from(table).offset(1).limit(5);
                keys = await knex.raw(`PRAGMA table_info(${table})`);
                console.log(keys);
            } else if(selectedDatabase.startsWith("mysql:")) {
                data = await knex.select('*').from(table);
                const desc = await knex.raw("DESCRIBE `"+table+"`");
                keys = desc[0].map((e)=>({name:e['Field'],type:e['Type']}))
            }
            // console.log(keys);
            const exist = await checkPrimaryKey(table);
            const existPK = exist.exist ? { key: exist.key, exist: true } : { key: "", exist: false };
            const tables = JSON.stringify({ name: table, keys, table: data, time: new Date(), primary_key_exist: existPK });
            resolve(tables);
        } catch (err) {
            reject(err);
        } finally {
            knex.destroy();
        }
    });
};

const electronAPI = () => {
    
    ipcMain.on("remove-database", (event, database) => {
        try {
        event.reply('preloader-database');
        event.reply("preloader-tables");
        event.reply("preloader-selected-table");
        allDatabase = allDatabase.filter(item => item !== database);
        showAllTable().then(data => {
            event.reply('all-database', data.db);
            if (selectedDatabase === database) {
                selectedDatabase = "";
                event.reply("clean-table");
                event.reply("clean-table-list");
            }
        });
        } catch(err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply('all-database', JSON.stringify(allDatabase));
            event.reply("clean-table");
            event.reply("clean-table-list");
        }
    });

    ipcMain.on("table-update", (event, database) => {
        try {
            event.reply("preloader-tables");
            if (selectedDatabase === "") {
                event.reply("clean-table");
                event.reply("clean-table-list");
                return;
            }
            showAllTable().then(data => {
                event.reply("all-table", data.table);
            });
        } catch(err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply("clean-table-list");
        }
    });

    ipcMain.on('add-database', async (event) => {
        try {
            event.reply('preloader-database');
            event.reply("preloader-selected-table");
            event.reply("preloader-tables");
            const file = await dialog.showOpenDialog(null, {
                properties: ['openFile', 'multiSelections'],
                filters: [{
                    name: 'SQLite databases',
                    extensions: ['sqlite', 'sqlite3']
                }]
            });

            if (!file.canceled) {
                const sqliteFiles = file.filePaths
                    .filter(file => {
                        const extension = path.extname(file).toLowerCase();
                        return extension === '.sqlite' || extension === '.sqlite3';
                    })
                    .map(file => file.replace(/\\/g, '/'));

                sqliteFiles.map(sql => !allDatabase.includes("sqlite:"+sql) && allDatabase.push("sqlite:"+sql));
            }
            event.reply("all-database",JSON.stringify(allDatabase));
            event.reply("clean-table-list");
            event.reply("clean-table");
        } catch(err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply("all-database",JSON.stringify(allDatabase));
            event.reply("clean-table-list");
            event.reply("clean-table");
        }
    });

    ipcMain.on('create-database', async (event) => {
        function createSQLiteFile(filePath) {
            try {
                event.reply('preloader-database');
                event.reply("preloader-selected-table");
                event.reply("preloader-tables");
                const filePathResult = filePath.replace(/\\/g, '/');
                fs.writeFileSync(filePathResult, '');
                const response = "sqlite:"+filePathResult;
                !allDatabase.includes(response) && allDatabase.push(response);
                event.reply("all-database",JSON.stringify(allDatabase));
                event.reply("clean-table-list");
                event.reply("clean-table");
                return filePath;
            } catch (error) {
                console.error("An error occurred creating the file:", error);
                throw error;
            }
        }
        try {
            const result = await dialog.showSaveDialog(null, {
                defaultPath: path.join(app.getPath('documents'), 'newfile.sqlite3'),
                filters: [{ name: 'SQLite Databases', extensions: ['sqlite', 'sqlite3'] }]
            });
            if (!result.canceled) {
                const selectedFilePath = result.filePath;
                const createdFilePath = await createSQLiteFile(selectedFilePath);
            }
        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply("all-database",JSON.stringify(allDatabase));
            event.reply("clean-table-list");
            event.reply("clean-table");
        }
    });

    ipcMain.on("mysql-connect", async (event, res) => {
        try {
            event.reply('preloader-database');
            const knex = initializeKnex(res);
    
            try {
                await knex.raw('SELECT 1+1 as result');
                !allDatabase.includes(res) && allDatabase.push(res);
                selectedDatabase = res;
                event.reply('all-database', JSON.stringify(allDatabase));
            } catch (error) {
                console.error('Ошибка подключения к базе данных:', error);
                throw error
            } finally {
                knex.destroy();
            }
        } catch (err) {
            console.error(err);
            event.reply("send-error", err);
            event.reply('all-database',JSON.stringify(allDatabase));
        }
    });
    

    ipcMain.on("change-database", (event, table) => {
        try {
            event.reply('preloader-database');
            event.reply("preloader-tables");
            selectedDatabase = table;
            showAllTable().then(data => {
                event.reply("all-table", data.table);
                event.reply('all-database', data.db);
            });
        } catch(err) {
            console.error(err);
            event.reply("send-error", err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply('clean-table-list');
        }
    });

    ipcMain.on("show-all-tables", (event, table) => {
        try {
            event.reply('preloader-database');
            event.reply("preloader-tables");
            showAllTable().then(data => {
                event.reply("all-table", data.table);
                event.reply('all-database', data.db);
            });
        } catch(err) {
            console.error(err);
            event.reply("send-error", err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply('clean-table-list');
        }
    });

    ipcMain.on("select-table", (event, table) => {
        try {
            event.reply("preloader-selected-table");
            selectTable(table).then(data => {
                event.reply("selected-table", data);
            });
        } catch(err) {
            console.error(err);
            event.reply("send-error", err);
            event.reply('clean-table');
        }
    });

    ipcMain.on('delete-table', async (event, table) => {
        event.reply('preloader-database');
        event.reply("preloader-tables");
        event.reply("preloader-selected-table");
        const knex = initializeKnex();
        try {
            await knex.schema.dropTableIfExists(table);
            showAllTable().then(data => {
                event.reply("all-table", data.table);
                event.reply('all-database', data.db);
                event.reply("clean-table");
            });
        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply("clean-table");
            event.reply("clean-table-list");
        } finally {
            knex.destroy();
        }
    });

    ipcMain.on('delete-data', async (event, table) => {
        event.reply('preloader-database');
        event.reply("preloader-tables");
        event.reply("preloader-selected-table");
        const knex = initializeKnex();
        const deleteData = JSON.parse(table);
        try {
            await knex(deleteData['table']).where(deleteData.pk, deleteData.where).del();
            showAllTable().then(data => {
                event.reply("all-table", data.table);
                event.reply('all-database', data.db);
            });
            selectTable(deleteData.table).then(data => {
                event.reply("selected-table", data);
            });
        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply("clean-table");
            event.reply("clean-table-list");
        } finally {
            knex.destroy();
        }
    });

    ipcMain.on("update-table", async (event, table) => {
        event.reply('preloader-database');
        event.reply("preloader-tables");
        const knex = initializeKnex();
        const result = JSON.parse(table);
        try {
            await knex(result.name).where(result.key, result.value).update(result.data);
            showAllTable().then(data => {
                event.reply("all-table", data.table);
                event.reply('all-database', data.db);
            });
            selectTable(result.name).then(data => {
                event.reply("selected-table", data);
            });
        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply("clean-table");
            event.reply("clean-table-list");
        } finally {
            knex.destroy();
        }
    });

    ipcMain.on('insert-table', async (event, table) => {
        event.reply('preloader-database');
        event.reply("preloader-tables");
        event.reply("preloader-selected-table");
        const knex = initializeKnex();
        const result = JSON.parse(table);
        try {
            await knex(result.name).insert(result.data);
            const allTable = await showAllTable();
            const selectTableVar = await selectTable(result.name);
            event.reply("all-table", allTable.table);
            event.reply('all-database', allTable.db);
            event.reply("selected-table", selectTableVar);

        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply("clean-table");
            event.reply("clean-table-list");
        } finally {
            knex.destroy();
        }
    });

    ipcMain.on('create-table', async (event, table) => {
        event.reply('preloader-database');
        event.reply("preloader-tables");
        event.reply("preloader-selected-table");
        const knex = initializeKnex();
        const result = JSON.parse(table);
        const data = result.data;
        try {
            await knex.schema.createTable(result.name, function (tableBuilder) {
                data.forEach(column => {
                    let columnBuilder = tableBuilder.specificType(column['table_name'], column['table_type'] + (column['table_length'] ? `(${column['table_length']})` : ''));
                    if (column['primary-key'] === "primary") {
                        columnBuilder.primary();
                    }
                });
            });
            showAllTable().then(data => {
                event.reply("all-table", data.table);
                event.reply('all-database', data.db);
            });
            selectTable(result.name).then(data => {
                event.reply("selected-table", data);
            });
        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
            event.reply('all-database',JSON.stringify(allDatabase));
            event.reply("clean-table");
            event.reply("clean-table-list");
        } finally {
            knex.destroy();
        }
    });

    ipcMain.on('export-table', async (event, table) => {
        const knex = initializeKnex();
        const result = JSON.parse(table);
        try {
            const rows = await knex.select('*').from(result.table);
            switch (result.type) {
                case "csv": exportCSV(result.table, rows); break;
                case "excel": exportExcel(result.table, rows); break;
                case "word": exportWord(result.table, rows); break;
                default: ""; break;
            }
        } catch (err) {
            console.error(err);
            event.reply("send-error",err);
        } finally {
            knex.destroy();
        }
    });
};

module.exports = electronAPI;
