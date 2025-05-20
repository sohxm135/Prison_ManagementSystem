// Global variables
let allVisitors = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch visitors data
    fetchAllVisitors();
    
    // Add event listener for sidebar toggle
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Add event listener for search
    const searchInput = document.querySelector('.filter-group input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterVisitors(this.value.toLowerCase());
        });
    }
    
    // Add event listener for date filter
    const dateInput = document.querySelector('.filter-group input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            filterVisitorsByDate(this.value);
        });
    }
    
    // Add event listener for filter button
    const filterButton = document.querySelector('.filter-group .btn:first-of-type');
    if (filterButton) {
        filterButton.addEventListener('click', function() {
            applyAllFilters();
        });
    }
    
    // Add event listener for add visitor button
    const addVisitorBtn = document.querySelector('.filter-group .add-visitor-btn, .add-visitor-btn');
    if (addVisitorBtn) {
        addVisitorBtn.addEventListener('click', function() {
            showAddVisitorModal();
        });
    }
});

// Fetch all visitors
function fetchAllVisitors() {
    // Show loading state
    const tableBody = document.querySelector('.data-table table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-data">
                    <i class="fas fa-spinner fa-spin"></i> Loading visitors data...
                </td>
            </tr>
        `;
    }
    
    fetch('/api/visitors')
        .then(response => response.json())
        .then(data => {
            allVisitors = data;
            renderVisitorsTable(allVisitors);
        })
        .catch(err => {
            console.error('Error fetching visitors:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="error-data">
                            <i class="fas fa-exclamation-triangle"></i> Failed to load visitors. Please try again later.
                        </td>
                    </tr>
                `;
            }
        });
}

// Render visitors table - Updated
function renderVisitorsTable(visitors) {
    const tableBody = document.querySelector('.data-table table tbody');
    if (!tableBody) return;
    
    if (visitors.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-data">
                    No visitors found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Add rows for each visitor
    visitors.forEach(visitor => {
        const row = document.createElement('tr');
        
        // Format dates
        const visitDate = new Date(visitor.visit_date);
        const formattedVisitDate = visitDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td>${visitor.visitorID}</td>
            <td>${visitor.name}</td>
            <td>${visitor.prisonerID}</td>
            <td>${visitor.prisoner_name || 'Unknown'}</td>
            <td>${visitor.relation || 'Not specified'}</td>
            <td>${formattedVisitDate}</td>
            <td>${visitor.visit_time}</td>
            <td>
                <button class="btn edit-btn" data-id="${visitor.visitorID}">Edit</button>
                <button class="btn delete-btn" data-id="${visitor.visitorID}">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            const visitorId = this.getAttribute('data-id');
            editVisitor(visitorId);
        });
        
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const visitorId = this.getAttribute('data-id');
            confirmDeleteVisitor(visitorId);
        });
    });
}

// Format time from database (HH:MM:SS) to readable format (HH:MM AM/PM)
function formatTime(time) {
    if (!time) return 'N/A';
    
    // If time is just a string like "10:30", we need to parse it differently
    if (typeof time === 'string' && !time.includes(':')) {
        // Handle basic times
        return time;
    }
    
    let hours, minutes;
    
    // Handle Oracle time format
    if (typeof time === 'object' && time.hours !== undefined) {
        hours = time.hours;
        minutes = time.minutes || 0;
    } else if (typeof time === 'string') {
        // Handle string time format "HH:MM:SS"
        const parts = time.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
    } else {
        return time; // Return as is if we can't parse it
    }
    
    // Format to 12-hour clock with AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
}

// Filter visitors by search term
function filterVisitors(searchTerm) {
    if (!searchTerm) {
        const dateInput = document.querySelector('.filter-group input[type="date"]');
        if (dateInput && dateInput.value) {
            filterVisitorsByDate(dateInput.value);
        } else {
            renderVisitorsTable(allVisitors);
        }
        return;
    }
    
    const filteredVisitors = allVisitors.filter(visitor => 
        visitor.visitorID.toLowerCase().includes(searchTerm) ||
        visitor.name.toLowerCase().includes(searchTerm) ||
        visitor.prisonerID.toLowerCase().includes(searchTerm) ||
        (visitor.prisoner_name && visitor.prisoner_name.toLowerCase().includes(searchTerm)) ||
        (visitor.relation && visitor.relation.toLowerCase().includes(searchTerm))
    );
    
    renderVisitorsTable(filteredVisitors);
}

// Filter visitors by date
function filterVisitorsByDate(dateString) {
    if (!dateString) {
        const searchInput = document.querySelector('.filter-group input[type="text"]');
        if (searchInput && searchInput.value) {
            filterVisitors(searchInput.value.toLowerCase());
        } else {
            renderVisitorsTable(allVisitors);
        }
        return;
    }
    
    // Format the selected date to match database format (YYYY-MM-DD)
    const selectedDate = new Date(dateString);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedSelectedDate = `${year}-${month}-${day}`;
    
    const filteredVisitors = allVisitors.filter(visitor => {
        const visitDate = new Date(visitor.visit_date);
        const visitYear = visitDate.getFullYear();
        const visitMonth = String(visitDate.getMonth() + 1).padStart(2, '0');
        const visitDay = String(visitDate.getDate()).padStart(2, '0');
        const formattedVisitDate = `${visitYear}-${visitMonth}-${visitDay}`;
        
        return formattedVisitDate === formattedSelectedDate;
    });
    
    renderVisitorsTable(filteredVisitors);
}

// Apply all filters
function applyAllFilters() {
    const searchTerm = document.querySelector('.filter-group input[type="text"]').value.toLowerCase();
    const dateString = document.querySelector('.filter-group input[type="date"]').value;
    
    let filteredVisitors = [...allVisitors];
    
    // Apply search filter
    if (searchTerm) {
        filteredVisitors = filteredVisitors.filter(visitor => 
            visitor.visitorID.toLowerCase().includes(searchTerm) ||
            visitor.name.toLowerCase().includes(searchTerm) ||
            visitor.prisonerID.toLowerCase().includes(searchTerm) ||
            (visitor.prisoner_name && visitor.prisoner_name.toLowerCase().includes(searchTerm)) ||
            (visitor.relation && visitor.relation.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply date filter
    if (dateString) {
        // Format date for comparison
        const selectedDate = new Date(dateString);
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedSelectedDate = `${year}-${month}-${day}`;
        
        filteredVisitors = filteredVisitors.filter(visitor => {
            const visitDate = new Date(visitor.visit_date);
            const visitYear = visitDate.getFullYear();
            const visitMonth = String(visitDate.getMonth() + 1).padStart(2, '0');
            const visitDay = String(visitDate.getDate()).padStart(2, '0');
            const formattedVisitDate = `${visitYear}-${visitMonth}-${visitDay}`;
            
            return formattedVisitDate === formattedSelectedDate;
        });
    }
    
    renderVisitorsTable(filteredVisitors);
}

// Show add visitor modal - Updated
function showAddVisitorModal() {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Set current date as default for date input
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content - updated for visit_time instead of start_time and end_time
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Add New Visitor</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-visitor-form">
                    <div class="form-group">
                        <label for="visitor-id">Visitor ID</label>
                        <input type="text" id="visitor-id" placeholder="Enter Visitor ID (e.g., V123)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="visitor-name">Visitor Name</label>
                        <input type="text" id="visitor-name" placeholder="Enter Visitor Name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner</label>
                        <select id="prisoner-id" required>
                            <option value="">Select Prisoner</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="visitor-relation">Relation to Prisoner</label>
                        <input type="text" id="visitor-relation" placeholder="Enter Relation (e.g., Family, Friend)">
                    </div>
                    
                    <div class="form-group">
                        <label for="visit-date">Visit Date</label>
                        <input type="date" id="visit-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="visit-time">Visit Time</label>
                        <input type="text" id="visit-time" placeholder="e.g., 2:30 PM" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Visitor</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Load prisoners for dropdown
    loadPrisonerDropdown();
    
    // Add event listener for close button
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for cancel button
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#add-visitor-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewVisitor(form);
    });
}

// Load prisoners for dropdown
function loadPrisonerDropdown() {
    fetch('/api/prisoners')
        .then(response => response.json())
        .then(data => {
            const prisonerSelect = document.getElementById('prisoner-id');
            if (prisonerSelect) {
                data.forEach(prisoner => {
                    const option = document.createElement('option');
                    option.value = prisoner.prisonerID;
                    option.textContent = `${prisoner.name} (${prisoner.prisonerID})`;
                    prisonerSelect.appendChild(option);
                });
            }
        })
        .catch(err => {
            console.error('Error loading prisoners:', err);
        });
}

// Add new visitor - Updated
function addNewVisitor(form) {
    const visitorId = form.querySelector('#visitor-id').value;
    const name = form.querySelector('#visitor-name').value;
    const prisonerId = form.querySelector('#prisoner-id').value;
    const relation = form.querySelector('#visitor-relation').value;
    const visitDate = form.querySelector('#visit-date').value;
    const visitTime = form.querySelector('#visit-time').value;
    
    // Create visitor object with visit_time instead of start_time and end_time
    const newVisitor = {
        visitorID: visitorId,
        name,
        prisonerID: prisonerId,
        relation: relation || null,
        visit_date: visitDate,
        visit_time: visitTime
    };
    
    // Send data to server
    fetch('/api/visitors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newVisitor)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success notification
            showNotification('Visitor added successfully', 'success');
            
            // Refresh visitors data
            fetchAllVisitors();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to add visitor', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding visitor:', err);
        showNotification('Failed to add visitor. Please try again later.', 'error');
    });
}

// Edit visitor
function editVisitor(visitorId) {
    // First, get the visitor details
    fetch(`/api/visitors/${visitorId}`)
        .then(response => response.json())
        .then(visitor => {
            showEditVisitorModal(visitor);
        })
        .catch(err => {
            console.error('Error fetching visitor details:', err);
            showNotification('Failed to load visitor details.', 'error');
        });
}

// Show edit visitor modal - Updated
function showEditVisitorModal(visitor) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Format date for the input field (YYYY-MM-DD)
    const visitDate = new Date(visitor.visit_date);
    const formattedDate = visitDate.toISOString().split('T')[0];
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content - updated for visit_time instead of start_time and end_time
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Visitor</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-visitor-form">
                    <input type="hidden" id="visitor-id" value="${visitor.visitorID}">
                    
                    <div class="form-group">
                        <label for="visitor-name">Visitor Name</label>
                        <input type="text" id="visitor-name" value="${visitor.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner ID</label>
                        <input type="text" id="prisoner-id" value="${visitor.prisonerID}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="visitor-relation">Relation to Prisoner</label>
                        <input type="text" id="visitor-relation" value="${visitor.relation || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="visit-date">Visit Date</label>
                        <input type="date" id="visit-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="visit-time">Visit Time</label>
                        <input type="text" id="visit-time" value="${visitor.visit_time || ''}" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to DOM
    document.body.appendChild(modalContainer);
    currentModal = modalContainer;
    
    // Add event listener for close button
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for cancel button
    modalContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
        currentModal = null;
    });
    
    // Add event listener for form submission
    const form = modalContainer.querySelector('#edit-visitor-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateVisitor(form);
    });
}

// Update visitor - Updated
function updateVisitor(form) {
    const visitorId = form.querySelector('#visitor-id').value;
    const name = form.querySelector('#visitor-name').value;
    const relation = form.querySelector('#visitor-relation').value;
    const visitDate = form.querySelector('#visit-date').value;
    const visitTime = form.querySelector('#visit-time').value;
    
    // Create updated visitor object with visit_time instead of start_time and end_time
    const updatedVisitor = {
        name,
        relation: relation || null,
        visit_date: visitDate,
        visit_time: visitTime
    };
    
    // Send data to server
    fetch(`/api/visitors/${visitorId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedVisitor)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            if (currentModal) {
                document.body.removeChild(currentModal);
                currentModal = null;
            }
            
            // Show success notification
            showNotification('Visitor updated successfully', 'success');
            
            // Refresh visitors data
            fetchAllVisitors();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to update visitor', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating visitor:', err);
        showNotification('Failed to update visitor. Please try again later.', 'error');
    });
}

// Confirm delete visitor
function confirmDeleteVisitor(visitorId) {
    if (confirm(`Are you sure you want to delete visitor with ID ${visitorId}? This action cannot be undone.`)) {
        deleteVisitor(visitorId);
    }
}

// Delete visitor
function deleteVisitor(visitorId) {
    fetch(`/api/visitors/${visitorId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Visitor deleted successfully', 'success');
            
            // Refresh visitors data
            fetchAllVisitors();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete visitor', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting visitor:', err);
        showNotification('Failed to delete visitor. Please try again later.', 'error');
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listener for close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 5000);
}