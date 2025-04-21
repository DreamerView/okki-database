function generateHTMLTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
  
    const tableHeaders = Object.keys(data[0]);
    const tableRows = data.map(item => {
        return `<tr>${tableHeaders.map(header => `<td class="text-truncate" title="${item[header]}">${item[header]}</td>`).join('')}</tr>`;
    });
  
    const tableHTML = `
        <table class="table table-bordered w-100 text-truncate" style="table-layout:fixed;">
            <thead>
                <tr>${tableHeaders.map(header => `<th class="text-truncate" title="${header}">${header}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${tableRows.join('')}
            </tbody>
        </table>
    `;
  
    return tableHTML;
  }
  

window.addEventListener("load",()=>{
    const {ipcRenderer} = require('electron');
    const $ = selector => document.querySelector(selector);
    ipcRenderer.send("mysql-database-table");
    ipcRenderer.send("mysql-table");
    ipcRenderer.on("mysql-database-table-result",(event,arg)=>{
        const table = JSON.parse(arg);
        table.forEach(tabs=>{
            $("div#mysql-table").insertAdjacentHTML("beforeend",`
                <button class="text-start w-100 btn bg-body-secondary p-2 rounded-3 d-flex gap-2" title="${tabs}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.4351 4.89827C20.407 4.86008 20.3733 4.82636 20.3351 4.79826H20.2751C17.8617 3.00665 14.9358 2.03931 11.9301 2.03931C8.9244 2.03931 5.99849 3.00665 3.58511 4.79826C3.54249 4.8208 3.50766 4.85565 3.48512 4.89827C3.3654 5.02501 3.30068 5.19398 3.30511 5.36827V17.2583C3.31564 17.8461 3.47752 18.4213 3.77512 18.9283C4.07041 19.4388 4.49454 19.863 5.00511 20.1583C7.13186 21.3824 9.55166 22.0046 12.0051 21.9583H12.2851C14.6402 21.9612 16.9544 21.3438 18.9951 20.1683C19.5085 19.8732 19.9359 19.4492 20.2351 18.9383C20.5276 18.4224 20.6858 17.8412 20.6951 17.2483V5.37827C20.6861 5.28492 20.6585 5.19433 20.6138 5.11188C20.5692 5.02942 20.5084 4.95678 20.4351 4.89827ZM19.1051 11.5983C17.0017 13.0692 14.4969 13.8582 11.9301 13.8582C9.36334 13.8582 6.85858 13.0692 4.75511 11.5983V6.89827C6.87732 8.26569 9.3733 8.93688 11.8951 8.81827H12.4851C14.8401 8.82971 17.1486 8.16319 19.1351 6.89827L19.1051 11.5983Z" fill="currentColor"/>
                    </svg>
                    <div class="w-100 text-truncate">
                        ${tabs}
                    </div>
                </button>
            `);
        })
    })
    ipcRenderer.on("mysql-table-result",(event,arg)=>{
        const data = JSON.parse(arg);
        const container = document.getElementById('mysql-selected-table');
        const table = generateHTMLTable(data);
        container.innerHTML = table;
    });

})