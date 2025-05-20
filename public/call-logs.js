// Global variables
let allCallLogs = [];
let currentModal = null;

// DOM content loaded event
document.addEventListener('DOMContentLoaded', function() {
    // Fetch call logs data
    fetchAllCallLogs();
    
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
            filterCallLogs(this.value.toLowerCase());
        });
    }
    
    // Add event listener for search button
    const searchButton = document.querySelector('.filter-group button:first-of-type');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = document.querySelector('.filter-group input[type="text"]').value.toLowerCase();
            filterCallLogs(searchTerm);
        });
    }
    
    // Add event listener for date filter
    const dateInput = document.querySelector('.filter-group input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            filterCallLogsByDate(this.value);
        });
    }
    
    // Add event listener for add call log button
    const addLogBtn = document.querySelector('.filter-group button:last-of-type, .add-call-log-btn');
    if (addLogBtn) {
        addLogBtn.addEventListener('click', function() {
            showAddCallLogModal();
        });
    }
});

// Fetch all call logs
function fetchAllCallLogs() {
    // Show loading state
    const tableBody = document.querySelector('.data-table table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-data">
                    <i class="fas fa-spinner fa-spin"></i> Loading call logs...
                </td>
            </tr>
        `;
    }
    
    fetch('/api/call-logs')
        .then(response => response.json())
        .then(data => {
            allCallLogs = data;
            renderCallLogsTable(allCallLogs);
        })
        .catch(err => {
            console.error('Error fetching call logs:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="error-data">
                            <i class="fas fa-exclamation-triangle"></i> Failed to load call logs. Please try again later.
                        </td>
                    </tr>
                `;
            }
        });
}

// Render call logs table
function renderCallLogsTable(callLogs) {
    const tableBody = document.querySelector('.data-table table tbody');
    if (!tableBody) return;
    
    if (callLogs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-data">
                    No call logs found.
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Add rows for each call log
    callLogs.forEach(log => {
        const row = document.createElement('tr');
        
        // Format date
        const callDate = new Date(log.call_date);
        const formattedDate = callDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td>${log.callLogID}</td>
            <td>${log.prisonerID}</td>
            <td>${log.prisoner_name || 'Unknown'}</td>
            <td>${log.receiver_name}</td>
            <td>${log.receiver_relation || 'Not specified'}</td>
            <td>${log.duration}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn edit-btn" data-id="${log.callLogID}">Edit</button>
                <button class="btn delete-btn" data-id="${log.callLogID}">Delete</button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listeners for buttons
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', function() {
            const logId = this.getAttribute('data-id');
            editCallLog(logId);
        });
        
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            const logId = this.getAttribute('data-id');
            confirmDeleteCallLog(logId);
        });
    });
}

// Filter call logs by search term
function filterCallLogs(searchTerm) {
    if (!searchTerm) {
        const dateInput = document.querySelector('.filter-group input[type="date"]');
        if (dateInput && dateInput.value) {
            filterCallLogsByDate(dateInput.value);
        } else {
            renderCallLogsTable(allCallLogs);
        }
        return;
    }
    
    const filteredLogs = allCallLogs.filter(log => 
        log.callLogID.toLowerCase().includes(searchTerm) ||
        log.prisonerID.toLowerCase().includes(searchTerm) ||
        (log.prisoner_name && log.prisoner_name.toLowerCase().includes(searchTerm)) ||
        log.receiver_name.toLowerCase().includes(searchTerm) ||
        (log.receiver_relation && log.receiver_relation.toLowerCase().includes(searchTerm))
    );
    
    renderCallLogsTable(filteredLogs);
}

// Filter call logs by date
function filterCallLogsByDate(dateString) {
    if (!dateString) {
        const searchInput = document.querySelector('.filter-group input[type="text"]');
        if (searchInput && searchInput.value) {
            filterCallLogs(searchInput.value.toLowerCase());
        } else {
            renderCallLogsTable(allCallLogs);
        }
        return;
    }
    
    // Format the selected date to match database format (YYYY-MM-DD)
    const selectedDate = new Date(dateString);
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedSelectedDate = `${year}-${month}-${day}`;
    
    const filteredLogs = allCallLogs.filter(log => {
        const logDate = new Date(log.call_date);
        const logYear = logDate.getFullYear();
        const logMonth = String(logDate.getMonth() + 1).padStart(2, '0');
        const logDay = String(logDate.getDate()).padStart(2, '0');
        const formattedLogDate = `${logYear}-${logMonth}-${logDay}`;
        
        return formattedLogDate === formattedSelectedDate;
    });
    
    renderCallLogsTable(filteredLogs);
}

// Show add call log modal
function showAddCallLogModal() {
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
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Add New Call Log</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="add-call-log-form">
                    <div class="form-group">
                        <label for="call-log-id">Call Log ID</label>
                        <input type="text" id="call-log-id" placeholder="Enter Call Log ID (e.g., CALL123)" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner</label>
                        <select id="prisoner-id" required>
                            <option value="">Select Prisoner</option>
                            <!-- Will be populated via JavaScript -->
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="receiver-name">Receiver Name</label>
                        <input type="text" id="receiver-name" placeholder="Enter Receiver's Name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="receiver-relation">Relation to Prisoner</label>
                        <input type="text" id="receiver-relation" placeholder="Enter Relation (e.g., Family, Friend)">
                    </div>
                    
                    <div class="form-group">
                        <label for="call-duration">Call Duration (minutes)</label>
                        <input type="text" id="call-duration" placeholder="e.g., 10 min" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="call-date">Call Date</label>
                        <input type="date" id="call-date" value="${formattedDate}" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Add Call Log</button>
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
    const form = modalContainer.querySelector('#add-call-log-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addNewCallLog(form);
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

// Add new call log
function addNewCallLog(form) {
    const callLogId = form.querySelector('#call-log-id').value;
    const prisonerId = form.querySelector('#prisoner-id').value;
    const receiverName = form.querySelector('#receiver-name').value;
    const receiverRelation = form.querySelector('#receiver-relation').value;
    const duration = form.querySelector('#call-duration').value;
    const callDate = form.querySelector('#call-date').value;
    
    // Create call log object
    const newCallLog = {
        callLogID: callLogId,
        prisonerID: prisonerId,
        receiver_name: receiverName,
        receiver_relation: receiverRelation || null,
        duration,
        call_date: callDate
    };
    
    // Send data to server
    fetch('/api/call-logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCallLog)
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
            showNotification('Call log added successfully', 'success');
            
            // Refresh call logs data
            fetchAllCallLogs();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to add call log', 'error');
        }
    })
    .catch(err => {
        console.error('Error adding call log:', err);
        showNotification('Failed to add call log. Please try again later.', 'error');
    });
}

// Edit call log
function editCallLog(callLogId) {
    // First, get the call log details
    fetch(`/api/call-logs/${callLogId}`)
        .then(response => response.json())
        .then(callLog => {
            showEditCallLogModal(callLog);
        })
        .catch(err => {
            console.error('Error fetching call log details:', err);
            showNotification('Failed to load call log details.', 'error');
        });
}

// Show edit call log modal
function showEditCallLogModal(callLog) {
    // Close any open modal
    if (currentModal) {
        document.body.removeChild(currentModal);
    }
    
    // Format date for the input field (YYYY-MM-DD)
    const callDate = new Date(callLog.call_date);
    const formattedDate = callDate.toISOString().split('T')[0];
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    // Set modal content
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Edit Call Log</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="edit-call-log-form">
                    <input type="hidden" id="call-log-id" value="${callLog.callLogID}">
                    
                    <div class="form-group">
                        <label for="prisoner-id">Prisoner ID</label>
                        <input type="text" id="prisoner-id" value="${callLog.prisonerID}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="receiver-name">Receiver Name</label>
                        <input type="text" id="receiver-name" value="${callLog.receiver_name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="receiver-relation">Relation to Prisoner</label>
                        <input type="text" id="receiver-relation" value="${callLog.receiver_relation || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="call-duration">Call Duration (minutes)</label>
                        <input type="text" id="call-duration" value="${callLog.duration}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="call-date">Call Date</label>
                        <input type="date" id="call-date" value="${formattedDate}" required>
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
    const form = modalContainer.querySelector('#edit-call-log-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateCallLog(form);
    });
}

// Update call log
function updateCallLog(form) {
    const callLogId = form.querySelector('#call-log-id').value;
    const receiverName = form.querySelector('#receiver-name').value;
    const receiverRelation = form.querySelector('#receiver-relation').value;
    const duration = form.querySelector('#call-duration').value;
    const callDate = form.querySelector('#call-date').value;
    
    // Create updated call log object
    const updatedCallLog = {
        receiver_name: receiverName,
        receiver_relation: receiverRelation || null,
        duration,
        call_date: callDate
    };
    
    // Send data to server
    fetch(`/api/call-logs/${callLogId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedCallLog)
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
            showNotification('Call log updated successfully', 'success');
            
            // Refresh call logs data
            fetchAllCallLogs();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to update call log', 'error');
        }
    })
    .catch(err => {
        console.error('Error updating call log:', err);
        showNotification('Failed to update call log. Please try again later.', 'error');
    });
}

// Confirm delete call log
function confirmDeleteCallLog(callLogId) {
    if (confirm(`Are you sure you want to delete call log with ID ${callLogId}? This action cannot be undone.`)) {
        deleteCallLog(callLogId);
    }
}

// Delete call log
function deleteCallLog(callLogId) {
    fetch(`/api/call-logs/${callLogId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('Call log deleted successfully', 'success');
            
            // Refresh call logs data
            fetchAllCallLogs();
        } else {
            // Show error message
            showNotification(data.message || 'Failed to delete call log', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting call log:', err);
        showNotification('Failed to delete call log. Please try again later.', 'error');
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