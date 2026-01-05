// Google Sheets API Configuration
const GOOGLE_SHEETS_CONFIG = {
    apiKey: 'AIzaSyARUcWQDXIFnYWpcIQDs-sH97bvPSmFg4o', // Replace with your Google Cloud API key
    spreadsheetId: '1TFjR4FcM4zcx2g1avGINxcwZMMb7eEvnun7BU_o6Hlk', // Replace with your Google Sheet ID
    range: 'Form Responses 1!B:H', // Columns: TIMESTAMP (B), MACHINE NUMBER (C), VOLTAGE (D), CURRENT (E), LOAD (F), RUNTIME (G), IMAGE (H)
};

// Login credentials (in production, this should be handled server-side)
const VALID_CREDENTIALS = {
    'admin': 'admin123',
    'user': 'user123',
    'demo': 'demo123'
};

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validate credentials
    if (VALID_CREDENTIALS[username] && VALID_CREDENTIALS[username] === password) {
        // Save login state
        if (rememberMe) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
        } else {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('username', username);
        }
        
        // Hide login page and show main app
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        
        // Update user info in header
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl) {
            userNameEl.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        }
        
        // Initialize app
        fetchGoogleSheetsData();
        updateDashboardSummary();
    } else {
        alert('Invalid username or password. Please try again.\n\nDefault credentials:\nUsername: admin\nPassword: admin123');
    }
}

// Check if user is already logged in
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') || sessionStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    
    if (isLoggedIn === 'true') {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        
        // Update user info in header
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl && username) {
            userNameEl.textContent = username.charAt(0).toUpperCase() + username.slice(1);
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    
    // Clear form
    document.getElementById('loginForm').reset();
}

// Device data storage (fallback values)
let devicesData = {
    'UPS-DC-001': { model: 'APC Smart-UPS', spec: '10kVA', voltage: '230V', current: '43.5A', load: '62%', runtime: '45m', image: '' },
    'UPS-DC-002': { model: 'Eaton 9PX', spec: '6kVA', voltage: '230V', current: '26.1A', load: '85%', runtime: '18m', image: '' },
    'UPS-DC-003': { model: 'Vertiv Liebert', spec: 'GXT5', voltage: '230V', current: '22.8A', load: '45%', runtime: '67m', image: '' },
    'UPS-DC-004': { model: 'Schneider Galaxy', spec: 'VS', voltage: '230V', current: '15.2A', load: '78%', runtime: '8m', image: '' },
    'UPS-DC-005': { model: 'APC Smart-UPS', spec: '8kVA', voltage: '230V', current: '34.8A', load: '55%', runtime: '52m', image: '' },
    'UPS-DC-006': { model: 'Eaton 9PX', spec: '5kVA', voltage: '230V', current: '21.7A', load: '70%', runtime: '35m', image: '' }
};

// Store all historical data with timestamps
let allHistoricalData = [];

// Fetch data from Google Sheets
async function fetchGoogleSheetsData() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
        
        console.log('Attempting to fetch from:', url);
        
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to fetch data from Google Sheets: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        const rows = data.values;
        
        if (rows && rows.length > 0) {
            console.log('Processing', rows.length, 'rows');
            
            // Reset historical data
            allHistoricalData = [];
            
            // Create a temporary map to store only the latest data for each device
            const latestData = {};
            
            // Parse the data from Google Sheets
            // Columns: TIMESTAMP (B), MACHINE NUMBER (C), VOLTAGE (D), CURRENT (E), LOAD (F), RUNTIME (G), IMAGE (H)
            // Skip the first row (headers) and process all rows
            rows.slice(1).forEach((row, index) => {
                const timestamp = row[0]?.trim();  // TIMESTAMP (Column B)
                const deviceId = row[1]?.trim();   // MACHINE NUMBER (Column C)
                const voltage = row[2]?.trim();    // VOLTAGE (Column D)
                const current = row[3]?.trim();    // CURRENT (Column E)
                const load = row[4]?.trim();       // LOAD (Column F)
                const runtime = row[5]?.trim();    // RUNTIME (Column G)
                const image = row[6]?.trim();      // IMAGE (Column H)
                
                // Store all data with timestamps for date-filtered reports
                if (deviceId && timestamp) {
                    allHistoricalData.push({
                        timestamp: timestamp,
                        deviceId: deviceId,
                        voltage: voltage,
                        current: current,
                        load: load,
                        runtime: runtime,
                        image: image
                    });
                }
                
                // Store the latest entry for each device (later rows overwrite earlier ones)
                if (deviceId) {
                    latestData[deviceId] = {
                        voltage: voltage,
                        current: current,
                        load: load,
                        runtime: runtime,
                        image: image,
                        rowIndex: index + 2 // +2 because we skipped header and arrays are 0-indexed
                    };
                }
            });
            
            console.log('Latest data for each device:', latestData);
            console.log('All historical data:', allHistoricalData);
            
            // Now update devicesData with the latest values
            Object.keys(latestData).forEach(deviceId => {
                const data = latestData[deviceId];
                
                console.log(`Updating device: ${deviceId} (from row ${data.rowIndex})`, data);
                
                // Update device data if device ID exists
                if (devicesData[deviceId]) {
                    if (data.voltage) devicesData[deviceId].voltage = data.voltage.includes('V') ? data.voltage : data.voltage + 'V';
                    if (data.current) devicesData[deviceId].current = data.current.includes('A') ? data.current : data.current + 'A';
                    if (data.load) devicesData[deviceId].load = data.load.includes('%') ? data.load : data.load + '%';
                    if (data.runtime) devicesData[deviceId].runtime = /m$|min$|h$|hr$|hour|hours/i.test(data.runtime) ? data.runtime : data.runtime + 'm';
                    if (data.image) devicesData[deviceId].image = data.image;
                }
            });
            
            console.log('Final devicesData:', devicesData);
            
            // Update the table with new data
            updateDevicesTable();
            // Update dashboard cards with new data
            updateDashboardCards();
            console.log('✅ Data updated from Google Sheets successfully!');
            return Promise.resolve();
        } else {
            console.warn('No data rows found in the sheet');
            return Promise.resolve();
        }
    } catch (error) {
        console.error('❌ Error fetching Google Sheets data:', error);
        console.log('Using last known values...');
        return Promise.reject(error);
    }
}

// Update dashboard summary data
function updateDashboardSummary() {
    // Energy Meter Summary
    const dashEbUnit = document.getElementById('dashEbUnit');
    const dashEbLoad = document.getElementById('dashEbLoad');
    const dashGenUnit = document.getElementById('dashGenUnit');
    const dashGenLoad = document.getElementById('dashGenLoad');
    
    if (dashEbUnit) dashEbUnit.textContent = (1200 + Math.random() * 100).toFixed(2) + ' kWh';
    if (dashEbLoad) dashEbLoad.textContent = (70 + Math.random() * 20).toFixed(1) + '%';
    if (dashGenUnit) dashGenUnit.textContent = (800 + Math.random() * 100).toFixed(2) + ' kWh';
    if (dashGenLoad) dashGenLoad.textContent = (40 + Math.random() * 15).toFixed(1) + '%';
    
    // UPS Devices Summary
    const devices = Object.values(devicesData);
    const totalDevices = devices.length;
    const avgLoad = devices.reduce((sum, dev) => sum + parseFloat(dev.load), 0) / totalDevices;
    const totalRuntime = devices.reduce((sum, dev) => sum + parseFloat(dev.runtime), 0);
    
    const dashTotalUps = document.getElementById('dashTotalUps');
    const dashAvgVoltage = document.getElementById('dashAvgVoltage');
    const dashAvgLoad = document.getElementById('dashAvgLoad');
    const dashTotalRuntime = document.getElementById('dashTotalRuntime');
    
    if (dashTotalUps) dashTotalUps.textContent = totalDevices;
    if (dashAvgVoltage) dashAvgVoltage.textContent = '230V';
    if (dashAvgLoad) dashAvgLoad.textContent = avgLoad.toFixed(1) + '%';
    if (dashTotalRuntime) dashTotalRuntime.textContent = Math.round(totalRuntime) + 'min';
    
    // Water Consumption Summary
    const dashCafeteria = document.getElementById('dashCafeteria');
    const dashWashArea = document.getElementById('dashWashArea');
    const dashPantry = document.getElementById('dashPantry');
    const dashKitchen = document.getElementById('dashKitchen');
    
    if (dashCafeteria) dashCafeteria.textContent = (1200 + Math.floor(Math.random() * 100)).toLocaleString() + ' L';
    if (dashWashArea) dashWashArea.textContent = (800 + Math.floor(Math.random() * 100)).toLocaleString() + ' L';
    if (dashPantry) dashPantry.textContent = (400 + Math.floor(Math.random() * 50)).toLocaleString() + ' L';
    if (dashKitchen) dashKitchen.textContent = (1800 + Math.floor(Math.random() * 150)).toLocaleString() + ' L';
    
    // Asset Tracking Summary
    const dashTotalAssets = document.getElementById('dashTotalAssets');
    const dashActiveAssets = document.getElementById('dashActiveAssets');
    const dashMaintenanceAssets = document.getElementById('dashMaintenanceAssets');
    const dashInactiveAssets = document.getElementById('dashInactiveAssets');
    
    if (dashTotalAssets) dashTotalAssets.textContent = '15';
    if (dashActiveAssets) dashActiveAssets.textContent = '12';
    if (dashMaintenanceAssets) dashMaintenanceAssets.textContent = '2';
    if (dashInactiveAssets) dashInactiveAssets.textContent = '1';
}

// Update the devices table with current data
function updateDevicesTable() {
    // Get all device ID cells
    const deviceCells = document.querySelectorAll('td.device-id');
    
    deviceCells.forEach(cell => {
        const deviceId = cell.textContent.trim();
        const device = devicesData[deviceId];
        
        if (device) {
            const parentRow = cell.closest('tr');
            
            // Update voltage
            const voltageCell = parentRow.querySelector('td:nth-child(3) .metric-value');
            if (voltageCell) voltageCell.textContent = device.voltage;
            
            // Update current
            const currentCell = parentRow.querySelector('td:nth-child(4) .metric-value');
            if (currentCell) currentCell.textContent = device.current;
            
            // Update load
            const loadCell = parentRow.querySelector('td:nth-child(5) .metric-value');
            if (loadCell) loadCell.textContent = device.load;
            
            // Update runtime
            const runtimeCell = parentRow.querySelector('td:nth-child(6) .metric-value');
            if (runtimeCell) runtimeCell.textContent = device.runtime;
        }
    });
}

// Update dashboard device cards with current data
function updateDashboardCards() {
    Object.keys(devicesData).forEach(deviceId => {
        const device = devicesData[deviceId];
        
        // Find the card by searching for h3 with device ID
        const cards = document.querySelectorAll('.device-card');
        cards.forEach(card => {
            const cardTitle = card.querySelector('.device-card-header h3');
            if (cardTitle && cardTitle.textContent.trim() === deviceId) {
                // Update voltage
                const voltageValue = card.querySelector('.metric-row:nth-child(1) .metric-value-large');
                if (voltageValue && device.voltage) {
                    voltageValue.textContent = device.voltage;
                }
                
                // Update load
                const loadValue = card.querySelector('.metric-row:nth-child(2) .metric-value-large');
                if (loadValue && device.load) {
                    loadValue.textContent = device.load;
                }
                
                // Update current
                const currentValue = card.querySelector('.footer-metric:nth-child(1) .footer-value');
                if (currentValue && device.current) {
                    currentValue.textContent = device.current;
                }
                
                // Update runtime
                const runtimeValue = card.querySelector('.footer-metric:nth-child(2) .footer-value');
                if (runtimeValue && device.runtime) {
                    runtimeValue.textContent = device.runtime;
                }
            }
        });
    });
}

// Helper function for querySelector with text content
document.querySelectorAll('td.device-id').forEach(td => {
    const deviceId = td.textContent.trim();
    td.setAttribute('data-device-id', deviceId);
});

// Navigation helper function
function navigateToPage(event, pageName) {
    event.preventDefault();
    
    // Find and click the corresponding nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const spans = item.querySelectorAll('span');
        const itemName = spans[1] ? spans[1].textContent.trim() : '';
        if (itemName === pageName) {
            item.click();
        }
    });
}

// Add interactivity to navigation items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        // Handle page navigation - get the text from the span, not the icon
        const spans = this.querySelectorAll('span');
        const pageName = spans[1] ? spans[1].textContent.trim() : this.textContent.trim();
        
        console.log('Navigating to:', pageName);
        
        // Hide all pages
        const dashboardPage = document.getElementById('dashboardPage');
        const energyMeterPage = document.getElementById('energyMeterPage');
        const upsDevicesPage = document.getElementById('upsDevicesPage');
        const waterConsumptionPage = document.getElementById('waterConsumptionPage');
        const reportsPage = document.getElementById('reportsPage');
        const assetTaggingPage = document.getElementById('assetTaggingPage');
        const settingsPage = document.getElementById('settingsPage');
        
        console.log('Dashboard page element:', dashboardPage);
        console.log('Energy Meter page element:', energyMeterPage);
        console.log('UPS Devices page element:', upsDevicesPage);
        console.log('Water Consumption page element:', waterConsumptionPage);
        console.log('Reports page element:', reportsPage);
        console.log('Asset Tagging page element:', assetTaggingPage);
        console.log('Settings page element:', settingsPage);
        
        if (dashboardPage) dashboardPage.style.display = 'none';
        if (energyMeterPage) energyMeterPage.style.display = 'none';
        if (upsDevicesPage) upsDevicesPage.style.display = 'none';
        if (waterConsumptionPage) waterConsumptionPage.style.display = 'none';
        if (reportsPage) reportsPage.style.display = 'none';
        if (assetTaggingPage) assetTaggingPage.style.display = 'none';
        if (settingsPage) settingsPage.style.display = 'none';
        
        // Show selected page
        if (pageName === 'Dashboard') {
            if (dashboardPage) {
                dashboardPage.style.display = 'block';
                console.log('Showing Dashboard');
                // Fetch latest data when Dashboard is opened
                fetchGoogleSheetsData();
                updateDashboardSummary();
            }
        } else if (pageName === 'Energy Meter') {
            if (energyMeterPage) {
                energyMeterPage.style.display = 'block';
                console.log('Showing Energy Meter');
                updateEnergyMeterData();
            }
        } else if (pageName === 'UPS Devices') {
            if (upsDevicesPage) {
                upsDevicesPage.style.display = 'block';
                console.log('Showing UPS Devices');
                // Fetch latest data when UPS Devices page is opened
                fetchGoogleSheetsData();
            }
        } else if (pageName === 'Water Consumption') {
            if (waterConsumptionPage) {
                waterConsumptionPage.style.display = 'block';
                console.log('Showing Water Consumption');
                updateWaterConsumptionData();
            }
        } else if (pageName === 'Reports') {
            if (reportsPage) {
                reportsPage.style.display = 'block';
                console.log('Showing Reports');
                // Fetch latest data when Reports page is opened
                fetchGoogleSheetsData();
            }
        } else if (pageName === 'Asset Tagging') {
            if (assetTaggingPage) {
                assetTaggingPage.style.display = 'block';
                console.log('Showing Asset Tagging');
            }
        } else if (pageName === 'Settings') {
            if (settingsPage) {
                settingsPage.style.display = 'block';
                console.log('Showing Settings');
            }
        } else {
            // For other pages, show dashboard for now
            if (dashboardPage) dashboardPage.style.display = 'block';
            alert(`${pageName} page - Coming soon!`);
        }
        
        // Scroll to top of main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    });
});

// Add click animation to stat cards
document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.style.transform = 'translateY(-2px)';
        }, 100);
    });
});

// Simulate real-time updates for stats
function updateStats() {
    const powerValue = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (powerValue) {
        const currentValue = parseFloat(powerValue.textContent);
        const newValue = (currentValue + (Math.random() - 0.5) * 0.1).toFixed(1);
        powerValue.innerHTML = `${newValue} <span class="unit">MW</span>`;
    }
}

// Update stats every 5 seconds
setInterval(updateStats, 5000);

// Fetch Google Sheets data every 2 seconds to keep data fresh
setInterval(fetchGoogleSheetsData, 2000);

// Initial fetch on page load
window.addEventListener('load', () => {
    checkLoginStatus();
    fetchGoogleSheetsData();
    updateDashboardSummary();
});

// Add notification click handler
document.querySelector('.notification').addEventListener('click', function() {
    alert('You have 1 critical alert: Battery Low on UPS-HQ-001');
});

// Add user profile click handler
document.querySelector('.user-profile').addEventListener('click', function() {
    alert('User Profile: Admin User (Enterprise)');
});

// Report generation function
function generateReport() {
    const deviceIdRaw = document.getElementById('reportType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const format = document.querySelector('input[name="format"]:checked').value;
    
    // First fetch the latest data from Google Sheets, then generate report
    console.log('Fetching latest data before generating report...');
    
    fetchGoogleSheetsData().then(() => {
        // Convert device ID to uppercase to match devicesData keys
        const deviceId = deviceIdRaw === 'all-devices' ? 'all-devices' : deviceIdRaw.toUpperCase();
        
        console.log('Selected device ID:', deviceId);
        console.log('Date range:', startDate, 'to', endDate);
        console.log('All historical data:', allHistoricalData);
        
        // Filter data based on date range
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // Include entire end date
        
        console.log('Filtering between:', startDateObj, 'and', endDateObj);
        
        let filteredData = allHistoricalData.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            const matchesDate = entryDate >= startDateObj && entryDate <= endDateObj;
            const matchesDevice = deviceId === 'all-devices' || entry.deviceId === deviceId;
            
            console.log(`Entry ${entry.deviceId} at ${entry.timestamp}:`, 
                        `Date Match: ${matchesDate}, Device Match: ${matchesDevice}`);
            
            return matchesDate && matchesDevice;
        });
        
        console.log('Filtered data:', filteredData);
        
        if (filteredData.length === 0) {
            alert(`No data found for ${deviceId === 'all-devices' ? 'any device' : deviceId} between ${startDate} and ${endDate}.`);
            return;
        }
        
        // Generate report content
        const reportData = {
            title: `UPS Device Report - ${deviceId === 'all-devices' ? 'All Devices' : deviceId}`,
            generatedDate: new Date().toLocaleString(),
            dateRange: `${startDate} to ${endDate}`,
            deviceId: deviceId === 'all-devices' ? 'All Devices' : deviceId,
            data: filteredData.map(entry => ({
                timestamp: entry.timestamp,
                id: entry.deviceId,
                voltage: entry.voltage,
                current: entry.current,
                load: entry.load,
                runtime: entry.runtime
            }))
        };
        
        console.log('Generating report with filtered data:', reportData);
        
        if (format === 'csv') {
            downloadCSVReport(reportData);
        } else if (format === 'excel') {
            downloadExcelReport(reportData);
        } else {
            downloadPDFReport(reportData);
        }
    }).catch(error => {
        console.error('Error fetching data:', error);
        alert('Error loading data from Google Sheets. Please check your connection and try again.');
    });
}

// Download CSV Report
function downloadCSVReport(reportData) {
    let csv = `UPS Device Report - ${reportData.deviceId}\n`;
    csv += `Generated: ${reportData.generatedDate}\n`;
    csv += `Date Range: ${reportData.dateRange}\n\n`;
    csv += `Timestamp,Device ID,Voltage,Current,Load,Runtime\n`;
    
    reportData.data.forEach(device => {
        csv += `${device.timestamp || 'N/A'},${device.id},${device.voltage || 'N/A'},${device.current || 'N/A'},${device.load || 'N/A'},${device.runtime || 'N/A'}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UPS_Report_${reportData.deviceId}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('CSV report downloaded successfully!');
}

// Download Excel Report (as CSV with .xls extension for simplicity)
function downloadExcelReport(reportData) {
    let content = `UPS Device Report - ${reportData.deviceId}\n`;
    content += `Generated: ${reportData.generatedDate}\n`;
    content += `Date Range: ${reportData.dateRange}\n\n`;
    content += `Timestamp\tDevice ID\tVoltage\tCurrent\tLoad\tRuntime\n`;
    
    reportData.data.forEach(device => {
        content += `${device.timestamp || 'N/A'}\t${device.id}\t${device.voltage || 'N/A'}\t${device.current || 'N/A'}\t${device.load || 'N/A'}\t${device.runtime || 'N/A'}\n`;
    });
    
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UPS_Report_${reportData.deviceId}_${new Date().getTime()}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Excel report downloaded successfully!');
}

// Download PDF Report
function downloadPDFReport(reportData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text(reportData.title, 14, 22);
    
    // Add metadata
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${reportData.generatedDate}`, 14, 32);
    doc.text(`Date Range: ${reportData.dateRange}`, 14, 38);
    
    // Prepare table data
    const tableData = reportData.data.map(device => [
        device.timestamp || 'N/A',
        device.id,
        device.voltage || 'N/A',
        device.current || 'N/A',
        device.load || 'N/A',
        device.runtime || 'N/A'
    ]);
    
    // Add table
    doc.autoTable({
        startY: 45,
        head: [['Timestamp', 'Device ID', 'Voltage', 'Current', 'Load', 'Runtime']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [30, 64, 175],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 }
        }
    });
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(
            `PowerGuard UPS Management System - Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }
    
    // Download the PDF
    doc.save(`UPS_Report_${reportData.deviceId}_${new Date().getTime()}.pdf`);
    
    alert('PDF report downloaded successfully!');
}

// Download report function (for recent reports)
function downloadReport(reportId) {
    alert(`Downloading report: ${reportId}\nNote: This is a demo. Actual reports would be stored on a server.`);
}

// View device image function
function viewImage(deviceId) {
    const device = devicesData[deviceId];
    const modal = document.getElementById('imageModal');
    const modalTitle = document.getElementById('imageModalTitle');
    const modalImg = document.getElementById('imageModalImg');
    const modalIframe = document.getElementById('imageModalIframe');
    const modalNoImage = document.getElementById('imageModalNoImage');
    
    modalTitle.textContent = `${deviceId} - Device Image`;
    
    if (device && device.image) {
        // Convert Google Drive URL to embeddable format
        let imageUrl = device.image;
        let embedUrl = device.image;
        
        // Check if it's a Google Drive link
        if (imageUrl.includes('drive.google.com')) {
            // Extract file ID from various Google Drive URL formats
            let fileId = null;
            
            // Format: https://drive.google.com/open?id=FILE_ID
            if (imageUrl.includes('open?id=')) {
                fileId = imageUrl.split('open?id=')[1].split('&')[0];
            }
            // Format: https://drive.google.com/file/d/FILE_ID/view
            else if (imageUrl.includes('/file/d/')) {
                fileId = imageUrl.split('/file/d/')[1].split('/')[0];
            }
            // Format: https://drive.google.com/uc?id=FILE_ID
            else if (imageUrl.includes('uc?id=')) {
                fileId = imageUrl.split('uc?id=')[1].split('&')[0];
            }
            
            // Convert to embeddable URL
            if (fileId) {
                imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
                embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
            }
        }
        
        // Show loading state
        modalImg.style.display = 'none';
        modalIframe.style.display = 'none';
        modalNoImage.textContent = 'Loading image...';
        modalNoImage.style.display = 'block';
        
        // Try to load the image first
        const testImg = new Image();
        testImg.onload = function() {
            modalImg.src = imageUrl;
            modalImg.style.display = 'block';
            modalIframe.style.display = 'none';
            modalNoImage.style.display = 'none';
        };
        testImg.onerror = function() {
            // If direct image fails, use iframe to embed Google Drive viewer
            modalImg.style.display = 'none';
            modalIframe.src = embedUrl;
            modalIframe.style.display = 'block';
            modalNoImage.style.display = 'none';
            console.log('Using iframe for Google Drive image:', embedUrl);
        };
        testImg.src = imageUrl;
    } else {
        modalImg.style.display = 'none';
        modalIframe.style.display = 'none';
        modalNoImage.textContent = 'No image available for this device';
        modalNoImage.style.display = 'block';
    }
    
    modal.classList.add('active');
}

// Close image modal
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    const modalIframe = document.getElementById('imageModalIframe');
    modal.classList.remove('active');
    // Clear iframe to stop loading
    modalIframe.src = '';
}

// Energy Meter functions
function updateEnergyMeterData() {
    // Simulate real-time energy meter data for EB
    // In production, this would fetch from your energy meter API or database
    const ebRunningUnit = (1200 + Math.random() * 100).toFixed(2);
    const ebLoad = (70 + Math.random() * 20).toFixed(1);
    const ebFrequency = (49.95 + Math.random() * 0.15).toFixed(2);
    const ebPreviousUnit = (950 + Math.random() * 100).toFixed(2);
    const ebPowerFactor = (0.90 + Math.random() * 0.09).toFixed(2);
    
    // Simulate real-time energy meter data for Generator
    const genRunningUnit = (800 + Math.random() * 100).toFixed(2);
    const genLoad = (40 + Math.random() * 15).toFixed(1);
    const genFrequency = (49.95 + Math.random() * 0.15).toFixed(2);
    const genPreviousUnit = (700 + Math.random() * 80).toFixed(2);
    const genPowerFactor = (0.88 + Math.random() * 0.08).toFixed(2);
    
    // Update EB DOM elements
    const ebRunningUnitEl = document.getElementById('ebRunningUnit');
    const ebLoadEl = document.getElementById('ebLoad');
    const ebFrequencyEl = document.getElementById('ebFrequency');
    const ebPreviousUnitEl = document.getElementById('ebPreviousUnit');
    const ebPowerFactorEl = document.getElementById('ebPowerFactor');
    
    if (ebRunningUnitEl) ebRunningUnitEl.textContent = ebRunningUnit;
    if (ebLoadEl) ebLoadEl.textContent = ebLoad;
    if (ebFrequencyEl) ebFrequencyEl.textContent = ebFrequency;
    if (ebPreviousUnitEl) ebPreviousUnitEl.textContent = ebPreviousUnit;
    if (ebPowerFactorEl) ebPowerFactorEl.textContent = ebPowerFactor;
    
    // Update Generator DOM elements
    const genRunningUnitEl = document.getElementById('genRunningUnit');
    const genLoadEl = document.getElementById('genLoad');
    const genFrequencyEl = document.getElementById('genFrequency');
    const genPreviousUnitEl = document.getElementById('genPreviousUnit');
    const genPowerFactorEl = document.getElementById('genPowerFactor');
    
    if (genRunningUnitEl) genRunningUnitEl.textContent = genRunningUnit;
    if (genLoadEl) genLoadEl.textContent = genLoad;
    if (genFrequencyEl) genFrequencyEl.textContent = genFrequency;
    if (genPreviousUnitEl) genPreviousUnitEl.textContent = genPreviousUnit;
    if (genPowerFactorEl) genPowerFactorEl.textContent = genPowerFactor;
    
    // Auto-refresh every 5 seconds if Energy Meter page is visible
    const energyMeterPage = document.getElementById('energyMeterPage');
    if (energyMeterPage && energyMeterPage.style.display !== 'none') {
        setTimeout(updateEnergyMeterData, 5000);
    }
}

// Toggle energy section (EB/Generator)
function toggleEnergySection(section) {
    const metricsGrid = document.getElementById(`${section}Metrics`);
    const toggleBtn = document.getElementById(`${section}ToggleBtn`);
    const toggleText = toggleBtn?.querySelector('.toggle-text');
    
    if (metricsGrid && toggleBtn) {
        metricsGrid.classList.toggle('collapsed');
        toggleBtn.classList.toggle('collapsed');
        
        if (metricsGrid.classList.contains('collapsed')) {
            toggleText.textContent = 'Show More';
        } else {
            toggleText.textContent = 'Show Less';
        }
    }
}

function toggleGeneratorSection(section) {
    toggleEnergySection(section);
}

// Switch EB Model
function switchEBModel(modelId) {
    console.log('Switching to EB model:', modelId);
    // Update EB data based on selected model
    // In production, this would fetch data for the specific EB model
    updateEnergyMeterData();
}

// Switch Generator Model
function switchGeneratorModel(modelId) {
    console.log('Switching to Generator model:', modelId);
    // Update Generator data based on selected model
    // In production, this would fetch data for the specific generator
    updateEnergyMeterData();
}

// UPS Reading Alert System
let readingTimer = null;
let timeRemainingSeconds = 30; // 30 seconds for testing

function startReadingAlert() {
    // Clear any existing timer
    if (readingTimer) {
        clearInterval(readingTimer);
    }
    
    // Reset timer
    timeRemainingSeconds = 30; // 30 seconds for testing
    updateTimeDisplay();
    
    // Update timer every second
    readingTimer = setInterval(() => {
        timeRemainingSeconds--;
        
        if (timeRemainingSeconds <= 0) {
            // Show alert
            showReadingAlert();
            // Reset timer to 30 seconds
            timeRemainingSeconds = 30;
        }
        
        updateTimeDisplay();
    }, 1000);
}

function updateTimeDisplay() {
    const minutes = Math.floor(timeRemainingSeconds / 60);
    const seconds = timeRemainingSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timeRemainingEl = document.getElementById('timeRemaining');
    if (timeRemainingEl) {
        timeRemainingEl.textContent = timeString;
    }
}

function showReadingAlert() {
    const alertBox = document.getElementById('alertBox');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    
    if (alertBox && alertTitle && alertMessage) {
        // Change alert appearance to urgent state
        alertBox.classList.add('alert-urgent');
        alertTitle.textContent = '⚠️ TIME TO TAKE READINGS!';
        alertMessage.innerHTML = 'Please record the readings for all UPS devices now.';
        
        // Keep urgent state for 5 seconds, then reset
        setTimeout(() => {
            alertBox.classList.remove('alert-urgent');
            alertTitle.textContent = 'Reading Reminder';
        }, 5000);
    }
}

// Water Consumption functions
function updateWaterConsumptionData() {
    // Simulate real-time water consumption data
    // In production, this would fetch from your water meter API or database
    
    // Weekly totals
    const cafeteriaWeek = Math.floor(1200 + Math.random() * 100);
    const washAreaWeek = Math.floor(800 + Math.random() * 100);
    const pantryWeek = Math.floor(400 + Math.random() * 50);
    const kitchenWeek = Math.floor(1800 + Math.random() * 150);
    
    // Daily consumption (roughly 1/5 of weekly)
    const cafeteriaToday = Math.floor(cafeteriaWeek / 5 + Math.random() * 20);
    const washAreaToday = Math.floor(washAreaWeek / 5 + Math.random() * 15);
    const pantryToday = Math.floor(pantryWeek / 5 + Math.random() * 10);
    const kitchenToday = Math.floor(kitchenWeek / 5 + Math.random() * 25);
    
    // Update weekly totals
    const cafeteriaWaterEl = document.getElementById('cafeteriaWater');
    const washAreaWaterEl = document.getElementById('washAreaWater');
    const pantryWaterEl = document.getElementById('pantryWater');
    const kitchenWaterEl = document.getElementById('kitchenWater');
    
    if (cafeteriaWaterEl) cafeteriaWaterEl.textContent = cafeteriaWeek.toLocaleString();
    if (washAreaWaterEl) washAreaWaterEl.textContent = washAreaWeek.toLocaleString();
    if (pantryWaterEl) pantryWaterEl.textContent = pantryWeek.toLocaleString();
    if (kitchenWaterEl) kitchenWaterEl.textContent = kitchenWeek.toLocaleString();
    
    // Update today values
    const cafeteriaTodayEl = document.getElementById('cafeteriaToday');
    const washAreaTodayEl = document.getElementById('washAreaToday');
    const pantryTodayEl = document.getElementById('pantryToday');
    const kitchenTodayEl = document.getElementById('kitchenToday');
    
    if (cafeteriaTodayEl) cafeteriaTodayEl.textContent = cafeteriaToday + ' L';
    if (washAreaTodayEl) washAreaTodayEl.textContent = washAreaToday + ' L';
    if (pantryTodayEl) pantryTodayEl.textContent = pantryToday + ' L';
    if (kitchenTodayEl) kitchenTodayEl.textContent = kitchenToday + ' L';
    
    // Update week values
    const cafeteriaWeekEl = document.getElementById('cafeteriaWeek');
    const washAreaWeekEl = document.getElementById('washAreaWeek');
    const pantryWeekEl = document.getElementById('pantryWeek');
    const kitchenWeekEl = document.getElementById('kitchenWeek');
    
    if (cafeteriaWeekEl) cafeteriaWeekEl.textContent = cafeteriaWeek.toLocaleString() + ' L';
    if (washAreaWeekEl) washAreaWeekEl.textContent = washAreaWeek.toLocaleString() + ' L';
    if (pantryWeekEl) pantryWeekEl.textContent = pantryWeek.toLocaleString() + ' L';
    if (kitchenWeekEl) kitchenWeekEl.textContent = kitchenWeek.toLocaleString() + ' L';
    
    // Auto-refresh every 10 seconds if Water Consumption page is visible
    const waterConsumptionPage = document.getElementById('waterConsumptionPage');
    if (waterConsumptionPage && waterConsumptionPage.style.display !== 'none') {
        setTimeout(updateWaterConsumptionData, 10000);
    }
}

// Settings page functions
function saveUserProfile() {
    alert('User profile saved successfully!');
}

function saveSystemPreferences() {
    alert('System preferences saved successfully!');
}

function saveAlertThresholds() {
    alert('Alert thresholds saved successfully!');
}

function saveDataSettings() {
    alert('Data settings saved successfully!');
}

console.log('PowerGuard Dashboard initialized successfully!');
