// Global variables to store staff data
let wardens = [];
let chiefJailors = [];
let jailors = [];
let guards = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Remove initTabs call since there are no tabs
    // fetchAllStaffData();
    
    // Add new event handlers for search
    const searchInput = document.querySelector('.prisoner-search input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterStaffBySearch(this.value.toLowerCase());
        });
    }
    
    // Add event listener for add staff button
    const addStaffBtn = document.querySelector('.staff-actions .btn');
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', function() {
            showAddStaffModal();
        });
    }
    
    // Fetch and render staff data
    fetchAllStaffData();
});

// Initialize tabs functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and content
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Fetch all staff data
function fetchAllStaffData() {
    // Show loading state
    const staffGrid = document.querySelector('.staff-grid');
    if (staffGrid) {
        staffGrid.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading staff data...</p>
            </div>
        `;
    }
    
    // Create promises for all staff fetches
    const promises = [
        fetch('/api/staff/wardens').then(res => res.json()),
        fetch('/api/staff/chief-jailors').then(res => res.json()),
        fetch('/api/staff/jailors').then(res => res.json()),
        fetch('/api/staff/guards').then(res => res.json())
    ];
    
    // Wait for all promises to resolve
    Promise.all(promises)
        .then(([wardensData, chiefJailorsData, jailorsData, guardsData]) => {
            // Store data in global variables
            wardens = wardensData;
            chiefJailors = chiefJailorsData;
            jailors = jailorsData;
            guards = guardsData;
            
            // Add role information to each staff member
            wardens.forEach(w => w.role = 'Warden');
            chiefJailors.forEach(cj => cj.role = 'Chief Jailor');
            jailors.forEach(j => j.role = 'Jailor');
            guards.forEach(g => g.role = 'Guard');
            
            // Combine all staff into a single array
            const allStaff = [...wardens, ...chiefJailors, ...jailors, ...guards];
            
            // Render staff cards
            renderStaffCards(allStaff);
        })
        .catch(err => {
            console.error('Error fetching staff data:', err);
            const staffGrid = document.querySelector('.staff-grid');
            if (staffGrid) {
                staffGrid.innerHTML = `
                    <div class="error-container">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load staff data. Please try again later.</p>
                    </div>
                `;
            }
        });
}

// Update warden table
function updateWardenTable() {
    const tbody = document.querySelector('#wardens-tab tbody');
    tbody.innerHTML = '';
    
    if (wardens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No wardens found</td></tr>';
        return;
    }
    
    wardens.forEach(warden => {
        const joinDate = new Date(warden.doj).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${warden.employeeID}</td>
            <td>${warden.name}</td>
            <td>${warden.age}</td>
            <td>${warden.gender === 'M' ? 'Male' : 'Female'}</td>
            <td>${warden.contact_no}</td>
            <td>₹${warden.salary.toLocaleString()}</td>
            <td>${joinDate}</td>
            <td>
                <button class="btn btn-primary view-details" data-staff-type="warden" data-id="${warden.employeeID}">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('#wardens-tab .view-details').forEach(button => {
        button.addEventListener('click', function() {
            const staffType = this.dataset.staffType;
            const id = this.dataset.id;
            viewStaffDetails(staffType, id);
        });
    });
}

// Update chief jailor table
function updateChiefJailorTable() {
    const tbody = document.querySelector('#chief-jailors-tab tbody');
    tbody.innerHTML = '';
    
    if (chiefJailors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No chief jailors found</td></tr>';
        return;
    }
    
    chiefJailors.forEach(chiefJailor => {
        const joinDate = new Date(chiefJailor.doj).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${chiefJailor.employeeID}</td>
            <td>${chiefJailor.name}</td>
            <td>${chiefJailor.age}</td>
            <td>${chiefJailor.gender === 'M' ? 'Male' : 'Female'}</td>
            <td>${chiefJailor.contact_no}</td>
            <td>₹${chiefJailor.salary.toLocaleString()}</td>
            <td>${joinDate}</td>
            <td>
                <button class="btn btn-primary view-details" data-staff-type="chiefJailor" data-id="${chiefJailor.employeeID}">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('#chief-jailors-tab .view-details').forEach(button => {
        button.addEventListener('click', function() {
            const staffType = this.dataset.staffType;
            const id = this.dataset.id;
            viewStaffDetails(staffType, id);
        });
    });
}

// Update jailor table
function updateJailorTable() {
    const tbody = document.querySelector('#jailors-tab tbody');
    tbody.innerHTML = '';
    
    if (jailors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No jailors found</td></tr>';
        return;
    }
    
    jailors.forEach(jailor => {
        const joinDate = new Date(jailor.doj).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${jailor.employeeID}</td>
            <td>${jailor.name}</td>
            <td>${jailor.age}</td>
            <td>${jailor.gender === 'M' ? 'Male' : 'Female'}</td>
            <td>${jailor.contact_no}</td>
            <td>₹${jailor.salary.toLocaleString()}</td>
            <td>${joinDate}</td>
            <td>
                <button class="btn btn-primary view-details" data-staff-type="jailor" data-id="${jailor.employeeID}">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('#jailors-tab .view-details').forEach(button => {
        button.addEventListener('click', function() {
            const staffType = this.dataset.staffType;
            const id = this.dataset.id;
            viewStaffDetails(staffType, id);
        });
    });
}

// Update guard table
function updateGuardTable() {
    const tbody = document.querySelector('#guards-tab tbody');
    tbody.innerHTML = '';
    
    if (guards.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No guards found</td></tr>';
        return;
    }
    
    guards.forEach(guard => {
        const joinDate = new Date(guard.doj).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${guard.employeeID}</td>
            <td>${guard.name}</td>
            <td>${guard.age}</td>
            <td>${guard.gender === 'M' ? 'Male' : 'Female'}</td>
            <td>${guard.contact_no}</td>
            <td>₹${guard.salary.toLocaleString()}</td>
            <td>${joinDate}</td>
            <td>
                <button class="btn btn-primary view-details" data-staff-type="guard" data-id="${guard.employeeID}">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('#guards-tab .view-details').forEach(button => {
        button.addEventListener('click', function() {
            const staffType = this.dataset.staffType;
            const id = this.dataset.id;
            viewStaffDetails(staffType, id);
        });
    });
}

// View staff details
function viewStaffDetails(staffType, id) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Initial modal content with loading state
    modalContainer.innerHTML = `
        <div class="modal staff-modal">
            <div class="modal-header">
                <h2>Staff Details</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading staff details...</p>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listener for close button
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Fetch staff details based on type
    switch (staffType) {
        case 'warden':
            fetchWardenDetails(id, modalContainer);
            break;
        case 'chiefJailor':
            fetchChiefJailorDetails(id, modalContainer);
            break;
        case 'jailor':
            fetchJailorDetails(id, modalContainer);
            break;
        case 'guard':
            fetchGuardDetails(id, modalContainer);
            break;
    }
}

// Fetch warden details
function fetchWardenDetails(id, modalContainer) {
    fetch(`/api/staff/wardens/${id}`)
        .then(response => response.json())
        .then(async data => {
            // Also fetch all jails (warden manages all jails)
            const jailsResponse = await fetch('/api/jails');
            const jails = await jailsResponse.json();
            
            // Get years of experience
            const yoe = data.yoe || calculateYearsOfExperience(data.doj);
            
            // Update modal content
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="staff-details">
                    <div class="staff-header">
                        <div class="staff-avatar">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="staff-title">
                            <h3>${data.name}</h3>
                            <p class="staff-role">Warden</p>
                            <p class="staff-id">ID: ${data.employeeID}</p>
                        </div>
                    </div>
                    
                    <div class="staff-info-grid">
                        <div class="info-group">
                            <label>Age</label>
                            <p>${data.age}</p>
                        </div>
                        <div class="info-group">
                            <label>Gender</label>
                            <p>${data.gender === 'M' ? 'Male' : 'Female'}</p>
                        </div>
                        <div class="info-group">
                            <label>Contact</label>
                            <p>${data.contact_no}</p>
                        </div>
                        <div class="info-group">
                            <label>Salary</label>
                            <p>₹${data.salary.toLocaleString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Date of Joining</label>
                            <p>${new Date(data.doj).toLocaleDateString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Years of Experience</label>
                            <p>${yoe}</p>
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Manages All Jails</h4>
                        <div class="managed-items">
                            <table class="managed-table">
                                <thead>
                                    <tr>
                                        <th>Jail ID</th>
                                        <th>Name</th>
                                        <th>Security Level</th>
                                        <th>Capacity</th>
                                        <th>Chief Jailor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${jails.map(jail => `
                                        <tr>
                                            <td>${jail.jailID}</td>
                                            <td>${jail.name}</td>
                                            <td>${jail.securityLevel}</td>
                                            <td>${jail.capacity}</td>
                                            <td>${jail.chiefJailorName || 'Not Assigned'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error('Error fetching warden details:', err);
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load warden details. Please try again later.</p>
                </div>
            `;
        });
}

// Fetch chief jailor details
function fetchChiefJailorDetails(id, modalContainer) {
    fetch(`/api/staff/chief-jailors/${id}`)
        .then(response => response.json())
        .then(async data => {
            // Also fetch jails managed by this chief jailor
            const jailsResponse = await fetch(`/api/staff/chief-jailors/${id}/jails`);
            const jails = await jailsResponse.json();
            
            // Get supervisees (jailors)
            const jailorsResponse = await fetch(`/api/staff/chief-jailors/${id}/jailors`);
            const jailors = await jailorsResponse.json();
            
            // Get years of experience
            const yoe = data.yoe || calculateYearsOfExperience(data.doj);
            
            // Update modal content
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="staff-details">
                    <div class="staff-header">
                        <div class="staff-avatar">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="staff-title">
                            <h3>${data.name}</h3>
                            <p class="staff-role">Chief Jailor</p>
                            <p class="staff-id">ID: ${data.employeeID}</p>
                        </div>
                    </div>
                    
                    <div class="staff-info-grid">
                        <div class="info-group">
                            <label>Age</label>
                            <p>${data.age}</p>
                        </div>
                        <div class="info-group">
                            <label>Gender</label>
                            <p>${data.gender === 'M' ? 'Male' : 'Female'}</p>
                        </div>
                        <div class="info-group">
                            <label>Contact</label>
                            <p>${data.contact_no}</p>
                        </div>
                        <div class="info-group">
                            <label>Salary</label>
                            <p>₹${data.salary.toLocaleString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Date of Joining</label>
                            <p>${new Date(data.doj).toLocaleDateString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Years of Experience</label>
                            <p>${yoe}</p>
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Manages Jails</h4>
                        <div class="managed-items">
                            ${jails.length > 0 ? `
                                <table class="managed-table">
                                    <thead>
                                        <tr>
                                            <th>Jail ID</th>
                                            <th>Name</th>
                                            <th>Security Level</th>
                                            <th>Capacity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${jails.map(jail => `
                                            <tr>
                                                <td>${jail.jailID}</td>
                                                <td>${jail.name}</td>
                                                <td>${jail.securityLevel}</td>
                                                <td>${jail.capacity}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p class="no-data">No jails assigned</p>'}
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Supervises Jailors</h4>
                        <div class="managed-items">
                            ${jailors.length > 0 ? `
                                <table class="managed-table">
                                    <thead>
                                        <tr>
                                            <th>Jailor ID</th>
                                            <th>Name</th>
                                            <th>Contact</th>
                                            <th>Experience</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${jailors.map(jailor => `
                                            <tr>
                                                <td>${jailor.employeeID}</td>
                                                <td>${jailor.name}</td>
                                                <td>${jailor.contact_no}</td>
                                                <td>${jailor.yoe || calculateYearsOfExperience(jailor.doj)} years</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p class="no-data">No jailors to supervise</p>'}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error('Error fetching chief jailor details:', err);
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load chief jailor details. Please try again later.</p>
                </div>
            `;
        });
}

// Fetch jailor details
function fetchJailorDetails(id, modalContainer) {
    fetch(`/api/staff/jailors/${id}`)
        .then(response => response.json())
        .then(async data => {
            // Fetch supervisor info (chief jailor)
            let supervisor = { name: 'Not Assigned' };
            if (data.supervisorID) {
                try {
                    const supervisorResponse = await fetch(`/api/staff/chief-jailors/${data.supervisorID}`);
                    supervisor = await supervisorResponse.json();
                } catch (e) {
                    console.error('Error fetching supervisor:', e);
                }
            }
            
            // Fetch block info
            const blocksResponse = await fetch(`/api/staff/jailors/${id}/blocks`);
            const blocks = await blocksResponse.json();
            
            // Fetch guards supervised by this jailor
            const guardsResponse = await fetch(`/api/staff/jailors/${id}/guards`);
            const guards = await guardsResponse.json();
            
            // Get years of experience
            const yoe = data.yoe || calculateYearsOfExperience(data.doj);
            
            // Update modal content
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="staff-details">
                    <div class="staff-header">
                        <div class="staff-avatar">
                            <i class="fas fa-user-lock"></i>
                        </div>
                        <div class="staff-title">
                            <h3>${data.name}</h3>
                            <p class="staff-role">Jailor</p>
                            <p class="staff-id">ID: ${data.employeeID}</p>
                        </div>
                    </div>
                    
                    <div class="staff-info-grid">
                        <div class="info-group">
                            <label>Age</label>
                            <p>${data.age}</p>
                        </div>
                        <div class="info-group">
                            <label>Gender</label>
                            <p>${data.gender === 'M' ? 'Male' : 'Female'}</p>
                        </div>
                        <div class="info-group">
                            <label>Contact</label>
                            <p>${data.contact_no}</p>
                        </div>
                        <div class="info-group">
                            <label>Salary</label>
                            <p>₹${data.salary.toLocaleString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Date of Joining</label>
                            <p>${new Date(data.doj).toLocaleDateString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Years of Experience</label>
                            <p>${yoe}</p>
                        </div>
                    </div>
                    
                    <div class="staff-section supervisor-section">
                        <h4>Reports To</h4>
                        <div class="supervisor-info">
                            <div class="supervisor-avatar">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <div class="supervisor-details">
                                <p class="supervisor-name">${supervisor.name}</p>
                                <p class="supervisor-role">Chief Jailor</p>
                                <p class="supervisor-id">${supervisor.employeeID || ''}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Manages Blocks</h4>
                        <div class="managed-items">
                            ${blocks.length > 0 ? `
                                <table class="managed-table">
                                    <thead>
                                        <tr>
                                            <th>Block ID</th>
                                            <th>Name</th>
                                            <th>Jail</th>
                                            <th>Capacity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${blocks.map(block => `
                                            <tr>
                                                <td>${block.blockID}</td>
                                                <td>${block.name}</td>
                                                <td>${block.jailName || block.jailID}</td>
                                                <td>${block.capacity}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p class="no-data">No blocks assigned</p>'}
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Supervises Guards</h4>
                        <div class="managed-items">
                            ${guards.length > 0 ? `
                                <table class="managed-table">
                                    <thead>
                                        <tr>
                                            <th>Guard ID</th>
                                            <th>Name</th>
                                            <th>Assigned Block</th>
                                            <th>Experience</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${guards.map(guard => `
                                            <tr>
                                                <td>${guard.employeeID}</td>
                                                <td>${guard.name}</td>
                                                <td>${guard.assigned_block}</td>
                                                <td>${guard.yoe || calculateYearsOfExperience(guard.doj)} years</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p class="no-data">No guards to supervise</p>'}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error('Error fetching jailor details:', err);
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load jailor details. Please try again later.</p>
                </div>
            `;
        });
}

// Fetch guard details
function fetchGuardDetails(id, modalContainer) {
    fetch(`/api/staff/guards/${id}`)
        .then(response => response.json())
        .then(async data => {
            // Fetch supervisor info (jailor)
            let supervisor = { name: 'Not Assigned' };
            if (data.supervisorID) {
                try {
                    const supervisorResponse = await fetch(`/api/staff/jailors/${data.supervisorID}`);
                    supervisor = await supervisorResponse.json();
                } catch (e) {
                    console.error('Error fetching supervisor:', e);
                }
            }
            
            // Fetch block info
            let block = { name: 'Not Assigned' };
            if (data.assigned_block) {
                try {
                    const blockResponse = await fetch(`/api/blocks/${data.assigned_block}`);
                    block = await blockResponse.json();
                } catch (e) {
                    console.error('Error fetching block:', e);
                }
            }
            
            // Fetch cells managed by this guard
            const cellsResponse = await fetch(`/api/staff/guards/${id}/cells`);
            const cells = await cellsResponse.json();
            
            // Get years of experience
            const yoe = data.yoe || calculateYearsOfExperience(data.doj);
            
            // Update modal content
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="staff-details">
                    <div class="staff-header">
                        <div class="staff-avatar">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="staff-title">
                            <h3>${data.name}</h3>
                            <p class="staff-role">Guard</p>
                            <p class="staff-id">ID: ${data.employeeID}</p>
                        </div>
                    </div>
                    
                    <div class="staff-info-grid">
                        <div class="info-group">
                            <label>Age</label>
                            <p>${data.age}</p>
                        </div>
                        <div class="info-group">
                            <label>Gender</label>
                            <p>${data.gender === 'M' ? 'Male' : 'Female'}</p>
                        </div>
                        <div class="info-group">
                            <label>Contact</label>
                            <p>${data.contact_no}</p>
                        </div>
                        <div class="info-group">
                            <label>Salary</label>
                            <p>₹${data.salary.toLocaleString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Date of Joining</label>
                            <p>${new Date(data.doj).toLocaleDateString()}</p>
                        </div>
                        <div class="info-group">
                            <label>Years of Experience</label>
                            <p>${yoe}</p>
                        </div>
                    </div>
                    
                    <div class="staff-section supervisor-section">
                        <h4>Reports To</h4>
                        <div class="supervisor-info">
                            <div class="supervisor-avatar">
                                <i class="fas fa-user-lock"></i>
                            </div>
                            <div class="supervisor-details">
                                <p class="supervisor-name">${supervisor.name}</p>
                                <p class="supervisor-role">Jailor</p>
                                <p class="supervisor-id">${supervisor.employeeID || ''}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Assigned Block</h4>
                        <div class="block-info">
                            <div class="block-icon">
                                <i class="fas fa-building"></i>
                            </div>
                            <div class="block-details">
                                <p class="block-name">${block.name}</p>
                                <p class="block-id">${block.blockID || data.assigned_block}</p>
                                <p class="block-jail">${block.jailName || ''}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="staff-section">
                        <h4>Manages Cells</h4>
                        <div class="managed-items">
                            ${cells.length > 0 ? `
                                <table class="managed-table">
                                    <thead>
                                        <tr>
                                            <th>Cell ID</th>
                                            <th>Block</th>
                                            <th>Status</th>
                                            <th>Prisoner</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${cells.map(cell => `
                                            <tr>
                                                <td>${cell.cellID}</td>
                                                <td>${cell.blockID}</td>
                                                <td>${cell.isOccupied ? 'Occupied' : 'Vacant'}</td>
                                                <td>${cell.prisonerName || 'None'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p class="no-data">No cells assigned</p>'}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(err => {
            console.error('Error fetching guard details:', err);
            const modalBody = modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load guard details. Please try again later.</p>
                </div>
            `;
        });
}

// Calculate years of experience from date of joining
function calculateYearsOfExperience(dojString) {
    const doj = new Date(dojString);
    const today = new Date();
    let years = today.getFullYear() - doj.getFullYear();
    
    // Adjust if birthday hasn't occurred yet this year
    if (today.getMonth() < doj.getMonth() || 
        (today.getMonth() === doj.getMonth() && today.getDate() < doj.getDate())) {
        years--;
    }
    
    return years;
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification"><i class="fas fa-times"></i></button>
    `;
    
    // Add notification to the DOM
    document.body.appendChild(notification);
    
    // Add event listener to close button
    const closeButton = notification.querySelector('.close-notification');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}

function renderStaffCards(staffList) {
    const staffGrid = document.querySelector('.staff-grid');
    if (!staffGrid) return;
    
    if (staffList.length === 0) {
        staffGrid.innerHTML = `
            <div class="empty-container">
                <i class="fas fa-users-slash"></i>
                <p>No staff members found.</p>
            </div>
        `;
        return;
    }
    
    // Empty the grid
    staffGrid.innerHTML = '';
    
    // Add cards for each staff member
    staffList.forEach(staff => {
        const yoe = staff.yoe || calculateYearsOfExperience(staff.doj);
        const genderDisplay = staff.gender === 'M' ? 'Male' : 'Female';
        
        // Create card element
        const cardDiv = document.createElement('div');
        cardDiv.className = 'staff-card';
        cardDiv.dataset.id = staff.employeeID;
        cardDiv.dataset.type = staff.role.toLowerCase().replace(' ', '-');
        
        // Set card content
        cardDiv.innerHTML = `
            <div class="staff-body">
                <h3 class="staff-name">${staff.name}</h3>
                <p class="staff-role">${staff.role}</p>
                <div class="staff-info">
                    <div class="staff-info-item">
                        <span class="info-label">ID</span>
                        <span class="info-value">${staff.employeeID}</span>
                    </div>
                    <div class="staff-info-item">
                        <span class="info-label">Age</span>
                        <span class="info-value">${staff.age}</span>
                    </div>
                    <div class="staff-info-item">
                        <span class="info-label">Gender</span>
                        <span class="info-value">${genderDisplay}</span>
                    </div>
                    <div class="staff-info-item">
                        <span class="info-label">Experience</span>
                        <span class="info-value">${yoe} years</span>
                    </div>
                </div>
                <div class="staff-footer">
                    <button class="view-btn">View Details</button>
                    <button class="edit-btn">Edit</button>
                </div>
            </div>
        `;
        
        // Add to the grid
        staffGrid.appendChild(cardDiv);
        
        // Add event listener for view details button
        const viewBtn = cardDiv.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => {
            const staffType = staff.role.toLowerCase().replace(' ', '');
            viewStaffDetails(staffType, staff.employeeID);
        });
        
        // Add event listener for edit button
        const editBtn = cardDiv.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
            const staffType = staff.role.toLowerCase().replace(' ', '');
            editStaffMember(staffType, staff.employeeID);
        });
    });
}

function filterStaffBySearch(searchTerm) {
    // Combine all staff into a single array for searching
    const allStaff = [...wardens, ...chiefJailors, ...jailors, ...guards];
    
    if (!searchTerm) {
        // If search term is empty, show all staff
        renderStaffCards(allStaff);
        return;
    }
    
    // Filter staff based on search term
    const filteredStaff = allStaff.filter(staff => 
        staff.name.toLowerCase().includes(searchTerm) || 
        staff.employeeID.toLowerCase().includes(searchTerm) ||
        staff.role.toLowerCase().includes(searchTerm)
    );
    
    renderStaffCards(filteredStaff);
}

function editStaffMember(staffType, id) {
    // This is just a placeholder - implement the full edit functionality
    // based on your requirements
    console.log(`Edit ${staffType} with ID: ${id}`);
    alert(`Edit functionality for ${staffType} with ID: ${id} will be implemented soon!`);
}