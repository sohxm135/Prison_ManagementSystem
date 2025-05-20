document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    fetchDashboardData();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Update the current date
    updateCurrentDate();
});

// Update the current date display
function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    const welcomeMessage = document.querySelector('.main-content > p');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome to SecureGuard Prison Management System. Today is ${dateString}.`;
    }
}

// Fetch all dashboard data
async function fetchDashboardData() {
    try {
        // Fetch data in parallel
        const [totalPrisoners, jailInfo, incidents, recentAdmissions] = await Promise.all([
            fetchTotalPrisoners(),
            fetchJailInfo(),
            fetchIncidents(),
            fetchRecentAdmissions()
        ]);
        
        // Update the dashboard UI with the fetched data
        updatePrisonerCount(totalPrisoners);
        // Pass correct values for occupancy calculation
        updateOccupancyRate(jailInfo.occupancy, jailInfo.capacity);
        updateJailInfo(jailInfo);
        updateIncidentCount(incidents);
        updateRecentAdmissions(recentAdmissions);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data. Please try again later.');
    }
}

// Fetch total prisoner count
async function fetchTotalPrisoners() {
    const response = await fetch('/api/dashboard/prisoners/count');
    const data = await response.json();
    return data.count;
}

// Fetch jail information (total capacity, occupancy, and jail count)
async function fetchJailInfo() {
    const response = await fetch('/api/dashboard/jails/info');
    const data = await response.json();
    return data;
}

// Fetch incident count
async function fetchIncidents() {
    const response = await fetch('/api/dashboard/incidents/count');
    const data = await response.json();
    return data.count;
}

// Fetch recent admissions (5 most recent prisoners)
async function fetchRecentAdmissions() {
    const response = await fetch('/api/dashboard/prisoners/recent');
    const data = await response.json();
    return data;
}

// Update the prisoner count on the dashboard
function updatePrisonerCount(count) {
    const prisonerCountElement = document.querySelector('.dashboard-cards .card:nth-child(1) .card-value');
    if (prisonerCountElement) {
        prisonerCountElement.textContent = count.toLocaleString();
    }
}

// Update the occupancy rate on the dashboard
function updateOccupancyRate(totalPrisoners, totalCells) {
    const occupancyRateElement = document.querySelector('.dashboard-cards .card:nth-child(2) .card-value');
    if (occupancyRateElement && totalCells > 0) {
        const rate = Math.min(Math.round((totalPrisoners / totalCells) * 100), 100);
        occupancyRateElement.textContent = `${rate}%`;
    }
}

// Update the jail info card (replacing "Release This Month")
function updateJailInfo(jailInfo) {
    const jailInfoCard = document.querySelector('.dashboard-cards .card:nth-child(3)');
    
    if (jailInfoCard) {
        // Update icon, title, and color
        const cardIcon = jailInfoCard.querySelector('.card-icon');
        if (cardIcon) {
            cardIcon.className = 'card-icon info';
            cardIcon.innerHTML = '<i class="fas fa-building"></i>';
        }
        
        // Update title
        const cardTitle = jailInfoCard.querySelector('.card-title');
        if (cardTitle) {
            cardTitle.textContent = 'Total Jails';
        }
        
        // Update value
        const cardValue = jailInfoCard.querySelector('.card-value');
        if (cardValue) {
            cardValue.textContent = jailInfo.jailCount;
        }
    }
}

// Update the incident count on the dashboard
function updateIncidentCount(count) {
    const incidentCountElement = document.querySelector('.dashboard-cards .card:nth-child(4) .card-value');
    if (incidentCountElement) {
        incidentCountElement.textContent = count;
    }
}

// Update the recent admissions table
function updateRecentAdmissions(prisoners) {
    const tableBody = document.querySelector('.data-table table tbody');
    
    if (tableBody) {
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (prisoners.length === 0) {
            // If no prisoners, show a message
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="5" class="empty-data">No recent admissions found.</td>
            `;
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Add rows for each prisoner
        prisoners.forEach(prisoner => {
            const row = document.createElement('tr');
            
            // Format date
            const imprisonmentDate = new Date(prisoner.date_of_imprisonment);
            const formattedDate = imprisonmentDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            // Format sentence (display TBD if 0)
            const sentenceDisplay = prisoner.sentence === 0 ? 'TBD' : prisoner.sentence;
            
            row.innerHTML = `
                <td>${prisoner.prisonerID}</td>
                <td>${prisoner.name}</td>
                <td>${prisoner.age}</td>
                <td>${prisoner.crime}</td>
                <td>${formattedDate}</td>
                <td>${sentenceDisplay}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
}

// Show error message on the dashboard
function showErrorMessage(message) {
    const mainContent = document.querySelector('.main-content');
    
    if (mainContent) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        `;
        
        // Insert after the welcome paragraph
        const welcomeParagraph = document.querySelector('.main-content > p');
        if (welcomeParagraph && welcomeParagraph.nextSibling) {
            mainContent.insertBefore(errorElement, welcomeParagraph.nextSibling);
        } else {
            mainContent.appendChild(errorElement);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorElement.remove();
        }, 5000);
    }
}