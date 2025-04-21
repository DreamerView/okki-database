const { dialog } = require("electron");
const fs = require('fs');
const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun } = require("docx");

const exportWord = (table_name,table_rows) => {
    dialog.showSaveDialog({
        title: 'Сохранить Word файл', // Заголовок диалога
        defaultPath: table_name+'.docx', // Путь по умолчанию и имя файла
        filters: [{ name: 'Word файлы', extensions: ['docx'] }] // Фильтр для Word файлов
    }).then(result => {
        // result.filePath содержит путь к выбранному файлу
        if (!result.canceled && result.filePath) {
            // Получение заголовков таблицы из ключей первого объекта
            const headers = Object.keys(table_rows[0]);
            const columnCount = headers.length;
            const columnWidth = 100 / columnCount;

            // Создание строк заголовков
            const headerRow = new TableRow({
                children: headers.map(header => new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({ text: header, bold: true })]
                    })],
                    width: { size: columnWidth, type: WidthType.PERCENTAGE }
                }))
            });

            // Создание строк данных
            const dataRows = table_rows.map(row => new TableRow({
                children: headers.map(key => new TableCell({
                    children: [new Paragraph(row[key]?.toString() || "")],
                    width: { size: columnWidth, type: WidthType.PERCENTAGE }
                }))
            }));

            // Создание таблицы
            const table = new Table({
                rows: [headerRow, ...dataRows]
            });

            const doc = new Document({
                sections: [{
                    children: [table],
                }]
            });

            // Генерация и сохранение документа синхронно
            Packer.toBuffer(doc).then(buffer => {
                fs.writeFileSync(result.filePath, buffer);
                console.log("Document created successfully.");
            }).catch(err => {
                console.error("Error creating document:", err);
            });
        } else {
            console.log('Сохранение отменено.');
        }
    }).catch(err => {
        console.error('Ошибка при открытии диалога сохранения:', err);
    });
}

module.exports = exportWord;
