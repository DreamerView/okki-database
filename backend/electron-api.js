const path = require("path");
const fs = require("fs");
const {ipcMain,dialog,app} = require("electron");
const sqlite3 = require("sqlite3");
const exportExcel = require("./exportExcel");
const exportCSV = require("./exportCSV");
const exportWord = require("./exportWord");

let sqliteDatabase="",allDatabase=[], folderDatabase="";

function leaveOneSpace(str) {
    return str.replace(/\s+/g, ' ');
}

const sqliteExecute = () => {
    let db = new sqlite3.Database(sqliteDatabase, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the database.');
    });

    return db;
}


const showAllTable = () => {
    return new Promise((resolve,reject)=>{
        const db = sqliteExecute();
        
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
            if (err) throw err;
            console.log(rows);
            db.close();
            const tableExist = JSON.stringify(rows);
            resolve({table:tableExist,db:JSON.stringify(allDatabase)});
        });
    })
}

const checkPrimaryKey = (table) => {
    return new Promise((resolve,reject)=>{
        const db = sqliteExecute();

        db.all(`PRAGMA table_info('${table}')`,(err,row)=>{
            if (err) throw err;
            db.close();
            row.map(result=>{
                result.pk===1?resolve({exist:true,key:result.name}):resolve({exist:false,key:""});
            })
        });
    });
};

const selectTable = (table) => {
    return new Promise((resolve,reject)=>{
        const db = sqliteExecute();
        
        new Promise((resolve,reject)=>{
            db.all("SELECT * FROM `"+String(table)+"`", [], (err, rows) => {
                if (err) throw err;
                resolve(rows);
            });
        }).then((response)=>{
            new Promise((resolve,reject)=>{
                db.all(`PRAGMA table_info(${table})`, (err, rows) => {
                    if (err) throw err;
                    db.close();
                    resolve({keys:rows,data:response})
                });
            }).then((result)=>{
                checkPrimaryKey(table).then(exist=>{
                    const existPK = exist.exist===true?{key:exist.key,exist:true}:{key:"", exist:false};
                    const tables = JSON.stringify({name:table,keys:result.keys,table:result.data,time:new Date(),primary_key_exist:existPK});
                    resolve(tables);
                });
            })
        }); 
    });
};

const electronAPI = () => {

    ipcMain.on('select-database', async (event) => {
        const file = await dialog.showOpenDialog(null, {
            properties: ['openFile'],
            filters: [{
                name: 'SQLite databases',
                extensions: ['sqlite', 'sqlite3']
            }]
        });
    
        if (!file.canceled) {
            sqliteDatabase = file.filePaths[0].replace(/\\/g, '/');
            event.sender.send('selected-database', sqliteDatabase);
            allDatabase.push(sqliteDatabase);
            ipcMain.emit("sqlite-show");
        }
    });

    ipcMain.on("remove-database",(event,database)=>{
        const filteredArray = allDatabase.filter(item => item !== database);
        allDatabase = filteredArray;
        showAllTable().then(data=>{
            event.reply('all-database',data.db);
            if(sqliteDatabase===database) {
                sqliteDatabase = "";
                event.reply("clean-table");
                event.reply("clean-table-list");
            }
        });
    });

    ipcMain.on("table-update",(event,database)=>{
        if(sqliteDatabase==="") {
            event.reply("clean-table");
            event.reply("clean-table-list");
            return;
        }
        console.log("exist");
        showAllTable().then(data=>{
            event.reply("all-table", data.table);
        });
    })

    ipcMain.on('single-mode', async (event) => {
        sqliteDatabase = "";
        allDatabase = [];
        folderDatabase = "";
        showAllTable().then(data=>{
            event.reply('all-database',data.db);
            event.reply("clean-table");
            event.reply("clean-table-list");
        });
    });
    ipcMain.on("folder-mode", async(event)=>{
        try {
            const result = await dialog.showOpenDialog(null, {
              properties: ['openDirectory']
            });
            if (!result.canceled && result.filePaths.length > 0) {
                const folderPath = result.filePaths[0].replace(/\\/g, '/');
                const files = fs.readdirSync(folderPath);
                const sqliteFiles = files
                    .filter(file => {
                    const extension = path.extname(file).toLowerCase();
                    return extension === '.sqlite' || extension === '.sqlite3';
                    })
                    .map(file => path.join(folderPath, file).replace(/\\/g, '/'));
                allDatabase = sqliteFiles;
                folderDatabase = folderPath;
                showAllTable().then(data=>{
                    event.reply('all-database',data.db);
                    event.reply("clean-table");
                    event.reply("clean-table-list");
                });
            }
          } catch (error) {
            console.error("An error occurred:", error);
          }
    })

    ipcMain.on('add-database', async (event) => {
        const file = await dialog.showOpenDialog(null, {
            properties: ['openFile','multiSelections'],
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

            sqliteFiles.map(sql=> !allDatabase.includes(sql) && allDatabase.push(sql));

            showAllTable().then(data=>{
                event.reply("clean-table-list");
                event.reply("clean-table");
                event.reply('all-database',data.db);
            });
        }
    });

    ipcMain.on('create-database', async (event) => {
        function createSQLiteFile(filePath) {
            try {
                const filePathResult = filePath.replace(/\\/g, '/');
                fs.writeFileSync(filePathResult, '');
                console.log("File created successfully:", filePathResult);
                !allDatabase.includes(filePathResult) && allDatabase.push(filePathResult);
                showAllTable().then(data=>{
                    event.reply("all-table", data.table);
                    event.reply('all-database',data.db);
                });
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
          } catch (error) {
            console.error(error);
          }
    });

    ipcMain.on("change-database",(event,table)=>{
        sqliteDatabase = table;
        showAllTable().then(data=>{
            event.reply("all-table", data.table);
            event.reply('all-database',data.db);
        });
    });

    ipcMain.on("show-all-tables",(event,table)=>{
        showAllTable().then(data=>{
            event.reply("all-table", data.table);
            event.reply('all-database',data.db);
        });
    });
    ipcMain.on("select-table",(event,table)=>{
        selectTable(table).then(data=>{
            event.reply("selected-table",data);
        });
    });

    ipcMain.on('delete-table',(event,table)=>{
        const db = sqliteExecute();
        
        db.all("DROP TABLE IF EXISTS `"+table+"`", [], (err, rows) => {
            if (err) throw err;

            db.close();
            showAllTable().then(data=>{
                event.reply("all-table", data.table);
                event.reply('all-database',data.db);
                event.reply("clean-table");
            });
        });
    });
    ipcMain.on('delete-data',(event,table)=>{
        const db = sqliteExecute();

        const deleteData = JSON.parse(table);
        
        db.all("DELETE FROM "+deleteData['table']+" WHERE "+deleteData.pk+"='"+deleteData.where+"';", [], (err, rows) => {
            if (err) throw err;

            db.close();
            showAllTable().then(data=>{
                event.reply("all-table", data.table);
                event.reply('all-database',data.db);                
            });
            selectTable(deleteData.table).then(data=>{
                event.reply("selected-table",data);
            });
        });
        
    });

    ipcMain.on("update-table",(event,table)=>{
        const db = sqliteExecute();
        const result = JSON.parse(table);
        let keyValuePairArray = Object.keys(result.data).map(key => `${key} = ?`);
        let keyConcat = keyValuePairArray.join(", ");

        const modifiedValues = Object.values(result.data).map(value => typeof value === 'number'?Number(value):String(value));
        
        const valueConcat = modifiedValues;
        console.log(valueConcat);
        console.log(keyConcat);
        db.all("UPDATE `"+result.name+"` SET "+keyConcat+" WHERE "+result.key+"='"+result.value+"' ", modifiedValues, (err, rows) => {
            if (err) throw err;

            db.close();
            showAllTable().then(data=>{
                event.reply("all-table", data.table);
                event.reply('all-database',data.db);                
            });
            selectTable(result.name).then(data=>{
                event.reply("selected-table",data);
            });
        });
        
    })

    ipcMain.on('insert-table',(event,table)=>{
        const db = sqliteExecute();

        const result = JSON.parse(table);
        const keyConcat = Object.keys(result.data).join(", ");
        const modifiedValues = Object.values(result.data).map(value => typeof value === 'number'?Number(value):"'" + String(value) + "'");
        
        const valueConcat = modifiedValues.join(", ");
        db.all("INSERT INTO `"+result.name+"` ("+keyConcat+") VALUES ("+valueConcat+") ", [], (err, rows) => {
            if (err) throw err;

            db.close();
            showAllTable().then(data=>{
                event.reply("all-table", data.table);
                event.reply('all-database',data.db);                
            });
            selectTable(result.name).then(data=>{
                event.reply("selected-table",data);
            });
        });
    });
    ipcMain.on('create-table',(event,table)=>{
        const db = sqliteExecute();

        const result = JSON.parse(table);
        const data = result.data;
        const renderData = "("+data.map(render=>`${render['table_name']} ${render['table_type']}${render['table_length']?"("+render['table_length']+")":""} ${render['table_default']} ${render['primary-key']==="primary"?"PRIMARY KEY":""} `).join(", ")+");";
        const sql = "CREATE TABLE IF NOT EXISTS `"+result.name+"` " + leaveOneSpace(renderData);
        
        db.all(sql, [], (err, rows) => {
            if (err) throw err;
        
            db.close();
            showAllTable().then(data=>{
                event.reply("all-table", data.table);
                event.reply('all-database',data.db);                
            });
            selectTable(result.name).then(data=>{
                event.reply("selected-table",data);
            });
        });
        
    }); 
      
    ipcMain.on('export-table',(event,table)=>{
        const db = sqliteExecute();
        const result = JSON.parse(table);
        
        db.all("SELECT * FROM `"+result.table+"`", [], (err, rows) => {
            if (err) throw err;

            db.close();

            switch(result.type) {
                case "csv": exportCSV(result.table,rows); break;
                case "excel": exportExcel(result.table,rows); break;
                case "word": exportWord(result.table,rows); break;
                default: ""; break;
            }
            
        });
    });
};

module.exports = electronAPI;