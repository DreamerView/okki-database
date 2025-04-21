const {dialog} = require("electron");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const exportCSV = (table_name,rows) => {
    // Показываем асинхронный диалог сохранения
    dialog.showSaveDialog({
      title: 'Сохранить CSV файл', // Заголовок диалога
      defaultPath: table_name+'.csv', // Путь по умолчанию и имя файла
      filters: [{ name: 'CSV файлы', extensions: ['csv'] }] // Фильтр для CSV файлов
    }).then(result => {
      // result.filePath содержит путь к выбранному файлу
      if (!result.canceled && result.filePath) {
        const headers = Object.keys(rows[0]);
        const csvWriter = createCsvWriter({
          path: result.filePath,
          header: headers.map(header => ({ id: header, title: header }))
        });
  
        csvWriter.writeRecords(rows)
          .then(() => {
            console.log('CSV файл успешно сохранен!');
          })
          .catch(err => {
            console.error('Ошибка сохранения CSV файла:', err);
          });
      } else {
        console.log('Сохранение отменено.');
      }
    }).catch(err => {
      console.error('Ошибка при открытии диалога сохранения:', err);
    });
  }
 
module.exports = exportCSV;