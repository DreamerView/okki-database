const {dialog} = require("electron");
const ExcelJS = require('exceljs');

const exportToExcel = (table_name,rows) => {
    // Показываем асинхронный диалог сохранения
    dialog.showSaveDialog({
      title: 'Сохранить Excel файл', // Заголовок диалога
      defaultPath: table_name+'.xlsx', // Путь по умолчанию и имя файла
      filters: [{ name: 'Excel файлы', extensions: ['xlsx'] }] // Фильтр для Excel файлов
    }).then(result => {
      // result.filePath содержит путь к выбранному файлу
      if (!result.canceled && result.filePath) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet 1');
  
        // Записываем заголовки в первую строку
        const headers = Object.keys(rows[0]);
        const headerRow = worksheet.addRow(headers);
  
        // Стиль для жирных заголовков
        headerRow.eachCell(cell => {
          cell.font = { bold: true };
        });
  
        // Записываем данные в лист Excel
        rows.forEach(row => {
          worksheet.addRow(Object.values(row));
        });
  
        // Выравниваем ширину колонок
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell(cell => {
            maxLength = Math.max(maxLength, cell.value ? cell.value.toString().length : 0);
          });
          column.width = maxLength < 10 ? 10 : maxLength; // Устанавливаем минимальную ширину колонки
        });
  
        // Сохраняем книгу Excel
        workbook.xlsx.writeFile(result.filePath)
          .then(() => {
            console.log('Excel файл успешно сохранен!');
          })
          .catch(err => {
            console.error('Ошибка сохранения Excel файла:', err);
          });
      } else {
        console.log('Сохранение отменено.');
      }
    }).catch(err => {
      console.error('Ошибка при открытии диалога сохранения:', err);
    });
  }

module.exports = exportToExcel;