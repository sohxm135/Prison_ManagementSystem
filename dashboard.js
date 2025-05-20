async function fetchDashboardData() {
    const response = await fetch('/api/dashboard');
    const data = await response.json();
    
    document.querySelector('.card:nth-child(1) .card-value').textContent = data.totalPrisoners;
    document.querySelector('.card:nth-child(2) .card-value').textContent = data.occupancyRate.toFixed(2) + '%';
    document.querySelector('.card:nth-child(3) .card-value').textContent = data.releasesThisMonth;
    document.querySelector('.card:nth-child(4) .card-value').textContent = data.incidents;
}

async function fetchRecentAdmissions() {
    const response = await fetch('/api/prisoners');
    const prisoners = await response.json();
    
    const tbody = document.querySelector('.data-table table tbody');
    tbody.innerHTML = '';
    
    prisoners.forEach(prisoner => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>P-${prisoner[0]}</td>
            <td>${prisoner[1]}</td>
            <td>${prisoner[2]}</td>
            <td>${prisoner[5]}</td>
            <td>${new Date(prisoner[6]).toLocaleDateString()}</td>
            <td>${prisoner[7]} months</td>
            <td class="actions">
                <button class="view-btn"><i class="fas fa-eye"></i></button>
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
    fetchRecentAdmissions();
});
